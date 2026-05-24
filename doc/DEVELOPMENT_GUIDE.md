# DEVELOPMENT_GUIDE — Workflows, Debugging, and Best Practices

> Practical "how do I work on this app" reference. Pair with `AI_CONTEXT.md` for orientation.

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node | ≥ 22.11.0 (`package.json > engines.node`) |
| Ruby | `.ruby-version` (CocoaPods support) |
| Xcode | Matching RN 0.85.3 toolchain |
| Android Studio | SDK 33+ (RECORD_AUDIO behaviour split at API 33) |
| CocoaPods | for iOS native deps |
| Java | JDK matching your Android Gradle wrapper |

```bash
nvm use 22
gem install bundler
bundle install        # if Gemfile dependencies are needed for CocoaPods
cd ios && bundle exec pod install && cd ..
```

---

## 2. Common Commands

```bash
# Metro
npm start                              # start the JS bundler
npm start -- --reset-cache             # bust Metro cache

# Run
npm run android                        # build + install + run on Android
npm run ios                            # build + install + run on iOS
npm run ios -- --simulator="iPhone 15"

# Lint / Test
npm run lint
npm test
npm test -- --watch
npm test -- src/components/practiceMedia    # scoped jest

# Native housekeeping
cd ios && pod install && cd ..          # after bumping any RN native dep
./scripts/mac-clean.sh                  # ⚠️ DRY-RUN ONLY by default — Mac-wide caches cleaner
./scripts/mac-clean.sh --force          # actually delete
npm run clean                           # alias for ./scripts/mac-clean.sh --force
```

> `npm run clean` runs a **system-wide** Mac cleaner — NOT a project-only clean. Use with intent.

### Useful one-liners

```bash
# Switch environment (1=PROD, 2=UAT, 3=STAGING)
# Edit src/config/Config.ts → const ENVIRONMENT = 3

# Toggle maintenance mode
# Edit src/config/Config.ts → MAINTENANCE_MODE: true

# Re-link iOS pods after a clean
cd ios && rm -rf Pods Podfile.lock && pod install
```

---

## 3. Adding a New Screen

1. Create `src/screens/<Feature>/MyScreen.tsx`.
2. Open `src/navigation/AppNavigator.tsx`:
   - Add the import.
   - Extend `RootStackParamList` with the route name + params type.
   - Add `<Stack.Screen name="MyScreen" component={MyScreen} />`.
3. Navigate to it:
   ```ts
   const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
   navigation.navigate('MyScreen', { /* typed params */ });
   ```

## 4. Adding a New API Endpoint

1. Open `src/config/URLS.ts` and add the key (UPPER_SNAKE_CASE) → relative path.
2. If PTE_CORE needs a different path, add a sibling `pte_core_KEY` or `PTE_CORE_KEY` entry.
3. Call it with `apiClient.get/post(API_ENDPOINTS.KEY, ...)`.
4. (Optional) Document in `API_MAP.md` under the right section.

---

## 5. Adding an Audio Feature

```ts
import { useQuestionMediaFlow } from '../hooks/practiceMedia';

const flow = useQuestionMediaFlow({
  metadata,            // QUESTION_METADATA[id - 1]
  audioUrl,
  isCore: false,
  autoStart: true,
  onAudioFinish: () => {},
  onRecordingFinish: (uri, durSec) => { /* upload */ },
  onError: (msg) => showToast(msg, 'error'),
});

// Render cards by flow.phase. Never call Sound.* directly.
```

If the feature is "the practice question runner", use the global `useRecorder()` context instead so multiple components can react to the same phase.

---

## 6. Adding a Toast / Error UX

```ts
import { useToast } from '../context/ToastContext';
const { showToast } = useToast();
showToast('Recording saved!', 'success');
```

For known-friendly mic errors, surface via `onError` of `useVoiceRecorder` / `useQuestionMediaFlow` — they already route to consistent copy.

For surface-level crashes, prefer `<LocalErrorBoundary>` around the risky subtree rather than letting the root `ErrorBoundary` show.

---

## 7. Debugging

