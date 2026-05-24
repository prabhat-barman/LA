# COMPONENT_TREE — Screens, Components, Reusables

> Hierarchy of every meaningful file under `src/`. Source LOC counts are indicative (largest = most behavior).

---

## 1. Provider Tree (top level)

```
App
└─ SafeAreaProvider
   └─ ErrorBoundary
      └─ ToastProvider
         └─ UserProvider
            └─ DashboardDataProvider
               └─ RecorderProvider
                  └─ KeyboardAvoidingView
                     └─ AppNavigator (NavigationContainer)
                        └─ <Stack.Navigator initialRoute="Splash">
                           └─ <Stack.Screen ... />   ← see § 2
```

---

## 2. Navigation Tree

### Root Stack (`src/navigation/AppNavigator.tsx`)
```
Splash                    src/screens/Splash/index.tsx
Onboarding                screens/Onboarding/OnboardingScreen.tsx
SignIn                    screens/Onboarding/SignInScreen.tsx
SignUp                    screens/Onboarding/SignUpScreen.tsx
OTP                       screens/Onboarding/OTPScreen.tsx
NewPassword               screens/Onboarding/NewPasswordScreen.tsx
ForgotPassword            screens/Onboarding/ForgotPasswordScreen.tsx
Dashboard                 ▶ DashboardTabNavigator (§ 3)
Profile                   screens/Profile/ProfileScreen.tsx
PersonalInfo              screens/Profile/PersonalInfoScreen.tsx
EditProfile               screens/Profile/EditProfileScreen.tsx        (1066 LOC)
ChangePassword            screens/Profile/ChangePasswordScreen.tsx
Subscription              screens/Profile/SubscriptionScreen.tsx       (874 LOC)
NotificationSettings      screens/Profile/NotificationSettingsScreen.tsx
ContactSupport            screens/Profile/ContactSupportScreen.tsx
LegalSupport              screens/Profile/LegalSupportScreen.tsx
TermsConditions           screens/Profile/TermsConditionsScreen.tsx
PrivacyPolicy             screens/Profile/PrivacyPolicyScreen.tsx
RefundPolicy              screens/Profile/RefundPolicyScreen.tsx
FAQ                       screens/Profile/FAQScreen.tsx
NotificationsList         screens/Profile/NotificationsListScreen.tsx
PracticeCommonList        screens/Practice/PracticeCommonListScreen.tsx (1152 LOC)
PracticeQuestionDetail    screens/Practice/PracticeQuestionDetailScreen.tsx (3697 LOC — biggest file)
PdfList                   screens/Menu/PdfListScreen.tsx
MicrophoneSetup           screens/Microphone/MicrophoneSetupScreen.tsx (977 LOC)
LiveSessions              screens/LiveSessions/LiveSessionsScreen.tsx
AudioModuleDemo           modules/audio/AudioModuleScreen.tsx
MonthlyPrediction         screens/MonthlyPrediction/MonthlyPredictionScreen.tsx
DailyFeedback             screens/DailyFeedback/DailyFeedbackListScreen.tsx
DailyFeedbackDetail       screens/DailyFeedback/DailyFeedbackDetailScreen.tsx
```

### `RootStackParamList` (types live in `AppNavigator.tsx`)
- Authoritative for all route param shapes. Always extend this when adding routes.

---

## 3. Dashboard Tabs (`src/navigation/DashboardTabNavigator.tsx`)

Custom `BottomTabBarProps` renderer with animated pill (JS-driver layout + native-driver opacity).

```
Home      DashboardScreen           screens/Dashboard/DashboardScreen.tsx (1502 LOC — central hub)
Practice  PracticeScreen            screens/Practice/PracticeScreen.tsx
Mock      MockTestScreen            screens/MockTest/MockTestScreen.tsx
Videos    VideosScreen              screens/Videos/VideosScreen.tsx (uses SmartVideoPlayer.tsx)
Menu      MenuScreen                screens/Menu/MenuScreen.tsx
```

Tabs use icon components from `components/atoms/Icon/index.tsx`.

---

## 4. Components — Atomic Design

