# API_MAP — Endpoints, Variants, and Usage

> Authoritative endpoint reference. Always go through `API_ENDPOINTS[KEY]` (the Proxy in `src/config/apiConfig.ts`).

---

## 1. Base URLs (per environment)

Set `ENVIRONMENT` in `src/config/Config.ts`:

| Env # | Name | ACADEMY base | PTE_CORE base |
|---|---|---|---|
| 1 | PRODUCTION | `https://backend22.languageacademy.com.au/api/v1` | `https://pte-core-backend.languageacademy.com.au/api/v1` |
| 2 | UAT | `https://la-uatbe.languageacademy.com.au/api/v1` | `https://lacore-uatbe.languageacademy.com.au/api/v1` |
| 3 | STAGING (current) | `https://la-stagingbe.languageacademy.com.au/api/v1` | `https://lacore-stagingbe.languageacademy.com.au/api/v1` |

PDF / media base URLs follow the same pattern (`PDF_PATH`, `PDF_PTE_CORE_PATH`). S3 media: `https://s3.ap-southeast-2.amazonaws.com/lamedia21`.

---

## 2. How to Call an Endpoint

```ts
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

// GET
const res = await apiClient.get(API_ENDPOINTS.DASHBOARD_DATA);

// POST JSON
await apiClient.post(API_ENDPOINTS.SIGN_IN, { email, password });

// POST FormData
const fd = new FormData();
fd.append('credential', accessToken);
await apiClient.post(API_ENDPOINTS.GOOGLE_LOGIN, fd);
```

**What happens:**
1. `API_ENDPOINTS.X` → `buildUrl('X')` → `${getBaseUrl()}/${resolvePath('X')}`.
2. `resolvePath` tries `pte_core_X` and `PTE_CORE_X` keys first; falls back to `URLS[X]`.
3. `apiClient` interceptor injects `Authorization: Bearer ${user_token}` if present.
4. 401 with Bearer → wipes session + resets to SignIn.

> Never construct URLs manually. Never hard-code variant prefixes.

---

## 3. Special-cased keys (handled inside `apiConfig.ts` Proxy)

| Key | Returns |
|---|---|
| `image_and_PDF_URL` | `getPdfPath()` (variant-aware PDF base) |
| `mediaUrl` | `Config.mediaUrl` (S3 bucket root) |
| `audioPath` | `https://s3.ap-southeast-2.amazonaws.com/lamedia21/ptedata/ptemedia/` |

All others resolve through `buildUrl()`.

---

## 4. Endpoint Catalog (grouped by domain)

> Source: `src/config/URLS.ts`. Two endpoints (`SEND_UPDATE_EMAIL_OTP`, `UPDATE_USER_EMAIL`) are stored as absolute URLs and bypass `buildUrl`'s base concatenation.

### 4.1 Auth & Onboarding
| Key | Path |
|---|---|
| `REQUEST_OTP` | `requestotp` |
| `SIGN_IN` | `login` |
| `LOGOUT` | `logout` |
| `SIGN_UP` | `app/signup` |
| `SEND_SIGN_UP` | `app/send/otp` |
| `VERIFY_EMAIL_PHONE` | `user-validation` |
| `FORGOTPASSWORD` | `forgot` |
| `RESET_FORGOTPASSWORD` | `reset-password` |
| `GOOGLE_LOGIN` / `GOOGLE_SOCIAL_LOGIN` | `googleSignUp` |
| `APPLE_LOGIN` / `APPLE_SOCIAL_LOGIN` | `appleSignUp` |
| `DEVICE_TOKEN` | `deviceToken` |
| `DEVICE_TOKEN_USER` | `deviceToken/user` |
| `ONBOARDING` | `onboarding` |
| `CHANGE_PASSWORD` | `changePassword` |
| `SEND_UPDATE_EMAIL_OTP` | `${BASE_URL}/send-update-email-otp` (absolute) |
| `UPDATE_USER_EMAIL` | `${BASE_URL}/update-user-email` (absolute) |

