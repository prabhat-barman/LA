# STATE_FLOW — State Management, Storage, Auth & Subscription Flows

> The app uses **React Context only**. No Redux/Zustand. This doc describes every reactive store and persistent key.

---

## 1. State Topology

```
┌────────────────────────────────────────────────────────────────────┐
│ React Context Providers (top → bottom, see App.tsx)                │
│                                                                    │
│ ToastProvider          ──► useToast()                              │
│   └─ UserProvider      ──► useUser()                               │
│       └─ DashboardDataProvider  ──► useDashboardData()             │
│           └─ RecorderProvider   ──► useRecorder()                  │
└────────────────────────────────────────────────────────────────────┘

Persistence (AsyncStorage via secureStorage.ts) ─ mirrored in-memory ─
   ┌────────────────────────────────────────────────────────────────┐
   │ user_token, user_data, dashboard_data_cache, timezone_synced,  │
   │ device_token_registered, fcm_device_token, active_subscription,│
   │ backend_active_subscription                                    │
   └────────────────────────────────────────────────────────────────┘
```

---

## 2. Context Reference

### 2.1 ToastContext
```ts
const { showToast } = useToast();
showToast('Saved!', 'success'); // 'success' | 'error' | 'info'
```
- Internal state: `message, type, visible, fadeAnim, slideAnim, timerRef`.
- Auto-hides after 3000ms with fade + slide animation (native driver).
- Single-toast queue: a new `showToast` clears the previous timer.

### 2.2 UserContext
```ts
const {
  user,                  // User | null
  loading,               // initial load only
  loadUser,              // hydrate from secureStorage
  refreshUser,           // GET USER_PROFILE
  updateUser,            // optimistic + POST USER_PROFILE_UPDATE (+ multipart if imageFile)
  updateExamDate,        // optimistic + POST UPDATE_EXAM_DATE
  clearUser,             // setUser(null) on logout
} = useUser();
```
- On mount: `loadUser()` reads `user_data` from storage.
- `updateUser` strategy: (1) optimistic local update, (2) POST `saveUser`, (3) optional silent POST `update-name`, (4) `refreshUser()` from backend. On failure → revert via `loadUser()`.
- `User` shape normalises legacy backend fields: `language ← lang`, `location ← country_citizenship | country_residence | country`.

### 2.3 DashboardDataContext
```ts
const {
  dashboardData, loading, refreshing, hasNotifications,
  loadDashboardData,     // (isPullToRefresh?: boolean)
} = useDashboardData();
```
**`loadDashboardData()` performs (in order):**
1. Bail out silently if no `user_token`.
2. `GET DASHBOARD_DATA` (15s timeout) → `setDashboardData(data)` + cache `dashboard_data_cache`.
3. Cache `user_data` from `data.user`.
4. `persistBackendActiveSubscription(data.active_subscription)` (key: `backend_active_subscription`).
5. `GET GET_NOTIFICATIONS` → `setHasNotifications(list.length > 0)` (silent on fail).
6. `GET ONBOARDING` (best-effort).
7. `syncTimezone()` once per install (`timezone_synced='true'`).
8. `registerDeviceToken()` once per install (`device_token_registered='true'`, reads `fcm_device_token`).

**Error handling:** treats `401`, `"API blocked due to session expiration"`, `"Network Error"` as transient (silent). Other errors → toast. In both cases hydrates from `dashboard_data_cache` if available.

### 2.4 RecorderContext (media flow state machine)

```ts
type MediaPhase =
  | 'idle' | 'audio_wait' | 'audio_playing' | 'audio_done'
  | 'prep_countdown' | 'recording' | 'review';
```

Exposed API:
```ts
const {
  phase, recordedUri, recordingDurationSec, amplitude, resolvedPrepTimeSec,

  // Subscriptions (avoid re-renders for high-frequency updates)
  getAudioProgress,        subscribeToAudioProgress,
  getSecondsLeft,          subscribeToTimer,

  // Lifecycle
  initQuestion({ metadata, isCore?, audioUrl?, autoStart?, onAudioFinish?, onRecordingFinish?, onError? }),
  start, replayAudio, skipAudio,
  startRecordingNow, stopRecording, retake, reset,
  setPlaybackRate,
} = useRecorder();
```

