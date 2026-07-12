#!/usr/bin/env bash
# ============================================================================
# Distribute Android beta to Firebase App Distribution (local, from your Mac)
# ----------------------------------------------------------------------------
# Mirrors what .github/workflows/distribute-android.yml does on CI, so a
# tester build is one command whether you're on your laptop or on GitHub:
#
#   npm run distribute:android
#
# Behavior:
#   1. Verifies google-services.json is in place, extracts the Android app
#      ID from it (single source of truth — no hardcoded IDs to drift).
#   2. Builds a release APK with Gradle. LA uses ABI splits with a
#      universal APK, so we ship the universal one to testers.
#   3. Uploads the APK to Firebase App Distribution and pings the
#      `testers` group. Release notes come from RELEASE_NOTES.md if
#      present, otherwise from the latest git commit message.
#
# Prerequisites (one-time — see DISTRIBUTION.md for the full walkthrough):
#   - `npm run firebase:login` (or `firebase login`)
#   - android/app/google-services.json in the working tree
#   - The `testers` group exists in Firebase App Distribution
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

GOOGLE_SERVICES="android/app/google-services.json"
if [ ! -f "$GOOGLE_SERVICES" ]; then
  cat >&2 <<EOF
error: $GOOGLE_SERVICES not found.

Download it from the Firebase console (Project settings → Your apps →
Android app → google-services.json) and drop it at that path. Details in
DISTRIBUTION.md.
EOF
  exit 1
fi

APP_ID=$(node -pe "require('./$GOOGLE_SERVICES').client[0].client_info.mobilesdk_app_id")
if [ -z "$APP_ID" ] || [ "$APP_ID" = "undefined" ]; then
  echo "error: could not read mobilesdk_app_id from $GOOGLE_SERVICES." >&2
  exit 1
fi
echo "Firebase app ID: $APP_ID"

# Release notes: prefer a curated RELEASE_NOTES.md so testers see something
# hand-written, fall back to the latest commit so we never ship a blank
# email even if we forgot to update the file.
NOTES_ARGS=()
if [ -f RELEASE_NOTES.md ]; then
  echo "Using RELEASE_NOTES.md for release notes."
  NOTES_ARGS=(--release-notes-file RELEASE_NOTES.md)
else
  TMP_NOTES=$(mktemp)
  trap 'rm -f "$TMP_NOTES"' EXIT
  {
    echo "LA — beta build"
    echo ""
    echo "Latest commit:"
    git log -1 --pretty=format:"  %h %s%n%n%b"
  } > "$TMP_NOTES"
  echo "No RELEASE_NOTES.md — generated from the latest git commit."
  NOTES_ARGS=(--release-notes-file "$TMP_NOTES")
fi

echo ""
echo "==> Building release APK ..."
( cd android && ./gradlew clean assembleRelease )

# Match the CI logic: prefer the universal APK produced by the ABI split
# config, fall back to app-release.apk for setups that disable splits.
APK=""
for candidate in \
  android/app/build/outputs/apk/release/app-universal-release.apk \
  android/app/build/outputs/apk/release/app-release.apk; do
  if [ -f "$candidate" ]; then
    APK="$candidate"
    break
  fi
done
if [ -z "$APK" ]; then
  echo "error: no release APK produced under android/app/build/outputs/apk/release/." >&2
  ls -la android/app/build/outputs/apk/release/ >&2 || true
  exit 1
fi
echo "Built: $APK ($(du -h "$APK" | cut -f1))"

echo ""
echo "==> Uploading to Firebase App Distribution (group: testers) ..."
npx --yes firebase-tools appdistribution:distribute \
  "$APK" \
  --app "$APP_ID" \
  "${NOTES_ARGS[@]}" \
  --groups testers

echo ""
echo "Done. Testers in the 'testers' group will receive an email shortly."
