# AI_CONTEXT — Project Memory (Primary Reference)

> **Use this file first.** It is the canonical AI memory for the LA codebase. Only read additional files when a task needs deeper detail than what is summarized here.

---

## 1. Quick Context Summary

| Field | Value |
|---|---|
| Name | LA (Language Academy) |
| Type | React Native mobile app (iOS + Android) |
| Domain | PTE / PTE Core exam preparation |
| RN Version | `0.85.3` (New Architecture compatible) |
| React | `19.2.3` |
| Language | TypeScript (strict-ish, `@react-native/typescript-config`) |
| Bundler | Metro + `react-native-svg-transformer` |
| Navigation | `@react-navigation/native-stack` + `bottom-tabs` (v7) |
| State | React Context only (no Redux/Zustand/Jotai) |
| Networking | `axios` singleton (`src/services/apiClient.ts`) |
| Persistence | `@react-native-async-storage/async-storage` via `secureStorage.ts` (in-memory fallback) |
| Auth | Email/password + Google (`@react-native-google-signin`) + Apple (`@invertase/react-native-apple-authentication`) |
| Crash reporting | Firebase Crashlytics via `services/logger.ts` (lazy-loaded, safe if unlinked) |
| Audio | `react-native-nitro-sound` (singleton) wrapped by ownership coordinator → 2 hooks → orchestrator → context |
| Video | `react-native-video` (attempt playback), `react-native-youtube-iframe` (PTE strategy videos) |
| IAP | `react-native-iap` (Gold / Silver, 1/2/3-month SKUs, PTE Core suffix variant) |
| Splash | `react-native-bootsplash` |
| Permissions | `react-native-permissions` + `PermissionsAndroid` via `utils/PermissionHandler.ts` |
| Theme | Bricolage Grotesque font family + central `theme/` module |
| Backend Variants | `ACADEMY` (default) vs `PTE_CORE` — different base URLs + endpoint prefixes |
| Environments | 1=PROD, 2=UAT, 3=STAGING (set in `src/config/Config.ts`; currently `3`) |

**Entry chain:** `index.js` → `App.tsx` → providers (Toast → User → DashboardData → Recorder) → `AppNavigator` → `Splash` → either `Onboarding` or `Dashboard` tabs.

**Biggest file (3.7k LOC):** `src/screens/Practice/PracticeQuestionDetailScreen.tsx` — the central question-runner.

---

## 2. How to Work on This Project Efficiently

1. **Always pre-check `STATE_FLOW.md`** before touching any audio/recording/playback feature. The native singleton is fragile; bypass it and you'll get phantom playbacks.
2. **Never hit endpoints directly** — go through `API_ENDPOINTS[KEY]` (proxy in `src/config/apiConfig.ts`) so the ACADEMY vs PTE_CORE variant is resolved automatically.
3. **Never construct base URLs** — use `getBaseUrl()` / `getPdfPath()` from `src/config/appVariantConfig.ts`.
4. **Never call `Sound.*` directly** — use `useAudioPlayer`, `useVoiceRecorder`, `useQuestionMediaFlow`, or the `RecorderContext`. See `doc/audio_module_doc.md`.
5. **Tokens & user data** live under fixed AsyncStorage keys (see § 7). Update them via `UserContext`, not directly.
6. **Auth-aware fetches** — `apiClient` attaches `Bearer` automatically. Do NOT add manual `Authorization` headers.
7. **For new screens**: register in `RootStackParamList` (`AppNavigator.tsx`) AND add `<Stack.Screen>`. Type params with the union.
8. **Navigation from non-React code** uses `navigationRef` in `src/services/navigationService.ts`.
9. **Theming**: import `colors` from `src/theme/colors.ts`; fonts from `src/theme/fonts.ts` (`BricolageGrotesque-*`).
10. **Scaling helper pattern**: `const scale = (n) => (screenWidth / 375) * n;` — replicated per-file (no shared util). Don't introduce a new convention.
11. **Atomic Design** is loosely followed (`atoms` / `molecules` / `organisms` / `templates` / `practiceMedia`). Place new components accordingly.
12. **Run `npm run lint` before committing.** No Prettier on save; project uses Prettier 2.8.8 manually.

