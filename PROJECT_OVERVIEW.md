# LA — Project Overview

Language Academy ka React Native PTE Academic / PTE Core test-prep app.
Yeh document batata hai is project me **kya use kiya hai, kahan use kiya hai, aur kaise use kiya hai** — ek hi jagah pe.

---

## 1. Stack at a glance

| Layer | Tech | Version |
|---|---|---|
| Runtime | React Native + new architecture | 0.85.3 |
| Language | TypeScript (strict) | ^5.8.3 |
| UI library | React | 19.2.3 |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) | ^7.x |
| Data layer | TanStack React Query | ^5.100 |
| HTTP | Axios (via custom apiClient) | ^1.16 |
| Storage | AsyncStorage + react-native-fs | latest |
| Audio (record + play) | react-native-nitro-sound + react-native-nitro-modules | ^0.2.14 / ^0.35 |
| Backend services | Firebase (Analytics + Crashlytics + Messaging) | ^24.0 |
| Auth (social) | Google Sign-In + Apple Authentication | ^16.1 / ^2.5 |
| Payments | react-native-iap | ^15.3 |
| Test runner | Jest | ^29.6 |
| Lint / Format | ESLint + Prettier | ^8.19 / 2.8 |

**Codebase size**: ~322 TS/TSX files in `src/`, **524 unit tests across 15 suites — all green**.

---

## 2. Folder structure

```
src/
├── assets/              Images, fonts, icons (incl. legacy scorcard.png)
├── components/          Reusable UI (atoms / molecules / organisms / templates + practiceMedia)
├── config/              Environment URLs, API endpoint catalog, subcategory mapping
├── context/             React Context providers (User, Dashboard, Toast, Recorder)
├── hooks/               Cross-feature hooks (network, IAP, branches, practiceMedia)
├── modules/audio/       Audio playback + recording singleton (AudioStore + nitro-sound)
├── navigation/          AppNavigator (native-stack) + DashboardTabNavigator (bottom-tabs)
├── screens/             Feature screens (Dashboard, MockTest, Practice, Profile, …)
├── services/            apiClient, logger, queryClient, analytics, notifications
├── theme/               Colors, fonts, spacing, radii, shadows
├── types/               Shared TS types
└── utils/               mediaUrls, validation, permissions, secureStorage, etc.
```

---

## 3. Dependencies — what they do, where they show up

### Core framework

| Package | What | Where used |
|---|---|---|
| `react-native` 0.85 | App runtime | Everywhere |
| `react` 19.2 | UI library | Everywhere |
| `typescript` 5.8 | Type-safety | `tsconfig.json` + every `.ts` / `.tsx` file |

### Navigation

| Package | Role | Where |
|---|---|---|
| `@react-navigation/native` v7 | NavigationContainer + hooks | `src/navigation/AppNavigator.tsx` |
| `@react-navigation/native-stack` v7 | Root stack with native transitions | `AppNavigator.tsx` — defines `RootStackParamList` |
| `@react-navigation/bottom-tabs` v7 | Dashboard tabs (Home / Mock / Practice / Progress / Menu) | `src/navigation/DashboardTabNavigator.tsx` |
| `react-native-screens` | Underlying native screens primitive | Auto-enabled |
| `react-native-safe-area-context` | Safe-area insets | Every screen header / footer (`useSafeAreaInsets`) |

### Data layer

| Package | Role | Where |
|---|---|---|
| `@tanstack/react-query` v5 | Server state, cache, retry, invalidation | `src/services/queryClient.ts` + 30+ hooks across screens |
| `axios` | HTTP client | `src/services/apiClient.ts` (interceptors for JWT + Sentry-like error logging) |
| `@react-native-async-storage/async-storage` | Lightweight key-value store | Persistence for queue items, goal progress, recent tags |
| `react-native-fs` | Native file system access | Audio recording file paths, image caching |

**React Query usage pattern** — every server fetch in this app goes through a custom hook (e.g. `useMockResult`, `usePastMocks`, `usePendingMocks`, `useMockSession`, `useMockAnalysis`, `useProgressData`, `useStrategyVideos`, `useSubscriptionPackages`, `useBranches`). All keys are versioned (`['mock-result', mockId, variant]`) so cache misses are safe.

