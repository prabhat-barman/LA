# LA (Language Academy) PTE Prep Mobile Application Index

This index serves as a quick reference guide to understand the codebase structure, key components, configuration, and navigation flow of the LA React Native project. Use this file to navigate the codebase without having to scan the entire project structure repeatedly.

---

## 📂 Project Directory Structure

```text
LA/
├── index.js                     # Native entry point
├── App.tsx                      # Main application root and provider setup
├── package.json                 # Project dependencies, scripts, and details
├── tsconfig.json                # TypeScript configurations
├── metro.config.js              # Metro bundler config
├── scripts/                     # Utility scripts (e.g., mac-clean.sh)
├── android/                     # Android native project files
├── ios/                         # iOS native project files
└── src/                         # Application source code
    ├── assets/                  # Images, fonts, and local media resources
    ├── components/              # UI components structured by complexity
    │   ├── atoms/               # Smallest building blocks (Button, Icon, Skeletons)
    │   ├── molecules/           # Composite UI components (DatePickerModal, PasswordChecklist)
    │   ├── organisms/           # High-level components (Header, ErrorBoundary)
    │   ├── templates/           # Layout structures (AuthTemplate)
    │   └── practiceMedia/       # Components specifically for speaking/audio practice
    ├── config/                  # Environment and system configuration
    ├── context/                 # Global state management using React Context
    ├── hooks/                   # Custom hooks (IAP, audio player, voice recorder)
    ├── navigation/              # React Navigation navigators and structure
    ├── screens/                 # Screen components grouped by features
    ├── services/                # API client, storage, and utility services
    ├── theme/                   # Style definitions, theme tokens, and typography
    ├── types/                   # TypeScript definitions
    └── utils/                   # Shared utility helper files
```

---

## 🚀 Core Entry Points