---

## 3. Folder Map (high signal only)

```
LA/
├─ App.tsx                          Provider stack + bootsplash hide
├─ index.js                         AppRegistry registration
├─ src/
│  ├─ navigation/
│  │  ├─ AppNavigator.tsx           Root Stack + RootStackParamList (single source of truth for routes)
│  │  └─ DashboardTabNavigator.tsx  Custom animated bottom tab bar (5 tabs)
│  ├─ context/                      React Context providers (the entire app state layer)
│  │  ├─ UserContext.tsx            User profile CRUD + cache
│  │  ├─ DashboardDataContext.tsx   Dashboard fetch + timezone sync + FCM register + sub cache
│  │  ├─ RecorderContext.tsx        Global media-flow state machine (audio + recording)
│  │  └─ ToastContext.tsx           Global toast queue (top-of-screen animated banner)
│  ├─ services/
│  │  ├─ apiClient.ts               Axios singleton + 401 handling + dynamic baseURL
│  │  ├─ apiBuilder.ts              URL resolution with PTE_CORE_ key fallback
│  │  ├─ socialAuthService.ts       Google + Apple sign-in flows → backend exchange
│  │  ├─ navigationService.ts       Global navigationRef + resetToSignIn()
│  │  └─ logger.ts                  Crashlytics-safe logger
│  ├─ config/
│  │  ├─ Config.ts                  ENVIRONMENT (1/2/3) + Google client IDs + media URLs
│  │  ├─ URLS.ts                    All endpoint keys (kebab/camel mix; keep stable!)
│  │  ├─ apiConfig.ts               Proxy → buildUrl(key) (THE export to import)
│  │  ├─ appVariantConfig.ts        ACADEMY vs PTE_CORE switching helpers
│  │  ├─ subcategoryConfig.ts       QUESTION_METADATA (timings per question type)
│  │  └─ practiceData.ts            Static sections, speeds, locked IDs
│  ├─ hooks/
│  │  ├─ useIap.ts                  Full IAP lifecycle: init, fetch, buy, verify, restore
│  │  ├─ useSubscriptionPackages.ts Package listing from backend
│  │  └─ practiceMedia/
│  │     ├─ soundCoordinator.ts     Single-owner gate over native Sound singleton
│  │     ├─ useAudioPlayer.ts       Playback hook
│  │     ├─ useVoiceRecorder.ts     Recording hook (perm + amplitude + lifecycle)
│  │     └─ useQuestionMediaFlow.ts Orchestrator state machine
│  ├─ utils/
│  │  ├─ secureStorage.ts           AsyncStorage wrapper w/ memory fallback
│  │  ├─ PermissionHandler.ts       Mic permission flow (Android+iOS) + useAudioPermissions
│  │  ├─ subscriptionValidator.ts   Access check: practice/mock/video/vip
│  │  ├─ subscriptionMapping.ts     Backend sub → tier mapping
│  │  ├─ subscriptionHelpers.tsx    UI helpers for sub gating
│  │  ├─ tagColorStore.ts           In-memory bookmark/tag store w/ pub-sub
│  │  ├─ validation.ts              Form validators
│  │  └─ logger.ts                  (Re-export shim)
│  ├─ theme/
│  │  ├─ colors.ts                  Brand palette
│  │  ├─ fonts.ts                   Bricolage Grotesque + typography presets
│  │  ├─ spacing.ts
│  │  └─ index.ts                   `theme = { colors, spacing, fonts, typography }`
│  ├─ components/
│  │  ├─ atoms/                     Button, Icon (1.3k LOC SVG set), Skeleton.*, CircularProgressBar
│  │  ├─ molecules/                 DatePickerModal, PasswordChecklist, SubHeader
│  │  ├─ organisms/                 Header, ErrorBoundary, LocalErrorBoundary
│  │  ├─ templates/                 AuthTemplate (auth screen layout)
│  │  └─ practiceMedia/             Recording/playback/timer/waveform cards (shared mediaStyles)
│  ├─ screens/                      Feature-grouped. See COMPONENT_TREE.md
│  ├─ modules/audio/                Standalone audio module demo (AudioModuleScreen)
│  ├─ assets/                       images/, fonts, scale/, imageUrl.ts
│  └─ types/svg.d.ts                SVG-as-component types for the svg-transformer
└─ doc/                             audio_module_doc.md, api_config_doc.md, PROJECT_INDEX.md
```