### 4.2 User Profile
| Key | Path |
|---|---|
| `USER_PROFILE` | `user-my-profile` |
| `USER_PROFILE_DELETE` | `user/delete` |
| `USER_PROFILE_UPDATE` | `saveUser` |
| `UPDATE_NAME` | `update-name` |
| `UPDATE_EXAM_DATE` | `updateTarget` |

### 4.3 Dashboard & General
| Key | Path |
|---|---|
| `DASHBOARD_DATA` / `PTE_CORE_DASHBOARD_DATA` | `get_dashboard_data` |
| `MARK_N_VIDEO_WATCHED` | `mark/viewed` |
| `BOOK_TRAIL_CLASSES` | `btc-submit-data` |
| `SUBMIT_QUERY` | `submit-query` |
| `GET_ALL_BRANCHES` | `getAllBranches` |
| `CONTACT_US` | `post/contact` |
| `CONTACT_DETAILS` | `contact-details` |
| `SET_TIMEZONE` | `setTimezone` |
| `WORD_DEFINITION` | `word/definition` |
| `TEXT_TRANSLATION` | `translate/sentence` |
| `GET_TOKENS` | `getTokens` |
| `CATEGORIES` | `categories` |

### 4.4 Practice — list endpoints (per subcategory id)
| Key | Path |
|---|---|
| `LIST_QUESTION` | `question` |
| `SPEAKING_READ_ALOUD` (1) | `question/1` |
| `SPEAKING_REPEAT_SENTENCE` (2) | `question/2` |
| `SPEAKING_DESCRIBE_IMAGE` (3) | `question/3` |
| `SPEAKING_RETELL_LECTURE` (4) | `question/4` |
| `SPEAKING_ANSWER_SHORT_QUESTION` (5) | `question/5` |
| `WRITING_SUMMERISE_TEXT` (6) | `question/6` |
| `WRITING_ESSAY` (7) | `question/7` |
| `READING_MULTIPLE_SINGLE_ANSWER` (8) | `question/8` |
| `READING_MULTIPLE_MULTIPLE_ANSWER` (9) | `question/9` |
| `READING_REORDER_PARAGRAPH` (10) | `question/10` |
| `READING_FILL_BLANK` (11) | `question/11` |
| `READING_WRITING_FILL_BLANK` (12) | `question/12` |
| `LISTENING_SUMMARISE_SPOKEN_TEXT` (13) | `question/13` |
| `LISTENING_MCQ_SINGLE_ANSWER` (14) | `question14` ⚠️ no slash — backend quirk |
| `LISTENING_MCQ_MULTIPLE_ANSWER` (15) | `question/15` |
| `LISTENING_FILL_BLANK` (16) | `question/16` |
| `LISTENING_HIGHLIGHTING_SUMMARIES` (17) | `question/17` |
| `LISTENING_MISSING_WORDS` (18) | `question/18` |
| `LISTENING_INCORRECT_WORDS` (19) | `question/19` |
| `LISTENING_FROM_DICTATION` (20) | `question/20` |
| `EXAM_QUESTIONS` | `question/1?type=3` |
| `MONTHLY_PREDICTION` | `question/1?type=2` |
| `PRACTICE_DETAIL` | `practiceDetail` |
| `SINGLE_PRACTICE_DETAIL` | `single/practiceDetail` |
| `PREDICTION_DATA` | `prediction/list` |
| `PREDICTION_COUNT` | `/prediction/count` |
| `TEMPLATE_DATA` | `template/list?skip=` |
| `HELP_DATA` | `template/listNew?skip=0&type=1` |

### 4.5 Practice — submit / tag / report
| Key | Path |
|---|---|
| `SUBMIT_ANSWER` | `check/answer2` |
| `PTE_CORE_SUBMIT_ANSWER` | `submit/practice` |
| `SUBMIT_EXPLANATION` | `submit-explanation` |
| `SET_TAG` | `set/tag` |
| `SUBMIT_FEEDBACK` | `feedback/app` |
| `REPORT` / `REPORT_QUESTION` | `report/question` |
| `ADD_NOTES` | `add/note` |
| `SHOW_NOTES` | `show/notes` |
| `DELETE_NOTE` | `delete/note` |
| `DELETE_ME` | `delete/question/responseNew` |
| `SHOW_HISTORY` | `show/history` |
| `SHOW_COMMENT` | `show/comment` |
| `ADD_COMMENT` | `add/question/comment` |
| `DELETE_COMMENT` | `delete/question/comment` |