*   **[index.js](file:///Users/prabhatbarman/Desktop/LA/index.js)**: Registers the core `App` component with React Native's `AppRegistry`.
*   **[App.tsx](file:///Users/prabhatbarman/Desktop/LA/App.tsx)**: Wraps the app in global context providers (`SafeAreaProvider`, `ErrorBoundary`, `ToastProvider`, `UserProvider`, `DashboardDataProvider`) and initializes Google Sign-In and native splash screen hiding.

---

## ⚙️ Configuration Files (`src/config/`)

This directory holds the essential setup, endpoints, and environment configurations:

*   **[Config.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/Config.ts)**: Configures backend environments (Production = 1, UAT = 2, Staging = 3), base URLs, YouTube API client IDs, and toggles Maintenance Mode.
*   **[URLS.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/URLS.ts)**: Central registry mapping API query endpoints for all modules (Authentication, Profile, Dashboard, Practice Category specific keys, Mock tests, and Billing).
*   **[apiConfig.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/apiConfig.ts)**: Implements a JS Proxy (`API_ENDPOINTS`) that dynamically builds URLs using endpoints listed in `URLS.ts` and standard variants.
*   **[appVariantConfig.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/appVariantConfig.ts)**: Distinguishes between target variants, particularly `ACADEMY` and `PTE_CORE` formats, matching corresponding base endpoints and media paths.
*   **[practiceData.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/practiceData.ts)**: Houses constant meta arrays and definitions detailing question difficulties, types, and groupings.
*   **[subcategoryConfig.ts](file:///Users/prabhatbarman/Desktop/LA/src/config/subcategoryConfig.ts)**: Maps specific categories (e.g., Read Aloud, MCQ, etc.) to IDs.

---

## 🗺️ Navigation & Routing (`src/navigation/`)

Navigation routes are structured using `@react-navigation/native-stack` and `@react-navigation/bottom-tabs`:

*   **[AppNavigator.tsx](file:///Users/prabhatbarman/Desktop/LA/src/navigation/AppNavigator.tsx)**: Registers the complete screen hierarchy (`RootStackParamList`), including onboarding screens (`Splash`, `SignIn`, `SignUp`, `OTP`, `NewPassword`, `ForgotPassword`), Dashboard, details, supports, policies, and supporting practice views.
*   **[DashboardTabNavigator.tsx](file:///Users/prabhatbarman/Desktop/LA/src/navigation/DashboardTabNavigator.tsx)**: Builds a custom bottom navigation bar (`Home`, `Practice`, `Mock`, `Videos`, `Menu`) containing custom spring and collapse animations.

---

## 🧠 State Providers & Context (`src/context/`)

*   **[UserContext.tsx](file:///Users/prabhatbarman/Desktop/LA/src/context/UserContext.tsx)**: Manages authentication profiles, details updates, profile picture uploads via `FormData`, secure local caching (`user_data`), and syncs user exam dates.
*   **[DashboardDataContext.tsx](file:///Users/prabhatbarman/Desktop/LA/src/context/DashboardDataContext.tsx)**: Handles dashboard payload indexing, pull-to-refresh routines, predicted score breakdowns, and notifications check flags.
*   **[ToastContext.tsx](file:///Users/prabhatbarman/Desktop/LA/src/context/ToastContext.tsx)**: Simple custom implementation of status alerts and notifications across modules.

---

## 📺 Feature Screens (`src/screens/`)

1.  **Onboarding & Auth**:
    *   `Splash/`: Entry screen executing redirection checks based on token status.
    *   `Onboarding/OnboardingScreen.tsx`: Walkthrough introduction.
    *   `SignInScreen.tsx` / `SignUpScreen.tsx`: Standard credentials collection and verification.
    *   `OTPScreen.tsx` / `NewPasswordScreen.tsx` / `ForgotPasswordScreen.tsx`: Verification and recovery hooks.
2.  **Dashboard**:
    *   `Dashboard/DashboardScreen.tsx`: Displays personalized greetings, exam countdowns, quick stats grids, upcoming classes, circular AI predicted progress charts, and tutorial tab views.
3.  **Practice**:
    *   `Practice/PracticeScreen.tsx`: Standard index screen to choose categories (Speaking, Writing, Reading, Listening).
    *   `PracticeCommonListScreen.tsx`: Subcategories listing containing search filters, category tags, difficulty selectors, and pagination.
    *   `PracticeQuestionDetailScreen.tsx`: Detailed question panels containing timers, interactive prompts, question-specific configurations, audio/recording status managers, and submission hooks.
4.  **Mock Tests**:
    *   `MockTest/MockTestScreen.tsx`: Panel for mock exam configurations, package purchases, and results reviews.
5.  **Videos**:
    *   `Videos/VideosScreen.tsx` & `SmartVideoPlayer.tsx`: YouTube embed playback controllers, category switchers, and watched state indicators.
6.  **Menu & Supports**:
    *   `Menu/MenuScreen.tsx`: Direct index links targeting auxiliary components.
    *   `PdfListScreen.tsx`: Handles document list retrieval and native web rendering checks.
    *   `Profile/`: Personal details, security, notifications listings, billing packages, and support ticket submissions.

---

## 🛠️ API & Network Layer (`src/services/`)

*   **[apiClient.ts](file:///Users/prabhatbarman/Desktop/LA/src/services/apiClient.ts)**: Sets up an Axios instance configured with generic headers, automatic bearer authentication insertion, token expiration listeners, and global interceptors.
*   **[apiBuilder.ts](file:///Users/prabhatbarman/Desktop/LA/src/services/apiBuilder.ts)**: Resolves paths according to active variants (PTE Academic vs PTE Core).
*   **[socialAuthService.ts](file:///Users/prabhatbarman/Desktop/LA/src/services/socialAuthService.ts)**: Wrapper class managing integration protocols for Google Sign-in.
*   **[navigationService.ts](file:///Users/prabhatbarman/Desktop/LA/src/services/navigationService.ts)**: Provides a references ref mapping method to trigger routes outside UI contexts (e.g., inside APIs).

---

## 🎵 Practice Media, Audio, & Audio Recording (`src/hooks/practiceMedia/` & `src/components/practiceMedia/`)

For speaking practice, specific custom hooks coordinate the sound and mic workflows:

*   **[soundCoordinator.ts](file:///Users/prabhatbarman/Desktop/LA/src/hooks/practiceMedia/soundCoordinator.ts)**: Integrates audio playback and recording layers to ensure only one runs at a time and tracks active audio states.
*   **[useVoiceRecorder.ts](file:///Users/prabhatbarman/Desktop/LA/src/hooks/practiceMedia/useVoiceRecorder.ts)**: Manages recording states, waveforms, and file paths.
*   **[useAudioPlayer.ts](file:///Users/prabhatbarman/Desktop/LA/src/hooks/practiceMedia/useAudioPlayer.ts)**: Tracks progress, controls playback speed, and monitors play stats.
*   **[useQuestionMediaFlow.ts](file:///Users/prabhatbarman/Desktop/LA/src/hooks/practiceMedia/useQuestionMediaFlow.ts)**: Combines timers, recording buffers, and players into a unified sequence.
*   **practiceMedia UI Components**:
    *   `RecordingPanel.tsx` / `ReviewPanel.tsx`: Interactive recording controls, playback sliders, waveform visualizations, and submission status.
    *   `PrepTimerCard.tsx` / `AudioStatusCard.tsx` / `WaveformBar.tsx`: Media status info and dynamic waveforms.
