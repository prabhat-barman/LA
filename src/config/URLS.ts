import { BASE_URL } from "./Config";

// ─── URL catalogue ──────────────────────────────────────────────────────────
//
// This file is the single source of truth for every backend path the
// React Native app talks to. Resolution happens via the Proxy in
// `apiConfig.ts` (`API_ENDPOINTS.<KEY>` → `buildUrl(KEY)` →
// `resolvePath(KEY)` → `URLS[KEY]` prefixed with the active base URL).
//
// Inline status annotations help spot dead weight during refactors:
//
//   USED      — referenced via `API_ENDPOINTS.<KEY>` somewhere in src/
//   PTE-CORE  — auto-picked by `resolvePath()` for the PTE Core
//               variant when its non-prefixed sibling is accessed
//   UNUSED    — defined here but never referenced; safe to delete
//               once we're sure no native module reads it
//   FUTURE    — feature isn't built yet but the endpoint is reserved
//
// When you wire a new feature, please update the annotation on the key
// you start using so this stays accurate.
//
// Audit summary (last updated Jun 2026):
//   65 USED · 3 PTE-CORE · 8 UNUSED   (total: 76)
//   — 22 per-question-type constants removed (replaced by dynamic
//     `LIST_QUESTION/{categoryId}` calls)
//   — REMAINING_MOCK + SUBMIT_FAILED_MOCK wired into MockTestRunner
//     for legacy 4-API parity (bulk-skip + final close signal)
//   — 7 exact-URL duplicates removed (GOOGLE_SOCIAL_LOGIN,
//     APPLE_SOCIAL_LOGIN, MOCK_TUTOR_FEEDBACK, MOCK_VIEW_FEEDBACK,
//     REPORT_QUESTION, PROGRESS_DETAIL, DELETE_NOTIFICATION)
//   — Legacy-parity round: PREDICTION_COUNT, TESTED_EXAM,
//     SUBMIT_QUERY, CANCEL_SUBSCRIPTION dropped (dead in old project
//     too); DEVICE_TOKEN_USER / GET_ALL_BRANCHES / PRACTICE_DETAIL /
//     SUBMIT_EXPLANATION / WORD_DEFINITION wired into real screens
//
// ────────────────────────────────────────────────────────────────────────────