```
components/
├─ atoms/
│  ├─ Button/
│  │  ├─ Button.tsx          general styled button
│  │  ├─ Button.styles.ts
│  │  ├─ AuthCapsuleButton.tsx   capsule shape used in auth flow
│  │  ├─ AuthCurveButton.tsx     curved variant used on onboarding
│  │  └─ index.tsx
│  ├─ Icon/
│  │  └─ index.tsx           1288 LOC — SVG icon library (Home, Practice, Mock, Video,
│  │                          Menu, ReadAloud, RepeatSentence, DescribeImage,
│  │                          RetellLecture, AnswerShortQuestion, RespondSituation,
│  │                          SummarizeWrittenText, Reading, Listening, ChevronRight,
│  │                          Sparkles, HeaderBook, Translate, MessageBubble,
│  │                          ReportFlag, OpenBook, Play, CaretDown, ... )
│  ├─ Skeleton/
│  │  ├─ Skeleton.tsx                  base shimmer
│  │  ├─ DashboardSkeleton.tsx
│  │  ├─ MockTestSkeleton.tsx
│  │  ├─ MonthlyPredictionSkeleton.tsx
│  │  ├─ PdfListSkeleton.tsx
│  │  ├─ PracticeCommonListSkeleton.tsx
│  │  ├─ PracticeSkeleton.tsx
│  │  ├─ SubscriptionSkeleton.tsx
│  │  ├─ VideosSkeleton.tsx
│  │  ├─ DailyFeedbackListSkeleton.tsx
│  │  └─ index.tsx
│  └─ CircularProgressBar/
│     └─ index.tsx
├─ molecules/
│  ├─ DatePickerModal.tsx     (464 LOC) custom calendar picker
│  ├─ PasswordChecklist.tsx   live password requirements checker
│  └─ SubHeader.tsx           sub-page title row
├─ organisms/
│  ├─ Header/
│  │  ├─ Header.tsx           shared app header w/ back/notif/score
│  │  ├─ Header.styles.ts
│  │  └─ index.tsx
│  ├─ ErrorBoundary.tsx       root crash UI + Crashlytics
│  └─ LocalErrorBoundary.tsx  per-region wrapper
├─ templates/
│  └─ AuthTemplate/
│     └─ AuthTemplate.tsx     auth screens layout (bg, logo, content slot)
└─ practiceMedia/             SHARED MEDIA UI (uses mediaStyles + scale helper)
   ├─ AudioStatusCard.tsx     AudioPlayingCard / AudioWaitCard / SubmittingCard
   ├─ LiveAudioProgressBar.tsx
   ├─ LiveTimerText.tsx
   ├─ MediaConsole.tsx        FORWARD-REF orchestrator wrapping RecorderContext
   ├─ MediaStatusInline.tsx   compact inline media status row
   ├─ PrepTimerCard.tsx       prep countdown card w/ "Record Now" CTA
   ├─ RecordedPlaybackBar.tsx scrubbable playback bar for captured audio
   ├─ RecordingPanel.tsx      red badge + waveform + Stop
   ├─ ReviewPanel.tsx         playback + retake; uses private useAudioPlayer
   ├─ UnifiedMediaBar.tsx     914 LOC — two-card layout for has-audio+has-recording types
   ├─ WaveformBar.tsx         single animated bar
   ├─ styles.ts               shared mediaStyles + scale()
   └─ index.ts                public exports
```

---

## 5. Hooks

```
hooks/
├─ useIap.ts                  468 LOC — full IAP lifecycle (Android+iOS)
├─ useSubscriptionPackages.ts list packages from backend GET_PACKAGES
└─ practiceMedia/
   ├─ soundCoordinator.ts     module-level singleton ownership over native Sound
   ├─ useAudioPlayer.ts       260 LOC — playback wrapper (acquire/release/preempt + position/duration/progress/rate)
   ├─ useVoiceRecorder.ts     617 LOC — recording wrapper (permission, maxDurationSec,
   │                          onTick, onError codes, lifecycle race guards, amplitude)
   ├─ useQuestionMediaFlow.ts 485 LOC — state machine orchestrator
   └─ index.ts                public exports
```