---

## 4. App Variants (ACADEMY vs PTE_CORE)

| Concern | Source of truth |
|---|---|
| Current variant | `getCurrentVariant()` in `src/config/appVariantConfig.ts` (reads from injected `store` → defaults to `ACADEMY` — store injection is currently unused, so effectively always ACADEMY today). |
| Base URL | `getBaseUrl()` → `Config.BASE_URL` or `Config.PTE_CORE_BASE_URL` |
| Endpoint resolution | `resolvePath(key)` in `apiBuilder.ts` tries `pte_core_<key>` / `PTE_CORE_<key>` first, then falls back to plain `<key>` |
| IAP SKUs | `buildSkus()` in `useIap.ts` appends `_core` suffix on Android only |
| Prep timing override | `pteCoreWaitTimeBeforeRecording` field in `subcategoryConfig.ts` |

> **Note:** `injectStore()` is wired but no Redux store is shipped — variant is effectively `ACADEMY`. If multi-variant support is needed, hook a store / context into `injectStore()`.

---

## 5. Navigation Map

**Root Stack** (`AppNavigator.tsx`, `initialRouteName="Splash"`):
`Splash → Onboarding/SignIn/SignUp/OTP/NewPassword/ForgotPassword → Dashboard (tab navigator) → {Profile, PersonalInfo, EditProfile, ChangePassword, Subscription, NotificationSettings, ContactSupport, LegalSupport, TermsConditions, PrivacyPolicy, RefundPolicy, FAQ, NotificationsList, PracticeCommonList, PracticeQuestionDetail, PdfList, MicrophoneSetup, LiveSessions, AudioModuleDemo, MonthlyPrediction, DailyFeedback, DailyFeedbackDetail}`

**Dashboard Tabs** (`DashboardTabNavigator.tsx`): `Home | Practice | Mock | Videos | Menu` — custom animated pill tab bar (`#0D112B` bg, `#94C23C` active fill).

**Maintenance**: if `Config.MAINTENANCE_MODE === true`, `AppNavigator` short-circuits to `MaintenanceScreen` (no NavigationContainer mounted).

---

## 6. State Layer (React Context only)

| Context | File | Purpose |
|---|---|---|
| `ToastProvider` | `context/ToastContext.tsx` | `useToast().showToast(msg, type)` — animated top banner, 3s auto-dismiss |
| `UserProvider` | `context/UserContext.tsx` | `user, loading, loadUser, refreshUser, updateUser, updateExamDate, clearUser` |
| `DashboardDataProvider` | `context/DashboardDataContext.tsx` | `dashboardData, loading, refreshing, hasNotifications, loadDashboardData` + silent timezone/FCM/sub sync |
| `RecorderProvider` | `context/RecorderContext.tsx` | Question media state machine (`idle → audio_wait → audio_playing → audio_done | prep_countdown → recording → review`) |

**Provider order in `App.tsx`** (top→bottom): `SafeAreaProvider > ErrorBoundary > ToastProvider > UserProvider > DashboardDataProvider > RecorderProvider > KeyboardAvoidingView > AppNavigator`.

> Keep this order. `DashboardDataProvider` depends on `ToastContext`; `RecorderProvider` must wrap practice screens.

---

## 7. AsyncStorage Keys (do not rename casually)

