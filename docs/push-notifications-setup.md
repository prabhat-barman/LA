# Push notifications + Firebase Analytics — native setup

The JavaScript side of push notifications is already wired up. To make
the notifications actually deliver and to make analytics events reach
Firebase, you need to perform the steps below in your native projects
**once**.

This is one-time setup — once the native configs are in place,
everything else (FCM token sync, foreground display, analytics
events) works automatically via the JS code already in this branch.

---

## 1. Firebase Console

Make sure you have a Firebase project that contains both your iOS
and Android apps:

- iOS bundle id: `com.languageacademy` (same as your `CFBundleIdentifier`)
- Android package: `com.languageacademy` (same as `applicationId` in `android/app/build.gradle`)

Enable in the Firebase Console:

- Cloud Messaging (for push notifications)
- Analytics (for the event pipeline)

---

## 2. iOS — `GoogleService-Info.plist`

1. Download `GoogleService-Info.plist` from the Firebase Console (iOS
   app → "Add config file").
2. Open the workspace in Xcode (`open ios/LA.xcworkspace`).
3. Drag the file into the `LA` target. Make sure "Copy items if
   needed" is ON and the target is checked.
4. In the **Signing & Capabilities** tab for the LA target, add:
   - **Push Notifications**
   - **Background Modes** → check `Remote notifications`

5. In **App Store Connect**:
   - Create an APNs auth key (Keys → All → +). Note the Key ID +
     Team ID.
   - Upload it under Firebase Console → Project Settings → Cloud
     Messaging → APNs Authentication Key.

6. Run:
   ```bash
   cd ios && pod install && cd ..
   ```

---

## 3. Android — `google-services.json`

1. Download `google-services.json` from the Firebase Console (Android
   app → "Add config file").
2. Drop it into `android/app/google-services.json` (same level as
   `build.gradle`).

3. In `android/build.gradle` make sure the buildscript classpath has
   the Google services plugin:
   ```gradle
   buildscript {
     dependencies {
       classpath 'com.google.gms:google-services:4.4.2'
     }
   }
   ```

4. In `android/app/build.gradle` add at the very bottom of the file:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

5. Drop a `ic_notification.png` (white-on-transparent monochrome,
   24x24dp) into each `android/app/src/main/res/drawable-*dpi/`
   directory. The notification service references this drawable by
   name (`smallIcon: 'ic_notification'`). If you skip this, Android
   13+ will fall back to a generic bell icon.

---

## 4. Verify

- Run the app on a real device (notifications do **not** deliver to
  iOS Simulator and Android Emulators without GMS).
- Watch the JS log for `[notif] device token synced`. That means
  the FCM token is in the backend and you can send pushes to it.
- Send a test push from Firebase Console → Cloud Messaging → "Send
  test message" → paste the FCM token.

---

## What the JS layer already does

(Lives in `src/services/notificationService.ts` and `src/services/analytics.ts`)

- Creates the Android default notification channel (`la-default`)
  on first launch.
- Requests notification permission once and persists the prompt
  flag so we don't re-ask on every launch.
- Pulls the FCM token, ships it to `deviceToken/user`, and
  resubmits on token rotation.
- Pipes foreground notifications through `notifee` so they actually
  display while the app is open.
- Sets up the background message handler (data-only payload
  scaffold — extend in `notificationService.ts` if you start
  sending silent pushes for state sync).
- Centralises analytics event names in `AnalyticsEvents` and
  exposes `trackScreen` / `trackEvent` helpers.

Initialisation runs from the Dashboard mount (post-auth) so the
device-token POST always has a valid session.