const URLS: Record<string, string> = {
  // ── Auth / Onboarding ──────────────────────────────────────────────────
  REQUEST_OTP: "requestotp",                       // USED — OTP / Change-password
  PAYMENT_STATUS: "process/in-app/payment",        // USED — IAP (Android)
  VERIFY_IOS_IAP: "process/ios/in-app/payment",    // USED — IAP (iOS)
  SIGN_IN: "login",                                // USED — SignInScreen
  LOGOUT: "logout",                                // USED — ProfileScreen
  SIGN_UP: "app/signup",                           // USED — SignUpScreen
  SEND_SIGN_UP: "app/send/otp",                    // USED — SignUpScreen
  VERIFY_EMAIL_PHONE: "user-validation",           // USED — OTPScreen
  FORGOTPASSWORD: "forgot",                        // USED — ForgotPasswordScreen
  RESET_FORGOTPASSWORD: "reset-password",          // USED — NewPasswordScreen
  DEVICE_TOKEN: "deviceToken",                     // USED — DashboardDataContext / ProfileScreen
  DEVICE_TOKEN_USER: "deviceToken/user",           // USED — notificationService (PUT fcm_token)
  GOOGLE_LOGIN: "googleSignUp",                    // USED — socialAuthService
  APPLE_LOGIN: "appleSignUp",                      // USED — socialAuthService
  ONBOARDING: "onboarding",                        // USED — DashboardDataContext
  SET_TIMEZONE: "setTimezone",                     // USED — DashboardDataContext

  // ── Mock tests ─────────────────────────────────────────────────────────
  MOCK_TEST_LIST: "web/mock1?new_format=0",                  // USED — MockTestScreen
  EXTENSIVE_MOCK_TEST_LIST: "web/mock1?new_format=1",        // USED — MockTestScreen
  MOCK_TEST_DETAIL: "question/detail",                       // USED — useMockSession
  PENDING_TEST_LIST: "pending/mock?new_format=0",            // USED — usePendingMocks
  EXTENSIVE_PENDING_TEST_LIST: "pending/mock?new_format=1",  // USED — usePendingMocks
  SUBMIT_MOCK: "submit/mock",                                // USED — useSubmitQueue / useRecoveryMocks
  REMAINING_MOCK: "set/mockTime",                            // USED — MockTestRunner bulk-skip on section boundary / timeout (legacy `submitRemainingQuesAPI`)
  SUBMIT_FAILED_MOCK: "submitFailed/mock",                   // USED — MockTestRunner final close signal after queue flush (legacy `submitFailedMockAPI`)
  MOCK_RESULT: "mock/result?new_format=0",                   // USED — usePastMocks
  EXTENSIVE_MOCK_RESULT: "mock/result?new_format=1",         // USED — usePastMocks
  MOCK_SCORE: "mock/score/",                                 // USED — useMockResult
  MOCK_ANALYSIS: "mock/resultDetail/",                       // USED — useMockAnalysis

  // ── User profile ───────────────────────────────────────────────────────
  USER_PROFILE: "user-my-profile",                 // USED — UserContext
  USER_PROFILE_DELETE: "user/delete",              // USED — ProfileScreen
  USER_PROFILE_UPDATE: "saveUser",                 // USED — UserContext
  UPDATE_NAME: "update-name",                      // USED — UserContext / socialAuthService
  UPDATE_EXAM_DATE: "updateTarget",                // USED — UserContext
  CHANGE_PASSWORD: "changePassword",               // USED — NewPasswordScreen
  SEND_UPDATE_EMAIL_OTP: `${BASE_URL}/send-update-email-otp`, // USED — useEditProfileForm
  UPDATE_USER_EMAIL: `${BASE_URL}/update-user-email`,         // USED — useEditProfileForm

  // ── Dashboard ──────────────────────────────────────────────────────────
  DASHBOARD_DATA: "get_dashboard_data",            // USED — DashboardDataContext
  PTE_CORE_DASHBOARD_DATA: "get_dashboard_data",   // PTE-CORE — auto-resolved variant
  MARK_N_VIDEO_WATCHED: "mark/viewed",             // USED — Dashboard / Videos
  BOOK_TRAIL_CLASSES: "btc-submit-data",           // USED — LiveSessionsScreen

  // ── Practice catalog & questions ───────────────────────────────────────
  LIST_QUESTION: "question",                       // USED — PracticeCommonList / PracticeQuestionDetail
  CATEGORIES: "categories",                        // USED — PracticeScreen / PracticeCommonList / MonthlyPrediction / ProgressTracker
  GET_TOKENS: "getTokens",                         // USED — PracticeScreen
  SUBMIT_ANSWER: "check/answer2",                  // USED — PracticeQuestionDetail
  PTE_CORE_SUBMIT_ANSWER: "submit/practice",       // USED — PracticeQuestionDetail (direct, not via resolver)
  SET_TAG: "set/tag",                              // USED — PracticeQuestionDetail / PracticeCommonList / DailyFeedback
  PRACTICE_DETAIL: "practiceDetail",               // USED — PracticeHistoryCalendarScreen (per-date question detail)
  SINGLE_PRACTICE_DETAIL: "single/practiceDetail", // USED — DailyFeedbackDetailScreen
  SHOW_HISTORY: "show/history",                    // USED — PracticeQuestionDetail
  TEXT_TRANSLATION: "translate/sentence",          // USED — PracticeQuestionDetail
  REPORT: "report/question",                       // USED — PracticeQuestionDetail

  // ── Per-question-type endpoints (deleted) ──────────────────────────────
  // The 20 SPEAKING_* / WRITING_* / READING_* / LISTENING_* constants plus
  // EXAM_QUESTIONS / MONTHLY_PREDICTION were just `question/<id>` strings.
  // They've been removed in favour of the existing dynamic pattern used
  // everywhere in code:
  //
  //   `${API_ENDPOINTS.LIST_QUESTION}/${categoryId}`
  //   `${API_ENDPOINTS.LIST_QUESTION}/${categoryId}?type=${type}`
  //
  // Backend question-type id mapping for reference:
  //   1  Read Aloud                  11 Reading Fill in the Blanks
  //   2  Repeat Sentence             12 R&W Fill in the Blanks
  //   3  Describe Image              13 Summarise Spoken Text
  //   4  Re-tell Lecture             14 Listening MCQ Single
  //   5  Answer Short Question       15 Listening MCQ Multiple
  //   6  Summarise Written Text      16 Listening Fill in the Blanks
  //   7  Write Essay                 17 Highlight Correct Summary
  //   8  Reading MCQ Single          18 Select Missing Word
  //   9  Reading MCQ Multiple        19 Highlight Incorrect Words
  //   10 Re-order Paragraphs         20 Write From Dictation

  // ── Progress ───────────────────────────────────────────────────────────
  PROGRESS_TRACKER: "progress",                    // USED — useProgressData (`progress/{skillId}?mock=0`)
  DAILY_REPORT: "mock/daily-report",               // USED — DailyFeedbackListScreen / useDailyGoals / PracticeHistoryCalendar

  // ── Videos / Templates / Predictions ───────────────────────────────────
  PTE_VIDEOS: "get-stgy-videos",                   // USED — useStrategyVideos
  PREDICTION_DATA: "prediction/list",              // USED — MenuScreen
  TEMPLATE_DATA: "template/list?skip=",            // USED — MenuScreen
  HELP_DATA: "template/listNew?skip=0&type=1",     // USED — MenuScreen
  SUBMIT_EXPLANATION: "submit-explanation",        // USED — useSubmitExplanation (Practice post-submit AI explanation)

  // ── Notifications ──────────────────────────────────────────────────────
  GET_NOTIFICATIONS: "getNotifications",           // USED — NotificationsListScreen / DashboardDataContext
  MARK_AS_READ: "markNotificationAsRead",          // USED — NotificationsListScreen

  // ── Support / Contact ──────────────────────────────────────────────────
  CONTACT_US: "post/contact",                      // USED — ContactSupportScreen
  CONTACT_DETAILS: "contact-details",              // USED — ContactSupportScreen
  GET_ALL_BRANCHES: "getAllBranches",              // USED — BookTrialClassScreen (live branch dropdown)
  SUBMIT_FEEDBACK: "feedback/app",                 // USED — FeedbackModal

  // ── Live sessions / Tasks ──────────────────────────────────────────────
  LIVE_SESSIONS: "get/session-wl",                 // USED — LiveSessionsScreen
  PTE_CORE_LIVE_SESSIONS: "get/session",           // PTE-CORE — auto-resolved variant
  SAVE_TASK: "save-task",                          // USED — useDailyGoals (set targets for date)
  GET_TASKS: "get-task",                           // USED — useDailyGoals (read targets for date)
  // DAILY_REPORT lives above (line ~121) and is shared between
  // DailyFeedbackListScreen + useDailyGoals. Keeping the cross-
  // reference here so future contributors don't add a duplicate.

  // ── Notes (feature not built) ──────────────────────────────────────────
  ADD_NOTES: "add/note",                           // UNUSED — FUTURE
  SHOW_NOTES: "show/notes",                        // UNUSED — FUTURE
  DELETE_NOTE: "delete/note",                      // UNUSED — FUTURE

  // ── Comments (feature not built) ───────────────────────────────────────
  SHOW_COMMENT: "show/comment",                    // UNUSED — FUTURE
  ADD_COMMENT: "add/question/comment",             // UNUSED — FUTURE
  DELETE_COMMENT: "delete/question/comment",       // UNUSED — FUTURE

  // ── Misc unused ────────────────────────────────────────────────────────
  DELETE_ME: "delete/question/responseNew",        // UNUSED — FUTURE (own-response delete; part of Me/Notes/Discussion family)
  WORD_DEFINITION: "word/definition",              // USED — Practice word-select dictionary lookup

  // ── Subscription / Packages ────────────────────────────────────────────
  GET_PACKAGES: "getPackages",                     // USED — useSubscriptionPackages
};

export default URLS;