### 4.6 Mock Tests
| Key | Path |
|---|---|
| `MOCK_TEST_LIST` | `web/mock1?new_format=0` |
| `EXTENSIVE_MOCK_TEST_LIST` | `web/mock1?new_format=1` |
| `PENDING_TEST_LIST` | `pending/mock?new_format=0` |
| `EXTENSIVE_PENDING_TEST_LIST` | `pending/mock?new_format=1` |
| `MOCK_TEST_DETAIL` | `question/detail` |
| `SUBMIT_MOCK` | `submit/mock` |
| `REMAINING_MOCK` | `set/mockTime` |
| `SUBMIT_FAILED_MOCK` | `submitFailed/mock` |
| `MOCK_RESULT` | `mock/result?new_format=0` |
| `EXTENSIVE_MOCK_RESULT` | `mock/result?new_format=1` |
| `MOCK_SCORE` | `mock/score/` |
| `MOCK_ANALYSIS` / `MOCK_TUTOR_FEEDBACK` / `MOCK_VIEW_FEEDBACK` | `mock/resultDetail/` |
| `DAILY_REPORT` | `mock/daily-report` |
| `TESTED_EXAM` | `tested/exam` |
| `PROGRESS_TRACKER` / `PROGRESS_DETAIL` | `progress` |

### 4.7 Notifications
| Key | Path |
|---|---|
| `GET_NOTIFICATIONS` | `getNotifications` |
| `MARK_AS_READ` | `markNotificationAsRead` |
| `DELETE_NOTIFICATION` | `markNotificationAsRead` (intentional reuse) |

### 4.8 Videos & Sessions
| Key | Path |
|---|---|
| `PTE_VIDEOS` | `get-stgy-videos` |
| `LIVE_SESSIONS` | `get/session-wl` |
| `PTE_CORE_LIVE_SESSIONS` | `get/session` |
| `SAVE_TASK` | `save-task` |
| `GET_TASKS` | `get-task` |

### 4.9 Subscription / Payments
| Key | Path |
|---|---|
| `GET_PACKAGES` | `getPackages` |
| `CANCEL_SUBSCRIPTION` | `cancel-subscription` |
| `PAYMENT_STATUS` | `process/in-app/payment` |
| `VERIFY_IOS_IAP` | `process/ios/in-app/payment` |

---

## 5. Response Quirks (handled by interceptors)

| Status | Behavior |
|---|---|
| `207 Multi-Status` | Normalized to `200`; `response.data._is_restricted = true` |
| `401` (with Bearer) | Triggers `handleSessionExpired()` → wipes keys + `resetToSignIn()` |
| `401` (no Bearer) | Treated as a normal error (e.g., wrong credentials on login) |
| Network Error / "API blocked..." | Treated as transient by `DashboardDataContext` (silent + cache fallback) |

Backends sometimes wrap real payloads under `original`. Auth services already unwrap: `const data = response.data?.original || response.data`.

---

## 6. Variant-Aware Key Resolution

If `isPteCore()` returns true:
- `resolvePath('SOME_KEY')` first checks `URLS['pte_core_SOME_KEY']`, then `URLS['PTE_CORE_SOME_KEY']`, finally `URLS['SOME_KEY']`.
- This means you can override any ACADEMY endpoint for PTE Core by adding a `pte_core_<KEY>` or `PTE_CORE_<KEY>` entry in `URLS.ts`.

Examples already in the codebase:
- `DASHBOARD_DATA` ↔ `PTE_CORE_DASHBOARD_DATA` (both point to `get_dashboard_data` but kept separate for future divergence).
- `LIVE_SESSIONS` (`get/session-wl`) vs `PTE_CORE_LIVE_SESSIONS` (`get/session`).
- `SUBMIT_ANSWER` (`check/answer2`) vs `PTE_CORE_SUBMIT_ANSWER` (`submit/practice`) — call the right one based on `isPteCore()`.