---

## 6. Contexts

```
context/
├─ ToastContext.tsx           useToast()      — global toast banner
├─ UserContext.tsx            useUser()       — profile + persistence + backend sync
├─ DashboardDataContext.tsx   useDashboardData() — dashboard + notifs + tz/FCM
└─ RecorderContext.tsx        useRecorder()   — media phase machine (see SYSTEM_DESIGN § 7)
```

---

## 7. Services

```
services/
├─ apiClient.ts          axios singleton + interceptors + session expiry
├─ apiBuilder.ts         resolvePath / buildUrl (variant-aware)
├─ socialAuthService.ts  configureGoogleSignIn + signInWithGoogle + signInWithApple
├─ navigationService.ts  navigationRef + resetToSignIn
└─ logger.ts             Crashlytics-safe logger
```

---

## 8. Config

```
config/
├─ Config.ts              ENVIRONMENT + URLs + Google client IDs + maintenance flag
├─ URLS.ts                all endpoint keys → relative paths (see API_MAP.md)
├─ apiConfig.ts           API_ENDPOINTS Proxy (THE export to import)
├─ appVariantConfig.ts    ACADEMY vs PTE_CORE switching helpers + getBaseUrl / getPdfPath
├─ subcategoryConfig.ts   QuestionMetadata + QUESTION_METADATA[] (timings per type)
└─ practiceData.ts        Section lists, speeds, locked IDs (Data export)
```

---

## 9. Utils

```
utils/
├─ secureStorage.ts          AsyncStorage + memory fallback
├─ PermissionHandler.ts      PermissionManager class + useAudioPermissions hook
├─ subscriptionValidator.ts  hasContentTypeAccess(contentType) + persistBackendActiveSubscription
├─ subscriptionMapping.ts    backend sub → tier conversion
├─ subscriptionHelpers.tsx   UI gating helpers
├─ tagColorStore.ts          bookmark/tag pub-sub store (used by PracticeQuestionDetail)
├─ validation.ts             email/password/etc. validators
└─ logger.ts                 re-export shim
```

---

## 10. Theme

```
theme/
├─ colors.ts       brand palette (primary, accent, success, gradients)
├─ fonts.ts        BricolageGrotesque-* + typography presets with Platform fontWeight
├─ spacing.ts      spacing scale
└─ index.ts        aggregated `theme` object + Theme type
```

---

## 11. Standalone Audio Module Demo

`src/modules/audio/` — self-contained playground showcasing the audio primitives. Not part of the user-facing nav flow except through the dev `AudioModuleDemo` route.

```
modules/audio/
├─ AudioModuleScreen.tsx       demo screen
├─ AudioPlayer.tsx
├─ AudioPlaybackBar.tsx
├─ AutoPlayAudioRecorder.tsx
├─ HeadsetCheckPlayer.tsx
├─ MicrophoneCheckPlayer.tsx
├─ AudioStore.ts
├─ WaveformSeekBar.tsx
└─ index.ts
```

---

## 12. Assets

```
src/assets/
├─ images/                local PNG/SVG (logo, welcome, etc.)
├─ font_color_&_family/   font family swatches (design refs)
├─ scale/                 scaling guides
└─ imageUrl.ts            remote image URL constants
```

> Real video/audio files are streamed from the S3 bucket (`mediaUrl` in `Config.ts`).

---

## 13. Where to Add a New Component

| Type | Folder | Notes |
|---|---|---|
| Pure UI atom (button, icon) | `atoms/` | Stateless or self-state only |
| Composite UI (modal, form group) | `molecules/` | Combines atoms |
| Cross-screen widget (header, error boundary) | `organisms/` | May own state |
| Page layout shell (auth template) | `templates/` | Provides slots |
| Media flow widget (waveform, timer card) | `practiceMedia/` | Must use `mediaStyles` |
| Feature screen | `screens/<Feature>/` | Register route in `AppNavigator.tsx` |
| Reusable native-backed hook | `hooks/` (or `hooks/practiceMedia/`) | Pair with a context if multi-consumer |
