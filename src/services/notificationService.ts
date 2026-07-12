import notifee, {
  AndroidImportance,
  type AuthorizationStatus,
  type Notification,
} from '@notifee/react-native';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../config/apiConfig';
import apiClient from './apiClient';
import { logger } from './logger';

// AsyncStorage key for the last FCM token we shipped to the backend.
// Used to skip a network roundtrip on every cold start when the
// token hasn't changed.
const LAST_TOKEN_KEY = 'fcm:last_pushed_token';
// AsyncStorage key that records whether we've already asked the user
// for notification permission. We respect a previous denial — re-
// prompting on every launch is hostile.
const PROMPTED_KEY = 'notif:prompted_v1';

// Android channel id for "general" notifications. Keep stable;
// renaming this would create a new channel and orphan the old
// preferences users may have customised.
const ANDROID_CHANNEL_ID = 'la-default';

// True when the host platform has Google Play Services / a Firebase
// app available. iOS simulators do not deliver real notifications;
// Android emulators without GMS will fail silently.
let isInitialised = false;

// Probe whether Firebase has a native `[DEFAULT]` app available.
// On a fresh install without `GoogleService-Info.plist` /
// `google-services.json`, calling `messaging()` throws synchronously
// — we treat that as "Firebase not wired" and disable the whole
// service for the rest of the process lifetime.
const hasFirebaseApp = (): boolean => {
  try {
    messaging();
    return true;
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    if (msg.includes('No Firebase App')) {
      logger.info('[notif] Firebase not configured natively, skipping init');
      return false;
    }
    // Unknown error — log and bail so we don't crash the splash.
    logger.warn('[notif] Firebase probe failed', err);
    return false;
  }
};

// Idempotent — safe to call from anywhere (Splash boot path,
// post-login session restore, app-state change). All subsequent
// calls become no-ops because we cache the `isInitialised` flag.
//
// What this does:
//   1. Creates the default Android notification channel.
//   2. Requests notification permission (iOS + Android 13+) the
//      first time only.
//   3. Fetches the FCM token, pushes it to the backend if it has
//      changed since the last successful upload.
//   4. Wires foreground / background message handlers that pipe
//      notifications through `notifee` so they're actually shown
//      while the app is in the foreground.
//
// Caller is responsible for calling this after the user has signed
// in (the device-token endpoint expects an authenticated request).
export const initializeNotifications = async (): Promise<void> => {
  if (isInitialised) return;
  if (!hasFirebaseApp()) {
    // Pretend init succeeded so we don't try again on every dashboard
    // re-mount. Native config is required to recover — re-run after
    // dropping the plist / google-services.json into the app.
    isInitialised = true;
    return;
  }
  isInitialised = true;
  try {
    await ensureAndroidChannel();
    const granted = await requestPermissionIfNeeded();
    if (!granted) {
      logger.info('[notif] permission denied — skipping token sync');
      return;
    }
    await syncFcmTokenWithBackend();
    wireMessageHandlers();
  } catch (err) {
    // Initialisation should NEVER throw out — losing notifications
    // is annoying, crashing the splash screen is worse.
    isInitialised = false; // allow retry
    logger.warn('[notif] initialise failed', err);
  }
};

// Ensure the default Android channel exists. iOS does not have
// channels — `notifee.createChannel` is a no-op there. We tag the
// channel with `HIGH` importance so notifications surface as
// heads-up displays.
const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'General notifications',
    importance: AndroidImportance.HIGH,
  });
};

// Returns true if permission was granted (either now or in a prior
// session). False otherwise. We persist the "prompted" flag so
// users who declined the system prompt don't get re-asked on every
// launch.
const requestPermissionIfNeeded = async (): Promise<boolean> => {
  const current = await messaging().hasPermission();
  if (
    current === messaging.AuthorizationStatus.AUTHORIZED ||
    current === messaging.AuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const alreadyPrompted = await AsyncStorage.getItem(PROMPTED_KEY);
  if (alreadyPrompted === '1') return false;
  await AsyncStorage.setItem(PROMPTED_KEY, '1');

  const result = await messaging().requestPermission();
  const granted: AuthorizationStatus =
    result as unknown as AuthorizationStatus;
  return (
    granted === messaging.AuthorizationStatus.AUTHORIZED ||
    granted === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Pulls the current FCM token, compares against the last value we
// shipped to the backend, and POSTs the diff if any. Backend
// endpoint is the legacy `deviceToken/user` documented in URLS.ts.
//
// We swallow upload failures — losing a token sync just means the
// next launch will retry; crashing the boot path is much worse.
const syncFcmTokenWithBackend = async (): Promise<void> => {
  const token = await messaging().getToken();
  if (!token) return;
  const lastToken = await AsyncStorage.getItem(LAST_TOKEN_KEY);
  if (lastToken === token) return;
  try {
    const fd = new FormData();
    fd.append('device_token', token);
    fd.append('platform', Platform.OS);
    await apiClient.post(API_ENDPOINTS.DEVICE_TOKEN_USER, fd);
    await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
    logger.info('[notif] device token synced');
  } catch (err) {
    logger.warn('[notif] device token upload failed', err);
  }
  // Also subscribe to token refresh — when the OS rotates the
  // token, Firebase fires this listener with the new value.
  messaging().onTokenRefresh(async newToken => {
    try {
      const fd = new FormData();
      fd.append('device_token', newToken);
      fd.append('platform', Platform.OS);
      await apiClient.post(API_ENDPOINTS.DEVICE_TOKEN_USER, fd);
      await AsyncStorage.setItem(LAST_TOKEN_KEY, newToken);
    } catch (err) {
      logger.warn('[notif] refresh token upload failed', err);
    }
  });
};

// Wires the three handlers Firebase exposes:
//   - foreground (onMessage)            — app is open, fire notifee
//                                         so the OS still surfaces a
//                                         notification banner
//   - background (setBackgroundMessageHandler) — app is in the
//                                         background, OS shows the
//                                         notification, this hook
//                                         lets us do data-only work
//   - openedApp (onNotificationOpenedApp + getInitialNotification)
//                                       — user tapped a notification
//                                         to open the app
const wireMessageHandlers = (): void => {
  // Foreground messages don't auto-display anywhere — we have to
  // surface them via notifee so the user sees them while the app
  // is open.
  messaging().onMessage(async remote => {
    await displayRemote(remote);
  });

  // Background (app is in background/quit). The OS shows the
  // notification automatically when the payload has a `notification`
  // key — this handler is mainly here for data-only payloads.
  messaging().setBackgroundMessageHandler(async _remote => {
    // Reserved for future analytics / silent state syncs. Leaving
    // empty is intentional — the OS already renders the
    // notification for us.
  });
};

const displayRemote = async (
  remote: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> => {
  const title = remote.notification?.title ?? remote.data?.title ?? 'Update';
  const body =
    remote.notification?.body ??
    remote.data?.body ??
    'You have a new notification.';
  const notif: Notification = {
    title: String(title),
    body: String(body),
    android: {
      channelId: ANDROID_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
    data: remote.data as { [key: string]: string } | undefined,
  };
  try {
    await notifee.displayNotification(notif);
  } catch (err) {
    logger.warn('[notif] displayNotification failed', err);
  }
};
