# LA App — Complete API & Config Documentation

This document compiles the API endpoints, Redux configurations, environment parameters, and subcategories for reference throughout development.

---

## 1. Config Files Reference

### 1.1 `src/config/Config.js` — Environment switching
The app supports 3 environments based on the `ENVIRONMENT` variable:

| Value | Name | Base URL (ACADEMY) | Base URL (PTE_CORE) |
|---|---|---|---|
| `1` | PRODUCTION | `https://backend22.languageacademy.com.au/api/v1` | `https://pte-core-backend.languageacademy.com.au/api/v1` |
| `2` | UAT | `https://la-uatbe.languageacademy.com.au/api/v1` | `https://lacore-uatbe.languageacademy.com.au/api/v1` |
| `3` | STAGING | `https://la-stagingbe.languageacademy.com.au/api/v1` | `https://lacore-stagingbe.languageacademy.com.au/api/v1` |

### 1.2 `URLS.js` — Endpoint Configuration Mapping
```javascript
const URLS = {
  // Common Keys
  REQUEST_OTP: "requestotp",
  paymentStatus: "process/in-app/payment",
  mockTestList: "web/mock1?new_format=0",
  mockTestDetail: "question/detail",
  extensiveMockTestList: "web/mock1?new_format=1",
  pendingTestList: "pending/mock?new_format=0",
  extensivePendingTestList: "pending/mock?new_format=1",
  SIGN_IN: "login",
  SIGN_UP: "app/signup",
  SEND_SIGN_UP: "app/send/otp",
  VERIFY_EMAIL_PHONE: "user-validation",
  FORGOTPASSWORD: "forgot",
  RESET_FORGOTPASSWORD: "reset-password",
  DEVICE_TOKEN: "deviceToken",
  DEVICE_TOKEN_USER: "deviceToken/user",
  GOOGLE_SOCIAL_LOGIN: "googleSignUp",
  APPLE_SOCIAL_LOGIN: "appleSignUp",
  GOOGLE_LOGIN: "googleSignUp",
  APPLE_LOGIN: "appleSignUp",
  PREDICTION_COUNT: "/prediction/count",

  // user profile
  USER_PROFILE: "user-my-profile",
  USER_PROFILE_DELETE: "user/delete",
  USER_PROFILE_UPDATE: "saveUser",
  CONTACT_US: `${BASE_URL}/post/contact`,
  CONTACT_DETAILS: `${BASE_URL}/contact-details`,

  // dashboard
  DASHBOARD_DATA: "get_dashboard_data",
  pte_core_DASHBOARD_DATA: "get_dashboard_data",

  MARK_N_VIDEO_WATCHED: "mark/viewed",
  UPDATE_EXAM_DATE: "updateTarget",
  BOOK_TRAIL_CLASSES: "btc-submit-data",
  SUBMIT_QUERY: "submit-query",
  GET_ALL_BRANCHES: "getAllBranches",

  //PRACTICE
  LIST_QUESTION: "question",
  SPEAKING_READ_ALOUD: "question/1",
  SPEAKING_REPEAT_SENTENCE: "question/2",
  SPEAKING_DESCRIBE_IMAGE: "question/3",
  SPEAKING_RETELL_LECTURE: "question/4",
  SPEAKING_ANSWER_SHORT_QUESTION: "question/5",
  WRITING_SUMMERISE_TEXT: "question/6",
  WRITING_ESSAY: "question/7",
  READING_MULTIPLE_SINGLE_ANSWER: "question/8",
  READING_MULTIPLE_MULTIPLE_ANSWER: "question/9",
  READING_REORDER_PARAGRAPH: "question/10",
  READING_FILL_BLANK: "question/11",
  READING_WRITING_FILL_BLANK: "question/12",
  LISTENING_SUMMARISE_SPOKEN_TEXT: "question/13",
  LISTENING_MCQ_SINGLE_ANSWER: "question14",
  LISTENING_MCQ_MULTIPLE_ANSWER: "question/15",
  LISTENING_FILL_BLANK: "question/16",
  LISTENING_HIGHLIGHTING_SUMMARIES: "question/17",
  LISTENING_MISSING_WORDS: "question/18",
  LISTENING_INCORRECT_WORDS: "question/19",
  LISTENING_FROM_DICTATION: "question/20",

  EXAM_QUESTIONS: "question/1?type=3",
  MONTHLY_PREDICTION: "question/1?type=2",

  SUBMIT_ANSWER: "check/answer2",
  pte_core_SUBMIT_ANSWER: "submit/practice",

  SUBMIT_EXPLANATION: "submit-explanation",
  SET_TAG: "set/tag",

  SUBMIT_MOCK: "submit/mock",
  REMAINING_MOCK: "set/mockTime",
  SUBMIT_FAILED_MOCK: "submitFailed/mock",

  PTE_VIDEOS: `get-stgy-videos`,
  PREDICTION_DATA: "prediction/list",
  TEMPLATE_DATA: "template/list?skip=",
  submit_feedback: "feedback/app",
  HELP_DATA: "template/listNew?skip=0&type=1",
  REPORT: "report/question",
  PROGRESS_TRACKER: "progress",
  PROGRESS_DETAIL: "progress",
  TESTED_EXAM: "tested/exam",
  MOCK_RESULT: "mock/result?new_format=0",
  EXTENSIVE_MOCK_RESULT: "mock/result?new_format=1",
  MOCK_SCORE: "mock/score/",
  MOCK_ANALYSIS: "mock/resultDetail/",
  MOCK_TUTOR_FEEDBACK: "mock/resultDetail/",
  MOCK_VIEW_FEEDBACK: "mock/resultDetail/",

  ADD_NOTES: "add/note",
  SHOW_NOTES: "show/notes",
  DELETE_NOTE: "delete/note",
  DELETE_ME: "delete/question/responseNew",
  SHOW_HISTORY: "show/history",
  SHOW_COMMENT: "show/comment",
  ADD_COMMENT: "add/question/comment",
  DELETE_COMMENT: "delete/question/comment",

  LIVE_SESSIONS: "get/session-wl",
  pte_core_LIVE_SESSIONS: "get/session",
  SAVE_TASK: "save-task",
  GET_TASKS: "get-task",
  DAILY_REPORT: "mock/daily-report",
  GET_NOTIFICATIONS: "getNotifications",
  MARK_AS_READ: "markNotificationAsRead",
  DELETE_NOTIFICATION: "markNotificationAsRead",
  CATEGORIES: "categories",
  WORD_DEFINITION: "word/definition",
  TEXT_TRANSLATION: "translate/sentence",
  REPORT_QUESTION: "report/question",
  UPDATE_NAME: "update-name",
  CHANGE_PASSWORD: "changePassword",
  SEND_UPDATE_EMAIL_OTP: `${BASE_URL}/send-update-email-otp`,
  UPDATE_USER_EMAIL: `${BASE_URL}/update-user-email`,

  PRACTICE_DETAIL: "practiceDetail",
  SINGLE_PRACTICE_DETAIL: "single/practiceDetail",
  SET_TIMEZONE: "setTimezone",
  ONBOARDING: "onboarding",
};
```