### React Native dev tools
- Shake → "Toggle Inspector" / "Debug JS Remotely" / "Reload".
- `__DEV__` is `true` in debug builds — use for conditional logging or `DevSettings.reload()` (already used by `ErrorBoundary`).

### Logging
- Use `logger.log / info / warn / error` from `src/services/logger.ts`.
- `logger.error(err, 'context-tag')` automatically records to Crashlytics (if linked).

### Network
- Inspect the resolved URL in `src/services/apiClient.ts > request interceptor`. Add a `console.log(config.baseURL, config.url)` temporarily.
- If you suspect variant misrouting, log `isPteCore()` and `getBaseUrl()`.

### Audio
- Add temporary logs in `soundCoordinator.acquire/release` to trace ownership.
- `useVoiceRecorder.onError(_, code)` codes: `permission | start | stop | interrupted | empty`.
- `useAudioPlayer.onPreempt` fires whenever another consumer steals the slot — instrument it if "audio randomly stops".

### Permissions
- Quickest sanity check on Android: `adb shell pm grant <pkg> android.permission.RECORD_AUDIO`.
- On iOS: Reset Settings → Reset Location & Privacy.

### Auth
- Run `await getItem('user_token')` from a debug screen to confirm token persistence.
- If 401 loops, ensure `logoutSuppressed` isn't stuck — `resetLogoutSuppression()` is auto-called 1.5s after `resetToSignIn`.

### Crash reports
- Firebase Crashlytics dashboard.
- Local: enable Flipper or Reactotron in dev — none are wired by default.

---

## 8. Performance Playbook

| Symptom | Fix |
|---|---|
| Screen mount jank | Use the `renderPhase` gating pattern from `PracticeQuestionDetailScreen` (`InteractionManager.runAfterInteractions` + `requestAnimationFrame` + staged `setTimeout`). |
| List scrolling slow | Use `FlatList` (not `ScrollView.map`) + `keyExtractor` + `getItemLayout` if items are fixed-height + `initialNumToRender` / `windowSize`. |
| Re-renders on every audio tick | Subscribe instead: `subscribeToAudioProgress` / `subscribeToTimer` (RecorderContext). |
| Memo'd child still re-rendering | Confirm props are referentially stable. Wrap callbacks in `useCallback`. |
| Layout jitter from keyboard | iOS uses `KeyboardAvoidingView behavior="padding"`; Android relies on `windowSoftInputMode=adjustResize` from the manifest. **Don't add `behavior="height"` on Android** (double-resize bug noted in `App.tsx`). |
| SVG icon flicker | Make sure `react-native-svg-transformer` is the transformer and the SVG is imported as a component, not a URI. |
| Tab bar choppy | The existing tab bar mixes JS and native drivers carefully — keep `useNativeDriver: false` for layout/color anims and `useNativeDriver: true` for opacity-only views. |

---

## 9. Testing

- Jest preset: `@react-native/jest-preset`.
- Setup file: `jest.setup.js`.
- `transformIgnorePatterns` whitelists every RN-ecosystem dep that ships ES modules. **Add new native modules here** when tests fail with `SyntaxError: Unexpected token export`.
- Snapshot testing exists in `__tests__/`; per-component RTL-style tests welcome but rare.

Run a single test:
```bash
npm test -- -t "should mount"
```

---

## 10. Native Tips

### iOS
- `ios/LA/Info.plist` must contain `NSMicrophoneUsageDescription` (audio module requirement).
- After any RN native dep bump: `cd ios && pod install`.
- Hermes is RN-default; confirm via Podfile if you bump RN.

### Android
- `android/app/src/main/AndroidManifest.xml` must include `<uses-permission android:name="android.permission.RECORD_AUDIO"/>`.
- `windowSoftInputMode=adjustResize` is required for the chat-style keyboard handling.
- Notification icon, fonts and other assets live in `android/app/src/main/{res,assets}`.

---

## 11. Coding Conventions