### Audio + recording (most complex subsystem)

| Package | Role |
|---|---|
| `react-native-nitro-sound` | Native audio playback + recording (replaces old `react-native-audio-recorder-player`) |
| `react-native-nitro-modules` | The TurboModule plumbing nitro-sound depends on |

**Architecture** — `src/modules/audio/AudioStore.ts` is a **singleton** wrapper:
- Holds `currentId`, `currentUrl`, `currentPlaying` state
- Subscriber pattern (`subscribe`, `subscribeToProgress`, `subscribeToDuration`)
- Single playback at a time (auto-stops previous track)
- Built-in duration cache (avoids re-querying for already-loaded files)
- Pause / resume / stop / seek API

Surfaces:
- `AudioPlayer.tsx` — generic player UI
- `AudioPlaybackBar.tsx` — minimal seek bar
- `WaveformSeekBar.tsx` — waveform visualization
- `AutoPlayAudioRecorder.tsx` — speaking-question recorder (phased: audio → countdown → recording)
- `HeadsetCheckPlayer.tsx`, `MicrophoneCheckPlayer.tsx` — prerequisite checks

### Backend / Push

| Package | Role |
|---|---|
| `@react-native-firebase/app` | Firebase init |
| `@react-native-firebase/analytics` | Screen tracking + events (`src/services/analytics.ts`) |
| `@react-native-firebase/crashlytics` | Crash reporting |
| `@react-native-firebase/messaging` | Push notification handling (`src/services/notificationService.ts`) |
| `@notifee/react-native` | Local + remote notification rendering |

### Auth

| Package | Role |
|---|---|
| `@react-native-google-signin/google-signin` | Google OAuth |
| `@invertase/react-native-apple-authentication` | Sign in with Apple |
| `react-native-permissions` | Mic, camera, notification, photo permissions |

Both flows wired in `src/services/socialAuthService.ts`.

### Media + UI

| Package | Role | Where |
|---|---|---|
| `react-native-svg` | Vector graphics + transformer | Performance circles, custom icons |
| `react-native-linear-gradient` | Gradients | Hero cards, button accents |
| `react-native-render-html` | Render backend HTML (question prompts) | `PracticeQuestionDetail` + MockTest renderers |
| `react-native-video` | Video player | Strategy videos, dashboard videos |
| `react-native-youtube-iframe` | YouTube embed | Videos screen |
| `react-native-webview` | Webview shell | `HiddenAttemptAudioWebView` (Practice attempt audio playback) |
| `react-native-image-picker` | Camera + gallery picker | Profile avatar upload |
| `react-native-image-viewing` | Full-screen image lightbox | Describe Image preview |
| `react-native-calendars` | Calendar grids | DailyFeedback / PracticeHistory calendar |
| `react-native-bootsplash` | Native splash screen | Wired in `Splash` screen + iOS/Android native |

### Misc

| Package | Role |
|---|---|
| `react-native-iap` | In-app purchases (subscription packages) — `src/hooks/useIap.ts` |
| `react-native-device-info` | Device metadata for analytics + API headers |
| `@react-native-community/netinfo` | Network status — `src/hooks/useNetworkStatus.ts` |
| `country-codes-list` | Country dropdown options (sign-up + profile) |

---

## 4. App configuration

### `src/config/Config.ts`
- 3 environments: PRODUCTION / UAT / STAGING — toggled via the `ENVIRONMENT` constant
- Exposes `BASE_URL`, `PDF_PATH`, `PTE_CORE_BASE_URL`, `PDF_PTE_CORE_PATH`
- Global S3 paths: `mediaUrl` (audio + image bucket), `audioPath` (legacy ptemedia answer-audio convention)

### `src/config/URLS.ts`
**Single source of truth** for every backend endpoint. **76 endpoints total — 65 USED, 3 PTE-CORE auto-resolved, 8 reserved for future features.**