**Internals (see `src/context/RecorderContext.tsx`):**
- Uses `useAudioPlayer` + `useVoiceRecorder` from `hooks/practiceMedia/*`.
- `phaseRef` + `recordedUriRef` provide stable values for callbacks.
- `metadataRef / isCoreRef / audioUrlRef / onAudioFinishRef / onRecordingFinishRef / onErrorRef` allow callbacks to be supplied per question without rebuilding the provider.
- `countdownIntervalRef` drives `audio_wait` and `prep_countdown` timers.
- `settleAfterAudio()` is the single landing function after audio playback ends (`onComplete`/`onPreempt`/`onError`) and picks `review` (if already recorded), `prep_countdown` (if recording follows), or `audio_done` (listening-only).

**Subscription pattern (perf-critical):**
```ts
useEffect(() => subscribeToTimer((secs) => myRef.current?.setNativeProps({ text: `${secs}s` })), []);
useEffect(() => subscribeToAudioProgress((pos, dur, p) => updateProgressBar(p)), []);
```
This avoids re-rendering the whole screen on every tick.

---

## 3. Recorder Phase Diagram

```
                ┌────────┐
   reset() ────►│  idle  │◄──── initQuestion() (sets metadata, refs, prep time)
                └───┬────┘
                    │ start() / autoStart
                    ▼
        ┌───────────────────────┐
        │ has audio?            │
        │   yes → audio_wait    │  (if waitTimeBeforeAudio > 0)
        │   yes → audio_playing │  (if waitTimeBeforeAudio == 0)
        │   no  → prep_countdown│  (if has recording)
        │   no  → idle           │  (if neither audio nor recording)
        └───────────────────────┘
                    │
                    ▼
     audio_playing ──onComplete/onPreempt/onError──► settleAfterAudio()
                                                    │
                              ┌─────────────────────┼──────────────────┐
                              ▼                     ▼                  ▼
                           review              prep_countdown      audio_done
                       (if recordedUri)        (if recording)      (listening-only)
                              │
                              ▼ retake()
                       prep_countdown
                              │
                              ▼ countdown=0 OR startRecordingNow()
                          recording ──stop/timeout/onError──► review
```

