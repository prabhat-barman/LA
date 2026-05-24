# SYSTEM_DESIGN — Architecture & End-to-End Flow

> See `AI_CONTEXT.md` for the quick summary. This file explains *how* the system fits together.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       React Native App (LA)                        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ App.tsx                                                       │ │
│  │   SafeAreaProvider                                            │ │
│  │     ErrorBoundary (root crash net + Crashlytics)              │ │
│  │       ToastProvider                                           │ │
│  │         UserProvider                                          │ │
│  │           DashboardDataProvider                               │ │
│  │             RecorderProvider                                  │ │
│  │               KeyboardAvoidingView                            │ │
│  │                 AppNavigator (NavigationContainer + Stack)    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Cross-cutting modules:                                             │
│   • services/apiClient.ts  (axios + interceptors + 401 → resetSignIn)│
│   • services/navigationService.ts  (navigationRef for non-React)   │
│   • services/logger.ts     (Crashlytics-safe logger)                │
│   • utils/secureStorage.ts (AsyncStorage + memory fallback)         │
│   • config/* (env, URLs, variant, practice metadata)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┴────────────────────────┐
        │                                               │
        ▼                                               ▼
  Backend ACADEMY                                Backend PTE_CORE
  (la-stagingbe / la-uatbe / backend22)         (lacore-stagingbe / lacore-uatbe / pte-core-backend)
        │                                               │
        └────────────┬──────────────────────────────────┘
                     │
                     ▼
        S3 media (lamedia21 bucket) — audio + PDFs
```

---

## 2. Layered Responsibilities

| Layer | Responsibility | Key files |
|---|---|---|
| **Native** | Splash, audio engine, sign-in SDKs, IAP, FS, video | iOS pods, Android Gradle |
| **Bridges/Hooks** | Wrap native APIs into React-friendly shapes | `hooks/practiceMedia/*`, `hooks/useIap.ts`, `services/socialAuthService.ts` |
| **Services** | I/O & global non-React utilities | `services/apiClient.ts`, `apiBuilder.ts`, `navigationService.ts`, `logger.ts`, `utils/secureStorage.ts`, `utils/PermissionHandler.ts` |
| **State (Context)** | Cross-screen reactive state | `context/{User,DashboardData,Recorder,Toast}Context.tsx` |
| **Navigation** | Route registry + custom tab bar | `navigation/{AppNavigator,DashboardTabNavigator}.tsx` |
| **Screens** | Feature flows (Onboarding, Practice, Mock, Videos, etc.) | `screens/<Feature>/*.tsx` |
| **UI Library** | Atomic components + theme tokens | `components/{atoms,molecules,organisms,templates,practiceMedia}/*`, `theme/*` |

---

## 3. Boot Sequence

```
index.js
  → AppRegistry.registerComponent('LA', App)
App.tsx::useEffect
  1. configureGoogleSignIn()        (services/socialAuthService.ts)
  2. RNBootSplash.hide({fade:true}) (react-native-bootsplash)
AppNavigator
  if (Config.MAINTENANCE_MODE) → <MaintenanceScreen /> (no NavigationContainer)
  else → <NavigationContainer ref={navigationRef}>
            <Stack initialRouteName="Splash" headerShown:false animation:'fade'>
SplashScreen
  - waits ~2s
  - reads user_token from secureStorage
  - navigation.replace('Dashboard' | 'Onboarding')
```

---

## 4. Networking Pipeline

```
Caller (screen / context / service)
   │
   ▼
API_ENDPOINTS[KEY]   (Proxy → buildUrl(key))
   │
   ▼
buildUrl(key)        (apiBuilder.ts)
   │   path = resolvePath(key)              ← PTE_CORE_ prefix fallback
   │   base = getBaseUrl()                  ← variant-aware
   ▼
`${base}/${path}` or absolute URL passthrough
   │
   ▼
apiClient.request    (axios singleton)
   request interceptor:
     • if logoutSuppressed → reject "API blocked..."
     • config.baseURL = getBaseUrl()        (re-set defensively)
     • config.headers.Authorization = `Bearer ${user_token}`
   ↓
Network
   ↓
   response interceptor:
     • 207 Multi-Status → normalize to 200 + data._is_restricted = true
     • 401 + had Authorization → handleSessionExpired()
         - sessionExpiring guard (parallel 401 dedupe)
         - logoutSuppressed = true
         - removeItem(user_token, user_data, dashboard_data_cache,
                      timezone_synced, device_token_registered,
                      backend_active_subscription)
         - navigationService.resetToSignIn()
         - setTimeout 1.5s → clear suppression
```

**Manual logout helpers:** `startManualLogout()`, `resetLogoutSuppression()` exported from `apiClient.ts`.

---

## 5. Auth Flow Detail

### Email / Password
```
SignIn → POST API_ENDPOINTS.SIGN_IN ({ email, password })
       → store user_token, user_data
       → navigation.replace('Dashboard')
```

### Google
```
signInWithGoogle()  (services/socialAuthService.ts)
  1. configureGoogleSignIn()
  2. (Android) GoogleSignin.hasPlayServices()
  3. GoogleSignin.signIn()
  4. GoogleSignin.getTokens() → accessToken
  5. FormData('credential', accessToken) → POST GOOGLE_LOGIN
  6. data = response.data?.original ?? response.data
  7. setItem('user_token', data.access_token)
  8. setItem('user_data', JSON.stringify(data.user))
On failure → GoogleSignin.signOut() best-effort + mapped error message.
```

### Apple (iOS only)
```
signInWithApple()
  1. appleAuth.performRequest({LOGIN, [EMAIL, FULL_NAME]})
  2. JSON payload incl. identityToken (also sent as access_token / id_token / token)
  3. POST APPLE_LOGIN
  4. Preserve real email if backend returned privaterelay.appleid.com
  5. Store token + user
  6. If name missing from Apple response → silent POST UPDATE_NAME
```

### Session Expiry
- Axios interceptor → `handleSessionExpired()` → wipe keys → `navigationService.resetToSignIn()`.

---

## 6. Practice Question Lifecycle (the heart of the app)

```
PracticeScreen (tab)
  → user picks subcategory (id 1..21)
  → navigate('PracticeCommonList', { categoryId, categoryName, parentCategory })
PracticeCommonListScreen
  → list questions for that subcategory (paginated)
  → tap → navigate('PracticeQuestionDetail', {
            questionId, categoryId, categoryName, parentCategory,
            questionsList, initialIndex
          })
PracticeQuestionDetailScreen  (3.7k LOC — the runner)
  - Phased renderPhase 1→5 to defer heavy subtrees
  - Loads question detail via API
  - Mounts <MediaConsole/> which calls RecorderContext.initQuestion(...)
  - RecorderContext drives the media phase machine (see § 7)
  - User records → onRecordingFinish → submit via SUBMIT_ANSWER (or PTE_CORE_SUBMIT_ANSWER)
  - Tabs: Sample/Transcript/Translate panels, history (Me/Others), word highlights
```

---

## 7. Audio / Recording State Machine

Owned by `RecorderContext` (= `useQuestionMediaFlow` lifted to global scope).

```
              ┌────────┐
              │  idle  │
              └───┬────┘
        initQuestion / start()
                  │
                  ▼
   ┌──────────────┴──────────────┐
   │  metadata.hasAudio?         │
   └──┬──────────────────────┬───┘
      │ yes                  │ no
      ▼                      ▼
┌──────────────┐    ┌────────────────────┐
│ audio_wait   │    │ has recording?     │
│ (countdown)  │    └──┬─────────────────┘
└──────┬───────┘       │ yes        │ no
       ▼               ▼            ▼
┌──────────────┐  ┌──────────────┐ ┌──────────┐
│audio_playing │  │prep_countdown│ │  idle    │
└─────┬────────┘  └──────┬───────┘ └──────────┘
      │ onComplete       │ countdown done
      ▼                  ▼
┌──────────────────┐  ┌──────────────┐
│ settleAfterAudio │  │  recording   │
│  - if recorded → │  └──────┬───────┘
│      → review    │         │ stop / timeout
│  - else if hasRec│         ▼
│      → prep      │   ┌──────────┐
│  - else          │   │  review  │ ← onFinish
│      → audio_done│   └────┬─────┘
└──────────────────┘        │
                            ▼ retake()
                       prep_countdown
```

### Ownership rules (must follow)
- All `Sound.*` calls go through `useAudioPlayer` or `useVoiceRecorder`.
- Both hooks call `soundCoordinator.acquire(id, kind, onPreempt)`.
- When another consumer acquires, the previous owner's `onPreempt` fires → that owner resets its React state.
- `release(id)` only releases if you still hold the slot — safe to call from cleanup.
- The "two-card" recording UI (`UnifiedMediaBar`) is rendered for `hasAudio && hasRecording` question types; otherwise the legacy layout (audio card + `MediaStatusInline`) is used.

---

## 8. Dashboard Data Pipeline

```
DashboardScreen.onFocus / pull-to-refresh
  → useDashboardData().loadDashboardData(isPullToRefresh)
     1. read user_token (else exit silently)
     2. GET DASHBOARD_DATA (15s timeout)
     3. setDashboardData(data)
     4. setItem('dashboard_data_cache', json)
     5. if data.user → cache user_data
     6. persistBackendActiveSubscription(data.active_subscription)  ← used by sub validator
     7. GET GET_NOTIFICATIONS → setHasNotifications(list.length > 0)
     8. GET ONBOARDING (best-effort)
     9. syncTimezone()       (once per install, posts SET_TIMEZONE)
    10. registerDeviceToken() (once per install, posts DEVICE_TOKEN)
  on error:
     - if 401 / "API blocked" / "Network Error" → silent (transient)
     - else toast error
     - hydrate from dashboard_data_cache as fallback
```

---

## 9. IAP / Subscription Flow

```
Subscription screen
  → useSubscriptionPackages() (backend GET_PACKAGES) — listing
  → useIap()
     - initConnection()
     - fetchProducts({ skus: buildSkus().all, type: 'subs' })
     - requestPurchase({ sku })
     - purchaseUpdatedListener →
         - apiClient.post(PAYMENT_STATUS | VERIFY_IOS_IAP) to backend verify
         - on success → finishTransaction(purchase)
         - saveSubscriptionToStorage() → AsyncStorage 'active_subscription'
     - getAvailablePurchases() for restore
     - on unmount → endConnection()
Access check
  → subscriptionValidator.hasContentTypeAccess(contentType)
     - read local IAP tier (AsyncStorage 'active_subscription')
     - read backend tier (AsyncStorage 'backend_active_subscription')
     - max tier wins (Silver=1, Gold=2)
     - ACCESS_MAP gates content_type → allowed tiers
```

---

## 10. Error Handling

| Layer | Strategy |
|---|---|
| Root | `ErrorBoundary` (root) — full-screen recovery UI + `logger.error → Crashlytics` |
| Feature subtree | `LocalErrorBoundary` — wrap risky regions inline |
| Network | axios response interceptor; per-call try/catch in callers; `DashboardDataContext` shows toast unless transient |
| Audio | `useVoiceRecorder.onError({code: 'permission'|'start'|'stop'|'interrupted'|'empty'})` mapped to friendly messages in `RecorderContext.recorder.onError` |
| Permission denied (mic) | Alert with "Open Settings" CTA (Android via `Linking.openSettings()`, iOS via blocked status branch) |

---

## 11. Theming

- `theme/colors.ts` — brand + UI palette
- `theme/fonts.ts` — `BricolageGrotesque-*` family + Platform-specific `fontWeight` overlays
- `theme/spacing.ts` — spacing tokens
- `theme/index.ts` — aggregated `theme = { colors, spacing, fonts, typography }`
- Per-file `scale(n) = (Dimensions.get('window').width / 375) * n` — common pattern, no shared util

---

## 12. Variant Switching (ACADEMY ↔ PTE_CORE)

`appVariantConfig.ts` is the **only** module that decides which backend / endpoint / IAP SKU set is in use. Currently it reads from an injected store that isn't wired (defaults to `ACADEMY`). To enable a real switch later:
1. Build a small variant store (Context or Zustand).
2. Call `injectStore(yourStore)` once during app init.
3. Mutate `state.variant.current` to flip the entire app's URLs/paths/SKUs.

No other code needs to change — `apiClient` re-reads `getBaseUrl()` per request, and `API_ENDPOINTS` re-resolves on every property access.

---

## 13. Maintenance & Crash Safety

- `Config.MAINTENANCE_MODE = true` → app boots into `MaintenanceScreen`, skipping NavigationContainer entirely.
- `secureStorage` falls back to in-process memory if AsyncStorage native bridge fails, so the app keeps working session-locally.
- `logger.error()` records to Crashlytics if the Firebase module is linked; otherwise it warns and continues (no crash on missing native module).
- `ErrorBoundary` provides "Show details / Reload" UI on the dev side and a graceful reset in production.