Categories:
- **Auth / Onboarding** — login, signup, OTP, social-login, password reset, device-token registration
- **Mock tests** — list, detail, pending, submit, result, score, analysis (with `?new_format=1` for extensive)
- **User profile** — fetch, update, delete, change-name, change-email-with-OTP, exam-date
- **Dashboard** — `get_dashboard_data` + variant resolver for PTE Core
- **Practice** — question list, categories, submit-answer (PTE Academic + PTE Core), set-tag, history, translate, report
- **Progress** — `progress/{skillId}?mock=0`, daily report
- **Videos / Templates / Predictions** — strategy videos, template list, prediction list
- **Notifications** — list + mark-as-read
- **Support / Contact** — contact us, contact details, branches, feedback
- **Live sessions** — variant-aware session listing
- **Subscriptions** — packages

### `src/config/apiConfig.ts`
- Proxy that resolves `API_ENDPOINTS.<KEY>` → full URL with the right base for the active variant (PTE Academic vs PTE Core)
- Adds variant-specific prefixing automatically (e.g. PTE Core endpoints get the `PTE_CORE_BASE_URL`)

### `src/config/subcategoryConfig.ts`
- PTE Academic + PTE Core question type catalog
- 20 subcategory IDs mapping to display name, kind (speaking/writing/reading/listening), prep/recording time

---

## 5. Services (`src/services/`)

| File | Role |
|---|---|
| `apiClient.ts` | Axios instance + JWT auth header + error interceptor + retry policies |
| `apiBuilder.ts` | URL builder using the Proxy from URLS.ts |
| `queryClient.ts` | React Query client with conservative defaults (no auto-refetch on focus) |
| `logger.ts` | Wrapped console — `log` / `info` / `warn` / `error` / `debug`; silenced in prod via `babel-plugin-transform-remove-console` |
| `navigationService.ts` | `navigationRef` for navigation from outside components (push notifications, deep links) |
| `notificationService.ts` | Firebase Messaging + Notifee — register, request permission, handle taps |
| `analytics.ts` | Firebase Analytics wrappers — `trackScreen`, `trackEvent` |
| `socialAuthService.ts` | Google + Apple OAuth flows |
| `versionCheckService.ts` | App-store version check + force-update prompt |
| `popupVideoStorage.ts` | "Don't show again" persistence for dashboard intro videos |

---

## 6. Context providers (`src/context/`)

| File | What it owns |
|---|---|
| `UserContext.tsx` | User profile, login state, JWT, update flows |
| `DashboardDataContext.tsx` | Dashboard payload, onboarding completion, device-token registration, notification badge count |
| `ToastContext.tsx` | App-wide toast queue (success/error/info), wired into `RootApp` |
| `RecorderContext.tsx` | Global recorder state (which question is currently recording) so multiple recorders don't fight |

Mounted in order at app root → `UserContext` → `DashboardDataContext` → `ToastContext` → `RecorderContext` → `NavigationContainer`.

---

## 7. Navigation

### Root stack (`src/navigation/AppNavigator.tsx`)

Eager-loaded (cold-start path):
- `Splash` → `Walkthrough` → `Onboarding` / `SignIn` / `SignUp` / `OTP` / `ForgotPassword` / `NewPassword` → `DashboardTabs`

Lazy-loaded (every other screen via `getComponent`):
- `MockTestPrerequisite`, `MockTestRunner`, `MockTestResult`, `MockTestAnalysis`, `MockTestHistory`, `MockTestProgress`
- `PracticeCommonList`, `PracticeQuestionDetail`, `PracticeHistoryCalendar`
- `Profile`, `EditProfile`, `ChangePassword`, `Notifications`, `ContactSupport`
- `MonthlyPrediction`, `LiveSessions`, `Videos`, `DailyFeedback`, `DailyGoals`
- `Microphone`, `Headset` (prereq check screens)
- `Maintenance`, `UpdateModal`

### Bottom tabs (`src/navigation/DashboardTabNavigator.tsx`)
- **Home** (Dashboard)
- **Mock** (MockTestScreen)
- **Practice** (PracticeScreen)
- **Progress** (ProgressTracker)
- **Menu**

Each tab is a native-stack itself so deep links land on the right tab and back-swipe stays inside the tab.

---

## 8. Screens — feature breakdown

### 8.1 Mock Test (the biggest feature)

Five sibling screens under `src/screens/MockTest/`:

