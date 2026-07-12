# Beta distribution — Firebase App Distribution

LA distributes Android beta builds through
[Firebase App Distribution](https://firebase.google.com/products/app-distribution).
No paid Google Play Console account needed for testers.

- Android package: **`com.la`** (from `android/app/build.gradle`
  `applicationId`)
- Firebase project + Android app ID: read at build time from
  `android/app/google-services.json` — nothing to hardcode. If you rotate
  Firebase projects, just replace that file and every path below
  (local + CI) picks up the new app automatically.

> Firebase project setup (creating the Firebase project, registering the
> Android + iOS apps, downloading `google-services.json` /
> `GoogleService-Info.plist`) is covered end-to-end in
> [`docs/push-notifications-setup.md`](docs/push-notifications-setup.md).
> Do that first — this doc assumes `android/app/google-services.json` is
> already in place.

---

## One-time setup

### 1. Sign in to Firebase (once per machine)

```bash
npm run firebase:login
```

A browser window opens — sign in with the Google account that owns
the Firebase project (or that has "App Distribution Admin" access on it).

### 2. Create the `testers` group (once per Firebase project)

1. Open the Firebase console → your LA project → **App Distribution**.
2. Go to the **Testers & Groups** tab.
3. Click **Add group** → name it **`testers`** exactly.
4. Add tester emails (one per line). Each tester gets an invite email
   the first time you ship a build to them.

> The group alias `testers` is referenced by both the `distribute:android`
> npm script and the CI workflow. If you rename the group, update both.

---

## Shipping a new beta build

There are two paths — automated (recommended) and manual.

### Path A — Automated via GitHub Actions (default)

Every push to `main` triggers `.github/workflows/distribute-android.yml`
which:

1. Builds a release APK on GitHub-hosted Ubuntu (uses the debug keystore
   fallback in `android/app/build.gradle` — fine for beta; see "Before
   going to production" below).
2. Extracts the Android app ID from `android/app/google-services.json`
   (or the `FIREBASE_ANDROID_APP_ID` secret as a fallback).
3. Uploads the **universal** APK (LA uses ABI splits, so we ship
   `app-universal-release.apk` — a single APK that installs on every
   architecture, which is what testers need for sideloading).
4. Notifies everyone in the `testers` group by email with release notes
   auto-generated from the latest commit message.

Docs-only, iOS-only, and `.github/**` changes are skipped so you don't
waste CI minutes on non-code updates. You can also trigger a build
manually from the GitHub **Actions** tab (`Run workflow`).

One-time CI setup below adds the two required repo secrets.

### Path B — Manual from your machine

1. (Optional) Update `RELEASE_NOTES.md` at the repo root — write what's
   new for testers. Anything in that file is emailed verbatim. Skip the
   file and the script falls back to the latest git commit message.

2. Run the distribute script:

   ```bash
   npm run distribute:android
   ```

   Under the hood (`scripts/distribute-android.sh`):
   - Reads the Firebase app ID from `android/app/google-services.json`.
   - Runs `./gradlew clean assembleRelease`.
   - Picks the universal APK from `android/app/build/outputs/apk/release/`.
   - Uploads it to Firebase App Distribution and pings the `testers`
     group.

3. Testers install:
   - Open the invite email on their Android phone.
   - Install the **App Tester** app when prompted (one-time).
   - Tap the download button — the APK installs directly.

---

## Configuring GitHub Actions (one-time)

The CI workflow authenticates to Firebase using a **service account
JSON key** and needs `google-services.json` at build time.

### 1. Create the service account

1. Open the Google Cloud Console for your Firebase project:
   `https://console.cloud.google.com/iam-admin/serviceaccounts?project=<YOUR_PROJECT_ID>`
2. Click **Create service account**.
   - Name: `github-actions-app-distribution`
   - ID: leave auto-generated.
   - Description: `Uploads Android betas to Firebase App Distribution from CI`.
3. Click **Create and continue**.
4. Under **Grant this service account access**, add these roles:
   - `Firebase App Distribution Admin`
   - `Firebase Viewer` *(needed for CLI project lookups)*
5. Click **Done**.

### 2. Generate a JSON key

1. Click the newly created service account.
2. Go to the **Keys** tab.
3. **Add key → Create new key → JSON**. A JSON file downloads — treat
   it like a password, never commit it.

### 3. Add the two GitHub secrets

Open the repo secrets page:
<https://github.com/prabhat-barman/LA/settings/secrets/actions>

Add these two secrets:

| Secret name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Paste the **entire contents** of the service account JSON key. |
| `GOOGLE_SERVICES_JSON` | Base64-encoded `android/app/google-services.json`. Generate it with:<br>`base64 -i android/app/google-services.json \| pbcopy` (macOS)<br>The CI decodes this back to the file before building. |

> **Why not commit `google-services.json`?** The Android version is
> technically safe to commit (it only contains public identifiers), but
> keeping it out of the repo mirrors how we treat the iOS
> `GoogleService-Info.plist` and lets a future prod-vs-dev split just
> swap the secret without touching git history.
>
> If you'd rather commit `google-services.json` directly, remove the
> `GOOGLE_SERVICES_JSON` secret — the workflow will use the committed
> file automatically. Alternatively, skip the file entirely and set a
> `FIREBASE_ANDROID_APP_ID` secret with just the app ID string; the
> workflow supports that path too, though you'll lose Firebase plugin
> initialisation in the built APK.

### 4. Verify the `testers` group exists in Firebase

The workflow ships to the `testers` group. Create it once under
**App Distribution → Testers & Groups → Add group**, name it exactly
`testers`, and add tester emails. Without this group the CI step fails
with a 404 at the "distributing to testers/groups" line.

### 5. Trigger the first CI run

Push any commit to `main` (or open the Actions tab and run the workflow
manually). If the secrets and group are set up correctly you should see
the APK appear on the Firebase console within ~5 minutes.

---

## Handy variants

Ship to specific emails without touching the Firebase group:

```bash
APP_ID=$(node -pe "require('./android/app/google-services.json').client[0].client_info.mobilesdk_app_id")
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-universal-release.apk \
  --app "$APP_ID" \
  --testers "friend1@gmail.com,friend2@gmail.com" \
  --release-notes-file RELEASE_NOTES.md
```

Ship an AAB instead of an APK (Play-style bundle — smaller download for
testers, but they need Play-side install; usually the APK is easier for
sideloaded betas):

```bash
cd android && ./gradlew clean bundleRelease && cd ..
APP_ID=$(node -pe "require('./android/app/google-services.json').client[0].client_info.mobilesdk_app_id")
firebase appdistribution:distribute android/app/build/outputs/bundle/release/app-release.aab \
  --app "$APP_ID" \
  --release-notes-file RELEASE_NOTES.md \
  --groups testers
```

Ship a specific ABI split (e.g. arm64 only, ~30% smaller than universal):

```bash
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-arm64-v8a-release.apk \
  --app "$APP_ID" \
  --release-notes-file RELEASE_NOTES.md \
  --groups testers
```

---

## Before going to production

The release build currently reuses the **debug keystore** whenever the
upload keystore properties aren't set (see the `signingConfigs` block in
`android/app/build.gradle`) — this is fine for Firebase App Distribution
betas but **must be replaced before Play Store launch**. Steps:

1. Generate a proper release keystore:

   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore android/app/la-upload-key.keystore \
     -alias la-upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Store the passwords in `~/.gradle/gradle.properties` (never in the
   repo). The four property names are already wired up in
   `android/app/build.gradle`:

   ```
   LA_UPLOAD_STORE_FILE=la-upload-key.keystore
   LA_UPLOAD_KEY_ALIAS=la-upload
   LA_UPLOAD_STORE_PASSWORD=...
   LA_UPLOAD_KEY_PASSWORD=...
   ```

   Once those exist, `./gradlew assembleRelease` automatically signs with
   the upload key instead of the debug key.

3. Extract the release SHA-1 for Google-cloud-side OAuth configs:

   ```bash
   keytool -list -v -alias la-upload -keystore android/app/la-upload-key.keystore
   ```

4. Register that SHA-1 in the Google Cloud Console (under the same
   OAuth client that the debug SHA-1 was registered on) so Google
   Sign-In keeps working in the release build.

5. For CI, either check the release keystore into a secure store (e.g.
   1Password) and add it as a base64 secret alongside the passwords, or
   move release builds to a self-hosted runner with the keystore
   pre-installed.