| Key | Owner | Purpose |
|---|---|---|
| `user_token` | apiClient, splash, social auth | Bearer JWT |
| `user_data` | UserContext, social auth, dashboard | Cached user profile JSON |
| `dashboard_data_cache` | DashboardDataContext | Last successful dashboard payload (offline fallback) |
| `timezone_synced` | DashboardDataContext | `'true'` once timezone synced once |
| `device_token_registered` | DashboardDataContext | `'true'` once FCM token sent |
| `fcm_device_token` | (set by FCM glue — not in JS yet) | Raw FCM token |
| `active_subscription` | useIap | Local IAP subscription cache |
| `backend_active_subscription` | DashboardDataContext + subscriptionValidator | Backend-issued subs (tutor/web payments) |

Always go through `utils/secureStorage.ts` (`getItem`, `setItem`, `removeItem`, `clear`) — it has an in-memory fallback if AsyncStorage native module fails.

---

## 8. Auth Flow (end-to-end)

1. App boots → `Splash` reads `user_token`.
2. Token present → `replace('Dashboard')`. No token → `replace('Onboarding')`.
3. Login/Signup screens call `apiClient.post(API_ENDPOINTS.SIGN_IN | SIGN_UP)` → store `user_token` + `user_data`.
4. Social login: `signInWithGoogle()` / `signInWithApple()` → backend exchange → store token.
5. Every request → `apiClient` interceptor attaches `Bearer ${user_token}`.
6. 401 with Bearer header → `handleSessionExpired()` clears all keys → `resetToSignIn()` via `navigationRef`.
7. Manual logout: call `startManualLogout()` to suppress further requests, then clear keys, then `resetLogoutSuppression()` after redirect.

---

## 9. Audio Module (most fragile part — read carefully)

See `doc/audio_module_doc.md` for full reference. Quick rules:

- **One owner at a time.** The native `Sound` singleton is gated by `soundCoordinator` (`acquire/release/isOwner`).
- **Three layers**: `soundCoordinator` ← `useAudioPlayer` / `useVoiceRecorder` ← `useQuestionMediaFlow` ← screens.
- **`RecorderContext`** is essentially `useQuestionMediaFlow` lifted into a global provider so multiple components on the same screen can read the same phase without rebuilding state.
- **Phases**: `idle | audio_wait | audio_playing | audio_done | prep_countdown | recording | review`.
- **Question metadata** (timings) lives in `src/config/subcategoryConfig.ts` (`QUESTION_METADATA[]`). `pteCoreWaitTimeBeforeRecording` overrides prep time for PTE Core.
- **Permissions** flow through `utils/PermissionHandler.ts`.
- **Replay vs Restart**: `replayAudio()` keeps recorded answer; `start()` re-enters from the top (clears recording).

---

## 10. Common Issues & Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| UI stuck in "Recording" after stop | Direct `Sound.stopRecorder()` call bypassing the hook | Always use `recorder.stop()` / `flow.stopRecording()` / context `stopRecording()` |
| Two audios playing simultaneously | Bypass of `soundCoordinator` | Only consume audio via `useAudioPlayer` |
| Android records but `onFinish` says empty | Missing `file://` prefix on Android — handled in `isRecordingNonEmpty` via `toFileUri()`. Verify both still in place. |
| Auto-logout on legit 401 (e.g. wrong password) | Interceptor only logs out if **request carried Bearer**. Confirm login request didn't accidentally include it. |
| Dashboard blank after login | `loadDashboardData` exits early if `user_token` missing. Verify token persisted before navigating to Dashboard. |
| Phantom 401 loop | `logoutSuppressed` flag stuck; call `resetLogoutSuppression()` post-redirect (built-in 1.5s cool-down). |
| `Sound` listeners leaking | Old code held `Sound.add*Listener` outside hook. Always clean up in hook return. |
| IAP returns empty list | `isPteCore()` may have appended `_core` suffix that doesn't exist in store. Confirm SKU table in `useIap.BASE_SKUS`. |
| Toast not visible | `ToastProvider` must wrap whatever calls `useToast`. It already does in `App.tsx` — don't re-wrap. |
| Navigation from interceptor doesn't work | `navigationRef.isReady()` is false during boot. `resetToSignIn` no-ops safely. |