| Screen | Folder | Purpose |
|---|---|---|
| Listing | `MockTestScreen.tsx` | List + filter past + pending + available mocks (Mock / Extensive toggle, category tabs) |
| Prerequisite | `MockTestPrerequisite/` | Headset + Mic check, recording quality preview, instruction screen |
| Runner | `MockTestRunner/` | The exam itself — timer, navigation, recorder, submit queue |
| Result | `MockTestResult/` | Score card UI (legacy-parity refactor — see §10) |
| Analysis | `MockTestAnalysis/` | Per-question breakdown — user's answer, correct answer, score |
| History | `MockTestHistory/` | Paginated full mock history |
| Progress | `MockTestProgress/` | Trends, goals, weakest-skill callout |

#### Runner internals (`MockTestRunner/`)

**Hooks**:
- `useMockSession.ts` — Fetches mock metadata + question batch via `MOCK_TEST_DETAIL`
- `useMockTimer.ts` — Section-aware countdown with auto-expire and section-break overlay
- `useSubmitQueue.ts` — In-memory queue with scheduler (concurrency = 2) + AsyncStorage persistence
- `usePendingMocks.ts` — Recovery path for unfinished mocks

**Files**:
- `helpers.ts` — `normalizeQuestion`, `buildSubmitPayload` (the big legacy-parity formdata builder), `getGroundTruth`
- `scheduler.ts` — Generic concurrency queue (used by `useSubmitQueue`)
- `persistence.ts` — Failed-item persistence across app restarts

**Question renderers** (`components/`):
- `SpeakingQuestion.tsx` — wraps `AutoPlayAudioRecorder` (audio prompt → mic countdown → recording)
- `WritingQuestion.tsx` — textarea + word count
- `McqQuestion.tsx`, `FibBankQuestion.tsx`, `FibDropdownQuestion.tsx`, `FibInputQuestion.tsx`
- `ReorderQuestion.tsx`, `HighlightQuestion.tsx`
- `QuestionRouter.tsx` — Picks the right renderer based on `subcategoryId`
- `RunnerFooter.tsx` — Save & Exit + Next / Submit Test CTAs
- `SectionBreakOverlay.tsx` — Inter-section pause overlay
- `SubmissionRetryOverlay.tsx` — Shown on partial submit failure with retry-or-exit UX

**Submit payload contract** — `buildSubmitPayload` builds a FormData that exactly matches the legacy PHP backend's expectations across 3 mock variants:
- `pending` = always `1` (except dynamic for Extensive)
- `complete` = `1` only on the **final** submission of the **last** section (Full Mock = section 3, Sectional = the only section)
- `skip` = section index for Full Mock, `0` for Extensive, omitted for Normal
- Per-subcategory answer mapping for `answer[]` / `ans[]` / `q_ans[]` / `correct[]`
- Speaking-specific fields (`selected[]`, `text_answer[]`, `length[]`) appended as literal `null`
- `file[]` attached as platform-specific blob (`audio/m4a` on iOS, `audio/mp4` on Android)
- Result IDs flow through `usePastMocks` so `MOCK_SCORE/{resultId}` hits the right row (NOT `mockId` — the legacy gotcha)

#### Result internals (`MockTestResult/`)

Backend response shape (from `mock/score/{resultId}`):
```
{ data: { com, enable, total, time, text }, user_data: {...} }
```

Components (all legacy-parity):
- `CommunicationScoreCard` — avatar + name + purple `scorcard.png` pill with score
- `PerformanceResultCircles` — 2×2 grid of SVG circular gauges (Listening purple, Reading orange, Writing green, Speaking blue)
- `SkillBreakdownCard` — horizontal colored bars
- `EnablingSkillsCard` — Grammar / Oral Fluency / Pronunciation / Spelling / Vocabulary / Written Discourse tiles
- `CandidateCenterDetails` — Candidate + Center info cards + "Need a higher score?" dark CTA
- `RawResponseSheet` — long-press debug sheet that dumps the raw payload

Hook: `useMockResult` reads `resultId` from `usePastMocks` (or accepts it via nav params), then fetches `MOCK_SCORE/{resultId}`. Includes a custom `MockScoreNotReadyError` + exponential backoff (6 retries, 1s → 8s) for the backend grading-race window.

### 8.2 Practice