---

## 2. API Proxy and Variant Configurations

### 2.1 `appVariantConfig.js`
Helps resolve base URLs and styles based on the active Redux variant (`"ACADEMY"` or `"PTE_CORE"`):
```javascript
export const isPteCore = () => getCurrentVariant() === "PTE_CORE";
export const getBaseUrl = () => isPteCore() ? Config.PTE_CORE_BASE_URL : Config.BASE_URL;
export const getPdfPath = () => isPteCore() ? Config.pdfPteCorePath : Config.pdfPath;
```

---

## 3. Practice Question Types Static Mapping
Static configuration for timing and behaviors of each subcategory/question type:
```json
[
  {
    "id": 1,
    "type": "Read Aloud",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 35,
    "recordingDuration": 35,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 2,
    "type": "Repeat Sentence",
    "waitTimeBeforeAudio": 3,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 10,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 3,
    "type": "Describe Image",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 25,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 4,
    "type": "Re-tell Lecture",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "pteCoreWaitTimeBeforeRecording": 20,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 5,
    "type": "Answer Short Questions",
    "waitTimeBeforeAudio": 3,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 10,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 6,
    "type": "Summarize Written Text",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 7,
    "type": "Write Essay",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 8,
    "type": "Multiple Type, Single Answer",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 9,
    "type": "Multiple Type, Double Answer",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 10,
    "type": "Reorder Paragraph",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 11,
    "type": "Reading Fill in the Blanks",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 12,
    "type": "Fill in the Blanks (Reading & Writing)",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 13,
    "type": "Summarize Spoken Text",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 14,
    "type": "MCQ Single Answer",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 15,
    "type": "MCQ Multiple Answer",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 16,
    "type": "Listening Fill in the Blanks",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 17,
    "type": "Highlight Correct Summary",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 18,
    "type": "Select Missing Word",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 19,
    "type": "Highlight Incorrect Word",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 20,
    "type": "Write from Dictation",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 21,
    "type": "Respond to a Situation",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "pteCoreWaitTimeBeforeRecording": 20,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 22,
    "type": "Summarize Discussion",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "recordingDuration": 120,
    "nextButtonBehavior": "disable-until-audio-play"
  }
]
```