- **TypeScript everywhere.** Public hooks/contexts must export their types.
- **Per-file scale helper:** `const scale = (n) => (screenWidth / 375) * n;`.
- **Use design tokens** from `theme/` — but a lot of screens still inline hex colors. When editing existing screens, match local style; when creating new ones, prefer `theme.colors.*`.
- **Atomic Design folders** are loosely enforced — read `COMPONENT_TREE.md` for guidance.
- **Comments**: explain *why*, not *what*. The biggest screen has long-form comments where behavior is non-obvious — match that bar.
- **Avoid `any`** in new code. The codebase has some legacy `any` (especially around backend payloads) — narrow as you go.
- **No emojis** in source/comments (unless intentionally for UI labels).

### Linting / formatting
- `npm run lint` (ESLint `@react-native/eslint-config`).
- Prettier 2.8.8 is a dependency; run manually as needed.

---

## 12. Release Checklist

1. Set `Config.ENVIRONMENT = 1` (PRODUCTION).
2. Set `Config.MAINTENANCE_MODE = false`.
3. Bump versions:
   - iOS: `ios/LA.xcodeproj` (Marketing Version + Build).
   - Android: `android/app/build.gradle` (`versionName`, `versionCode`).
4. `cd ios && pod install` if any native deps changed.
5. Smoke test: Splash → Onboarding → SignIn/SignUp → Dashboard → Practice (any speaking type) → Mock → Subscription purchase.
6. Run `npm run lint && npm test`.
7. Generate signed builds (`Archive` in Xcode / `:app:bundleRelease` in Gradle).

---

## 13. Useful Files Cheatsheet

| What | Where |
|---|---|
| App root + providers | `App.tsx` |
| Route registry / params types | `src/navigation/AppNavigator.tsx` |
| Tabs + custom tab bar | `src/navigation/DashboardTabNavigator.tsx` |
| Endpoint keys (single source of truth) | `src/config/URLS.ts` |
| Endpoint resolver (Proxy) | `src/config/apiConfig.ts` |
| Variant helpers | `src/config/appVariantConfig.ts` |
| Env switching | `src/config/Config.ts` |
| Question timings | `src/config/subcategoryConfig.ts` |
| Section catalog | `src/config/practiceData.ts` |
| HTTP client | `src/services/apiClient.ts` |
| Global navigation ref | `src/services/navigationService.ts` |
| Audio coordinator | `src/hooks/practiceMedia/soundCoordinator.ts` |
| Audio player / recorder hooks | `src/hooks/practiceMedia/{useAudioPlayer,useVoiceRecorder}.ts` |
| Media state machine | `src/context/RecorderContext.tsx` (= `useQuestionMediaFlow`) |
| Subscription validator | `src/utils/subscriptionValidator.ts` |
| Mic permission helper | `src/utils/PermissionHandler.ts` |
| Toast | `src/context/ToastContext.tsx` |
| Theme | `src/theme/*` |
| Icon library | `src/components/atoms/Icon/index.tsx` |
| Existing deep audio docs | `./audio_module_doc.md` |
| Existing API/config docs | `./api_config_doc.md` |

---

## 14. When You're Unsure

- **Where does this state live?** → `STATE_FLOW.md`.
- **What endpoint should I call?** → `API_MAP.md`.
- **Which file should I edit?** → "Important Files" in `AI_CONTEXT.md` + this Cheatsheet.
- **How does this screen fit?** → `COMPONENT_TREE.md`.
- **How do pieces talk to each other?** → `SYSTEM_DESIGN.md`.
- **Audio is misbehaving** → `./audio_module_doc.md` (deeper) + "Common Issues" in `AI_CONTEXT.md`.

---

## 15. AI Assistant Operating Rules (for future sessions)

1. **Prefer these 6 docs over re-reading the repo.** They reflect the current architecture.
2. When a doc seems stale (file moved, API renamed), update it as part of the task — don't ignore the discrepancy.
3. For targeted questions, read **just the file** named in the docs (don't fan out unnecessarily).
4. When generating new code, follow the existing per-file `scale()` and styles-at-bottom patterns rather than introducing new conventions.
5. If a request touches audio, **always** re-read `STATE_FLOW.md` §3 and `doc/audio_module_doc.md` first — assumptions cause regressions here.
6. Respect `.aiignore` — never index or summarize ignored paths.