---

## 7. Endpoints with Hard-coded Variant Logic (callers must branch)

| Caller | Decision |
|---|---|
| Practice submit | `apiClient.post(isPteCore() ? API_ENDPOINTS.PTE_CORE_SUBMIT_ANSWER : API_ENDPOINTS.SUBMIT_ANSWER, ...)` |
| Live sessions list | `apiClient.get(isPteCore() ? API_ENDPOINTS.PTE_CORE_LIVE_SESSIONS : API_ENDPOINTS.LIVE_SESSIONS)` |
| IAP verify | iOS uses `VERIFY_IOS_IAP`; Android uses `PAYMENT_STATUS` (see `useIap.ts`) |

---

## 8. Common Request Patterns

```ts
// Authenticated GET with timeout override
await apiClient.get(API_ENDPOINTS.DASHBOARD_DATA, { timeout: 15000 });

// Multipart form for profile image upload
const fd = new FormData();
fd.append('first_name', 'Jane');
fd.append('image', { uri, name: 'profile.jpg', type: 'image/jpeg' } as any);
await apiClient.post(API_ENDPOINTS.USER_PROFILE_UPDATE, fd);

// Pre-suppressing further requests during manual logout
import { startManualLogout, resetLogoutSuppression } from '../services/apiClient';
startManualLogout();
await Promise.all([removeItem('user_token'), removeItem('user_data')]);
navigationRef.reset({ index: 0, routes: [{ name: 'SignIn' }] });
setTimeout(() => resetLogoutSuppression(), 1500);
```

---

## 9. Where Endpoints Are Used (quick map)

| Endpoint | Caller |
|---|---|
| `SIGN_IN` / `SIGN_UP` / `FORGOTPASSWORD` / `RESET_FORGOTPASSWORD` / `SEND_SIGN_UP` / `REQUEST_OTP` | `screens/Onboarding/*` |
| `GOOGLE_LOGIN` / `APPLE_LOGIN` | `services/socialAuthService.ts` |
| `USER_PROFILE` / `USER_PROFILE_UPDATE` / `UPDATE_NAME` / `UPDATE_EXAM_DATE` | `context/UserContext.tsx`, `screens/Profile/*` |
| `DASHBOARD_DATA` / `GET_NOTIFICATIONS` / `ONBOARDING` / `SET_TIMEZONE` / `DEVICE_TOKEN` | `context/DashboardDataContext.tsx` |
| `LIST_QUESTION` / `question/<id>` / `PRACTICE_DETAIL` | `screens/Practice/*` |
| `SUBMIT_ANSWER` / `PTE_CORE_SUBMIT_ANSWER` / `SET_TAG` / `REPORT_QUESTION` | `screens/Practice/PracticeQuestionDetailScreen.tsx` |
| `MOCK_*` | `screens/MockTest/MockTestScreen.tsx` |
| `PTE_VIDEOS` | `screens/Videos/VideosScreen.tsx` |
| `LIVE_SESSIONS` / `PTE_CORE_LIVE_SESSIONS` | `screens/LiveSessions/LiveSessionsScreen.tsx` |
| `GET_PACKAGES` | `hooks/useSubscriptionPackages.ts`, `screens/Profile/SubscriptionScreen.tsx` |
| `PAYMENT_STATUS` / `VERIFY_IOS_IAP` | `hooks/useIap.ts` |
| `TEMPLATE_DATA` / `HELP_DATA` | `screens/Menu/PdfListScreen.tsx` |
| `DAILY_REPORT` | `screens/DailyFeedback/*` |
| `PREDICTION_DATA` / `PREDICTION_COUNT` / `MONTHLY_PREDICTION` | `screens/MonthlyPrediction/MonthlyPredictionScreen.tsx` |
| `TEXT_TRANSLATION` | Practice "Translate" panel in `PracticeQuestionDetailScreen` |