| Screen | Folder | Purpose |
|---|---|---|
| Listing | `PracticeScreen.tsx` | Skill tabs (Speaking / Writing / Reading / Listening) + subcategory rail |
| Common list | `PracticeCommonList/` | Paginated question list per subcategory with filters + sort + tag pills |
| Question detail | `PracticeQuestionDetail/` | Practice runner — audio, recorder, MCQ options, attempts history |

Detail screen internals:
- `helpers.ts` — payload builders, scoring helpers
- `hooks/useAttemptAudioPlayer.ts` — playback of past answer audio
- `hooks/usePhasedRender.ts` — staggered render of heavy panels for smoothness
- `hooks/useScoreBreakdown.ts` — per-question score normalization
- Components: `QuestionContent`, `MCQOptions`, `AttemptsList`, `AttemptsHistorySection`, `ExpandPanels`, `MockRunnerBridge` (Practice → Mock data adapter), `ReportIssueModal`, `ScoreResultModal`, `TagPickerDropdown`

### 8.3 Other screens
- **Dashboard** — Hero stats, video carousel, daily goals progress, push-notification badge
- **Progress / Progress Tracker** — Per-skill progression charts
- **DailyFeedback** — Daily report calendar + per-day breakdown
- **DailyGoals** — Target setter for daily question count per skill
- **Videos** — Strategy video library (YouTube embed)
- **MonthlyPrediction** — Prediction question access (paywall-gated)
- **LiveSessions** — Live class schedule + branch selector
- **BookTrialClass** — Trial-class enquiry form
- **Profile / EditProfile** — User settings, email change with OTP, photo upload
- **Notifications** — In-app inbox + mark-as-read
- **Menu** — Help, contact, app version, logout

---

## 9. Components library (`src/components/`)

Loose **atomic-design**ish layout:
- `atoms/` — Button, Pill, Icon, Avatar, Skeleton primitives
- `molecules/` — Card, ListRow, Modal, Toast
- `organisms/` — UpdateModal, ContactCard, FeedbackForm
- `templates/` — Screen-level scaffolds (header + scroll + safe-area + status-bar)
- `practiceMedia/` — Shared media bar primitives reused across MockTest + Practice:
  - `UnifiedMediaBar` — top-level audio/recorder UI
  - `WaveformBar`, `LiveAudioProgressBar`, `LiveTimerText`, `MediaConsole`, `MediaStatusInline`, `PrepTimerCard`, `RecordingPanel`, `RecordedPlaybackBar`, `ReviewPanel`, `AudioStatusCard`

---

## 10. Utilities (`src/utils/`)

| File | Purpose |
|---|---|
| `mediaUrls.ts` | `resolveAudioUrl` + `resolveImageUrl` — turn backend's relative paths (`/ptedata/...`, bare filenames, `/audio/William_7448.mp3`) into absolute S3 URLs. **Legacy-parity rule**: any path with a `/` is bucket-rooted (`${mediaUrl}/${cleaned}`); bare filenames fall back to `${audioPath}${filename}` |
| `validation.ts` | Form validators (email, phone, password strength) |
| `PermissionHandler.ts` | Wrapper around `react-native-permissions` for mic/camera/notifications |
| `secureStorage.ts` | JWT + sensitive-data storage |
| `subscriptionHelpers.tsx`, `subscriptionMapping.ts`, `subscriptionValidator.ts` | Subscription gating logic + display names |
| `tagColorStore.ts` | Persistent per-tag color memory (Practice + Mock) |

---

## 11. Testing

| | |
|---|---|
| Runner | Jest (`@react-native/jest-preset`) |
| Test files | 15 suites |
| Total tests | **524 — all green** |
| Coverage focus | Pure helpers (normalizers, payload builders, scheduler, persistence, sorting) |
| Strategy | Heavy on `helpers.ts` unit tests; components covered via integration when complex (e.g. `usePastMocks.test.ts`) |