---

## 11. Useful Commands

```bash
npm start                 # Metro
npm run android           # adb-install + run on Android device/emulator
npm run ios               # xcodebuild + run on iOS sim
npm run lint              # ESLint
npm test                  # Jest
npm run clean             # ./scripts/mac-clean.sh --force (mac storage cleaner — NOT a project clean)
cd ios && pod install     # After any native dep bump
```

---

## 12. Performance Notes

- `PracticeQuestionDetailScreen` uses a **5-phase render gating** (`renderPhase 1..5` via `InteractionManager` + `requestAnimationFrame` + staged timeouts) to keep the heavy 3.7k-LOC tree from jank during navigation.
- `RecorderContext` exposes **subscription-based** progress (`subscribeToAudioProgress`, `subscribeToTimer`) so timer/progress UI doesn't trigger root re-renders.
- `MediaConsole` is `React.memo` + `forwardRef` to keep its imperative API stable.
- Skeletons in `components/atoms/Skeleton/*` are pre-built per screen — use them; don't reinvent shimmer.
- Tab bar uses **mixed-driver Animated** (JS driver for layout/color, native driver for icon opacity) — be careful not to put both groups on the same `Animated.Value`.
- `react-native-svg-transformer` makes SVGs into React components — prefer SVG over PNG for icons.

---

## 13. Dependency Cheatsheet (top of mind)

| Domain | Library |
|---|---|
| Nav | `@react-navigation/{native,native-stack,bottom-tabs}` v7 |
| Net | `axios` |
| Storage | `@react-native-async-storage/async-storage` |
| Auth | `@react-native-google-signin/google-signin`, `@invertase/react-native-apple-authentication` |
| Crash | `@react-native-firebase/app`, `/crashlytics` |
| Media | `react-native-nitro-sound` (+ `nitro-modules`), `react-native-video`, `react-native-youtube-iframe` |
| IAP | `react-native-iap` |
| UI | `react-native-svg`, `react-native-linear-gradient`, `react-native-safe-area-context`, `react-native-screens`, `react-native-bootsplash` |
| Files | `react-native-fs`, `react-native-image-picker` |
| Misc | `react-native-webview`, `react-native-permissions`, `country-codes-list` |

---

## 14. Important Files (entry points for changes)

| Goal | File |
|---|---|
| Add a screen / route | `src/navigation/AppNavigator.tsx` (+ `RootStackParamList`) |
| Add a new tab | `src/navigation/DashboardTabNavigator.tsx` |
| Add/edit endpoint | `src/config/URLS.ts` (used via `API_ENDPOINTS[KEY]`) |
| Change env | `src/config/Config.ts` (`ENVIRONMENT = 1|2|3`) |
| Modify question timing | `src/config/subcategoryConfig.ts` |
| Touch user state | `src/context/UserContext.tsx` |
| Touch audio | `src/hooks/practiceMedia/*` + `src/context/RecorderContext.tsx` |
| Add toast | `useToast().showToast(...)` |
| Add IAP plan | `src/hooks/useIap.ts` (`BASE_SKUS` + plan metadata) |
| Theme color change | `src/theme/colors.ts` |

---

## 15. Cross-Reference

- **System architecture & data flow** → `SYSTEM_DESIGN.md`
- **Screen / component hierarchy** → `COMPONENT_TREE.md`
- **All API endpoints + how to call them** → `API_MAP.md`
- **State, storage, and auth flows** → `STATE_FLOW.md`
- **Dev workflows, scripts, debugging** → `DEVELOPMENT_GUIDE.md`
- **Deep audio module** → `./audio_module_doc.md`
- **Legacy/extended config doc** → `./api_config_doc.md`
