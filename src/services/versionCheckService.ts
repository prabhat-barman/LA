import axios from 'axios';
import { Alert, Linking, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { logger } from './logger';

// Bundle ids — the iTunes Lookup API expects the App Store numeric
// id; the Play Store URL needs the Java-style package name. Keep
// these in lockstep with `ios/LA/Info.plist` (CFBundleIdentifier) and
// `android/app/build.gradle` (applicationId) — if you ever change the
// app's identifier, update both constants AND publish a new build
// before turning on the version check, otherwise existing users will
// be stuck at the modal pointing them at the wrong store page.
const APP_STORE_ID = '6443614190';
const ANDROID_PACKAGE_NAME = 'com.languageacademy';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion?: string;
  currentVersion?: string;
  // True when the update is required to keep using the app (major /
  // minor bump). False for patch-level updates where we let the user
  // dismiss the modal.
  forceUpdate?: boolean;
  message?: string;
  releaseNotes?: string;
  error?: string;
}

// Semver-ish comparator. Returns 1 if v1 > v2, -1 if v1 < v2, 0 if
// equal. Non-numeric tails ("2.0.4-beta") are ignored — we compare on
// the parsed numeric parts only, which is fine for store metadata
// (the stores normalise build identifiers out of the displayed
// version string).
const compareVersions = (v1: string, v2: string): number => {
  const a = v1.split('.').map(n => Number.parseInt(n, 10) || 0);
  const b = v2.split('.').map(n => Number.parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const p1 = a[i] ?? 0;
    const p2 = b[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

// Update-severity policy. Major/minor bumps are required (we usually
// ship breaking API contract changes there); patch bumps are
// optional. Tweak if marketing / release management wants a softer
// curve.
const shouldForceUpdate = (current: string, latest: string): boolean => {
  const c = current.split('.').map(n => Number.parseInt(n, 10) || 0);
  const l = latest.split('.').map(n => Number.parseInt(n, 10) || 0);
  const cMajor = c[0] ?? 0;
  const cMinor = c[1] ?? 0;
  const lMajor = l[0] ?? 0;
  const lMinor = l[1] ?? 0;
  if (lMajor > cMajor) return true;
  if (lMajor === cMajor && lMinor > cMinor) return true;
  return false;
};

// Apple's public iTunes Lookup API. Returns the latest published
// version string + the release notes the developer set in App Store
// Connect. 10s timeout because the request happens at app launch and
// we don't want to delay the splash screen if Apple's CDN is slow.
const getIOSLatestVersion = async (): Promise<{
  version: string;
  releaseNotes: string;
} | null> => {
  try {
    const res = await axios.get(
      `https://itunes.apple.com/lookup?id=${APP_STORE_ID}`,
      { timeout: 10000 },
    );
    const result = res.data?.results?.[0];
    if (!result?.version) return null;
    return {
      version: String(result.version),
      releaseNotes: String(result.releaseNotes ?? ''),
    };
  } catch (err) {
    logger.error('[versionCheck] iTunes lookup failed', err);
    return null;
  }
};

// Play Store has no public version API, so we scrape the listing
// page. The regex `[["x.y.z"]]` matches Google's serialised data
// blob; we fall back to a looser "Current Version" text match in
// case Google reshuffles the markup. Both patterns are best-effort —
// if neither matches we log and bail out gracefully (no update
// prompt) rather than asserting.
const getAndroidLatestVersion = async (): Promise<{
  version: string;
  releaseNotes: string;
} | null> => {
  try {
    const res = await axios.get(
      `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&hl=en`,
      { timeout: 10000 },
    );
    const html: string = res.data;
    const primary = html.match(/\[\[\\?"([0-9.]+)\\?"\]\]/);
    if (primary?.[1]) {
      return { version: primary[1], releaseNotes: '' };
    }
    const alt = html.match(/Current Version[\s\S]*?([0-9]+\.[0-9]+\.[0-9]+)/);
    if (alt?.[1]) {
      return { version: alt[1], releaseNotes: '' };
    }
    logger.warn('[versionCheck] Play Store HTML did not match either pattern');
    return null;
  } catch (err) {
    logger.error('[versionCheck] Play Store scrape failed', err);
    return null;
  }
};

// Public entrypoint. Returns a uniform result object the hook /
// modal can render. Never throws — any unexpected failure (no
// network, scraping regex broke, API down) ends in
// `{ updateAvailable: false, error }` so the app stays usable.
export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  try {
    const currentVersion = DeviceInfo.getVersion();
    const store = await (Platform.OS === 'ios'
      ? getIOSLatestVersion()
      : getAndroidLatestVersion());
    if (!store?.version) {
      return {
        updateAvailable: false,
        currentVersion,
        error: 'Could not fetch store version',
      };
    }
    const latestVersion = store.version;
    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return { updateAvailable: false, currentVersion, latestVersion };
    }
    const forceUpdate = shouldForceUpdate(currentVersion, latestVersion);
    return {
      updateAvailable: true,
      currentVersion,
      latestVersion,
      forceUpdate,
      message: forceUpdate
        ? `A critical update (v${latestVersion}) is required to continue using the app.`
        : `Version ${latestVersion} is available. You can update now or later.`,
      releaseNotes: store.releaseNotes,
    };
  } catch (err) {
    logger.error('[versionCheck] check failed', err);
    return {
      updateAvailable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

// Deep-link into the right store. We try `canOpenURL` first so a
// failing intent surfaces as an alert rather than a silent no-op —
// otherwise users keep tapping "Update" with nothing happening.
export const openStore = (): void => {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  Linking.canOpenURL(url)
    .then(supported => {
      if (supported) return Linking.openURL(url);
      Alert.alert('Update', 'Unable to open the store on this device.');
      return undefined;
    })
    .catch(err => {
      logger.error('[versionCheck] openStore failed', err);
      Alert.alert('Update', 'Unable to open the store on this device.');
    });
};

// Re-exported for tests + the hook (avoids re-importing
// `compareVersions` from elsewhere).
export const __testing__ = { compareVersions, shouldForceUpdate };