**Notable test files**:
- `MockTestRunner/helpers.test.ts` — 159 tests covering `buildSubmitPayload` field-by-field per subcategory, `normalizeQuestion`, `getGroundTruth`
- `MockTestRunner/scheduler.test.ts` — concurrency + retry + ordering semantics
- `MockTestRunner/persistence.test.ts` — round-trip + age-based eviction of queue items
- `MockTestResult/helpers.test.ts` — normalizer covering nested `data.com` / `data.enable`, resultId extraction, scoreLabel defaults
- `MockTestResult/hooks/usePastMocks.test.ts` — dedupe + sort
- `MockTestProgress/helpers.test.ts` + `goalPersistence.test.ts`
- `Practice/PracticeQuestionDetail/helpers.test.ts`

Run:
- `npm test` — fast run
- `npm run test:ci` — `--ci --coverage --maxWorkers=2`

---

## 12. Build + tooling

| | |
|---|---|
| Lint | `npm run lint` → ESLint with `@react-native/eslint-config` |
| Format | Prettier 2.8 (auto on commit if hook installed) |
| Typecheck | `npx tsc --noEmit` |
| Android | `npm run android` |
| iOS | `npm run ios` (Pods auto-installed via CocoaPods) |
| Clean | `npm run clean` → custom `scripts/mac-clean.sh` (deletes Metro / Pods / iOS DerivedData / Android build / Gradle caches) |
| Console removal | `babel-plugin-transform-remove-console` strips `console.*` in production |

Engine pin: **Node ≥ 22.11**.

---

## 13. Key engineering patterns

1. **Single-source URLs** — every endpoint goes through `URLS.ts` + the `apiConfig` Proxy. No raw URL strings in features.
2. **Variant-aware base URL** — PTE Academic vs PTE Core resolved at request time, transparent to feature code.
3. **Defensive normalizers** — every backend response (mock result, past mocks, pending mocks, dashboard, question payload) walks a field-alias catalog instead of trusting one shape. Tests pin the contracts.
4. **Singleton media controller** — exactly one audio at a time via `AudioStore`, prevents the legacy "two players fighting" class of bugs.
5. **Submit queue** — final-submit reliability comes from `scheduler.ts` + `persistence.ts` (concurrency-controlled in-memory queue with disk persistence on failure).
6. **Legacy parity layer** — `buildSubmitPayload`, `resolveAudioUrl`, mock-result normalizer all replicate the legacy PHP backend's exact expectations (every quirk documented inline with `// Mirrors legacy …` comments).
7. **React Query everywhere** — no Redux, no MobX. Server state lives in React Query, UI state in `useState`/`useReducer`, cross-screen state in small Contexts.
8. **TypeScript strict** — `strict: true` in `tsconfig.json`. Zero `any` in normalizers / hooks (only allowed in TS-unfriendly FormData append calls).
9. **Lazy navigation** — only cold-start path eager-loaded; everything else `getComponent` lazy.
10. **Inline doc comments** — every non-obvious decision (especially legacy parity, error retry policy, payload field semantics) has a `// Why …` block at the call site so the rationale lives next to the code.

---

## 14. Environment toggle cheat-sheet

```ts
// src/config/Config.ts
const ENVIRONMENT = 3;  // 1 = PROD, 2 = UAT, 3 = STAGING
```

That single line switches:
- `BASE_URL` (every API call)
- `PDF_PATH` (PDF + profile-image hosting)
- `PTE_CORE_BASE_URL` + `PDF_PTE_CORE_PATH` (variant)

Media (S3 bucket) is shared across all environments — see `GLOBAL_ASSETS` block.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **PTE Academic** | The original test (default variant) |
| **PTE Core** | Newer PTE variant — different endpoints + question id range, transparently handled via `apiConfig` Proxy |
| **Subcategory** | One of 20 PTE question types (Read Aloud, Repeat Sentence, …) |
| **Mock variant** | `full` (Normal Mock + Full Mock) vs `extensive` (sectional Extensive Mock) |
| **Mock category** | Section grouping — Speaking / Writing / Reading / Listening / Full Mock |
| **`mockId`** | The mock master ID (identifies the question set) — used for navigation grouping |
| **`resultId`** | The per-attempt row ID — what `MOCK_SCORE`, `MOCK_ANALYSIS` URLs need |
| **Pending mock** | A mock the user started but didn't finish — recoverable via `usePendingMocks` |
| **Grading race** | Backend NPE window right after final-submit until the scoring worker materialises the result row. Handled with `MockScoreNotReadyError` + exponential retry |