**Transitions in code:**
- `initQuestion()` resets, sets metadata refs, then calls `start()` next tick.
- `replayAudio()` re-plays question audio **without** clearing `recordedUri` (keeps user's answer).
- `start()` is the full state-machine entry (use sparingly; prefer `replayAudio`).
- `retake()` re-enters `prep_countdown` so user gets the same lead-in.
- `reset()` is "tear everything down" — call on screen unmount or before navigating to a new question.

---

## 4. AsyncStorage Key Inventory

| Key | Type | Owner | Lifetime |
|---|---|---|---|
| `user_token` | string (JWT) | apiClient, splash, social auth | Until logout / 401 |
| `user_data` | JSON string (User) | UserContext, social auth, dashboard | Until logout |
| `dashboard_data_cache` | JSON string | DashboardDataContext | Refreshed each successful `loadDashboardData()` |
| `timezone_synced` | `'true'` flag | DashboardDataContext.syncTimezone | One-shot per install |
| `device_token_registered` | `'true'` flag | DashboardDataContext.registerDeviceToken | One-shot per install |
| `fcm_device_token` | string | (external FCM glue) | Refreshed by FCM |
| `active_subscription` | JSON `StoredSubscription[]` | hooks/useIap | Until cancellation/expiry |
| `backend_active_subscription` | JSON `BackendActiveSubscription[]` | DashboardDataContext + subscriptionValidator | Refreshed each dashboard load |

**Always** access these through `utils/secureStorage.ts` (`getItem`, `setItem`, `removeItem`, `clear`). It has an in-memory fallback if the native AsyncStorage module fails to link.

---

## 5. Auth Lifecycle

```
SplashScreen mount
   │ read user_token
   ▼
 token? ──no──► replace('Onboarding')
   │ yes
   ▼
 replace('Dashboard')
   │
   ▼
[Any authenticated request flows through apiClient]
   │
   ▼ 401 with Bearer
handleSessionExpired()
   - sessionExpiring guard (multi-401 dedupe)
   - logoutSuppressed = true (blocks further outgoing requests)
   - removeItem(user_token, user_data, dashboard_data_cache,
                timezone_synced, device_token_registered,
                backend_active_subscription)
   - resetToSignIn()
   - setTimeout(1500ms) → clear guards
```

**Manual logout pattern:**
```ts
import { startManualLogout, resetLogoutSuppression } from '../services/apiClient';
import { removeItem } from '../utils/secureStorage';
import { resetToSignIn } from '../services/navigationService';

startManualLogout();
await Promise.all([
  removeItem('user_token'),
  removeItem('user_data'),
  removeItem('dashboard_data_cache'),
  removeItem('backend_active_subscription'),
  // (clear any other session-bound keys)
]);
resetToSignIn();
setTimeout(() => resetLogoutSuppression(), 1500);
```

---

## 6. Subscription Resolution

Two sources of truth merge into a single effective tier (`Silver | Gold | null`).

```
hasContentTypeAccess('practice_material' | 'mock_test' | 'pte_video' | 'vip_video')
   ├─ readLocalIapTier()        ← AsyncStorage 'active_subscription' (StoredSubscription[])
   │                              filtered by expiry_date >= today
   ├─ readBackendTier()         ← AsyncStorage 'backend_active_subscription'
   │                              filtered via subscriptionMapping.isSubscriptionExpired
   ├─ maxTier(a, b)             ← Silver(rank 1) vs Gold(rank 2), max wins
   └─ ACCESS_MAP[contentType]   ← list of tiers granting access
                                  vip_video: ['Gold']; others: ['Silver','Gold']
```

**Gating pattern (rough):**
```ts
const allowed = await hasContentTypeAccess('mock_test');
if (!allowed) navigation.navigate('Subscription');
```

---

## 7. IAP Flow (high level — see `hooks/useIap.ts` for full code)

```
useIap()
  initConnection
    fetchProducts({ skus: buildSkus().all, type: 'subs' })  ← _core suffix on Android if PTE_CORE
  user taps Buy
    requestPurchase({ sku })
  purchaseUpdatedListener fires
    POST PAYMENT_STATUS (Android) or VERIFY_IOS_IAP (iOS) with receipt
    if backend ok →
      finishTransaction(purchase)
      saveSubscriptionToStorage() → AsyncStorage 'active_subscription'
  restore
    getAvailablePurchases() → verify each → store
on unmount
  endConnection()
```

SKU prefixes (`useIap.ts > BASE_SKUS`):
- Gold: `com.languageacademy.gold{1,2,3}month` (Android) / `…gold{1,2,3}monthplan` (iOS)
- Silver: `com.languageacademy.silver{1,2,3}month` (Android) / `…silver1monthplann` (intentional typo for App Store) / `silver{2,3}monthplan`
- PTE_CORE Android: append `_core` to every SKU.

---

## 8. Per-Screen State Patterns (cheatsheet)

| Pattern | When | Where it's already used |
|---|---|---|
| Local `useState` for one-off UI | Modals open/close, form text, accordions | every screen |
| `useRef` for non-rendered state | Imperative handles, debouncing, animation values | `DashboardTabNavigator`, `RecorderContext`, `PracticeQuestionDetailScreen` |
| Subscribe model (subscriber pattern) | Timer ticks, audio progress — high freq | `RecorderContext.subscribeToTimer`, `subscribeToAudioProgress` |
| In-module pub-sub store | Shared list state without re-rendering all consumers | `utils/tagColorStore.ts` (bookmarks) |
| Provider context | Cross-screen state | `User`, `DashboardData`, `Recorder`, `Toast` |
| `useImperativeHandle` | Screen needs to drive a memo'd child | `MediaConsole` (`reset/replayAudio/getPhase/stopRecordingIfActive`) |
| 5-phase render gating | Defer heavy subtrees during navigation | `PracticeQuestionDetailScreen.renderPhase` |

---

## 9. Things You Must NOT Do

- ❌ Direct `Sound.startPlayer / stopPlayer / startRecorder / stopRecorder` calls outside the practiceMedia hooks. Breaks ownership and leaks listeners.
- ❌ Manual `Authorization` header on `apiClient` requests (interceptor handles it).
- ❌ Manual URL string concatenation. Use `API_ENDPOINTS.<KEY>`.
- ❌ Calling `setItem('user_token', ...)` without also updating `UserContext` (causes UI desync). Prefer `signInWith*` helpers or login screens.
- ❌ Mutating the providers' callback identities every render (they're memoised — keep the contract).
- ❌ Wrapping `RecorderProvider` more than once. There's only one in `App.tsx`.
