import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '../services/navigationService';

// --- Cold-start path: imported eagerly so the splash → auth → dashboard
// transition isn't gated on additional require() work. ---
import SplashScreen from '../screens/Splash';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import SignInScreen from '../screens/Onboarding/SignInScreen';
import SignUpScreen from '../screens/Onboarding/SignUpScreen';
import OTPScreen from '../screens/Onboarding/OTPScreen';
import NewPasswordScreen from '../screens/Onboarding/NewPasswordScreen';
import ForgotPasswordScreen from '../screens/Onboarding/ForgotPasswordScreen';
import { DashboardTabNavigator } from './DashboardTabNavigator';

// --- Maintenance check ---
import Config from '../config/Config';
import { MaintenanceScreen } from '../screens/Maintenance/MaintenanceScreen';

// All other screens are loaded lazily through React Navigation's
// `getComponent` so their bundles don't ship until first navigation.
// This shrinks the initial JS evaluation cost on cold start and also
// keeps unused-screen modules out of the working set.

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  OTP: { email: string; flow?: 'forgotPassword' | 'changePassword' } | undefined;
  NewPassword:
    | { email: string; flow?: 'forgotPassword' | 'changePassword'; otp?: string }
    | undefined;
  ForgotPassword: undefined;
  Dashboard: undefined;
  Profile: undefined;
  PersonalInfo: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Subscription: undefined;
  NotificationSettings: undefined;
  ContactSupport: undefined;
  LegalSupport: undefined;
  TermsConditions: undefined;
  PrivacyPolicy: undefined;
  RefundPolicy: undefined;
  FAQ: undefined;
  NotificationsList: undefined;
  PracticeCommonList: {
    categoryId: number;
    categoryName: string;
    parentCategory: string;
  };
  PracticeQuestionDetail: {
    questionId: number | string;
    categoryId: number;
    categoryName: string;
    parentCategory: string;
    questionsList: { id: number | string; title: string; difficulty: string; isNew: boolean }[];
    initialIndex: number;
  };
  PdfList: {
    title: string;
    endpoint: string;
    pdfBasePath?: string;
  };
  MicrophoneSetup: undefined;
  LiveSessions: undefined;
  AudioModuleDemo: undefined;
  MonthlyPrediction: undefined;
  DailyFeedback: undefined;
  DailyFeedbackDetail: {
    itemId: string | number;
    title?: string;
    category?: string;
    raw?: any;
    questionTypeId?: number;
    scoreBreakdown?: Record<string, number>;
    remarks?: any[];
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  if (Config.MAINTENANCE_MODE) {
    return <MaintenanceScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Dashboard" component={DashboardTabNavigator} />

        {/* Profile and settings screens — lazy-loaded on first navigation */}
        <Stack.Screen
          name="Profile"
          getComponent={() =>
            require('../screens/Profile/ProfileScreen').ProfileScreen
          }
        />
        <Stack.Screen
          name="PersonalInfo"
          getComponent={() =>
            require('../screens/Profile/PersonalInfoScreen').PersonalInfoScreen
          }
        />
        <Stack.Screen
          name="EditProfile"
          getComponent={() =>
            require('../screens/Profile/EditProfile').EditProfileScreen
          }
        />
        <Stack.Screen
          name="ChangePassword"
          getComponent={() =>
            require('../screens/Profile/ChangePasswordScreen')
              .ChangePasswordScreen
          }
        />
        <Stack.Screen
          name="Subscription"
          getComponent={() =>
            require('../screens/Profile/SubscriptionScreen').SubscriptionScreen
          }
        />
        <Stack.Screen
          name="NotificationSettings"
          getComponent={() =>
            require('../screens/Profile/NotificationSettingsScreen')
              .NotificationSettingsScreen
          }
        />
        <Stack.Screen
          name="ContactSupport"
          getComponent={() =>
            require('../screens/Profile/ContactSupportScreen')
              .ContactSupportScreen
          }
        />
        <Stack.Screen
          name="LegalSupport"
          getComponent={() =>
            require('../screens/Profile/LegalSupportScreen').LegalSupportScreen
          }
        />
        <Stack.Screen
          name="TermsConditions"
          getComponent={() =>
            require('../screens/Profile/TermsConditionsScreen')
              .TermsConditionsScreen
          }
        />
        <Stack.Screen
          name="PrivacyPolicy"
          getComponent={() =>
            require('../screens/Profile/PrivacyPolicyScreen')
              .PrivacyPolicyScreen
          }
        />
        <Stack.Screen
          name="RefundPolicy"
          getComponent={() =>
            require('../screens/Profile/RefundPolicyScreen').RefundPolicyScreen
          }
        />
        <Stack.Screen
          name="FAQ"
          getComponent={() => require('../screens/Profile/FAQScreen').FAQScreen}
        />
        <Stack.Screen
          name="NotificationsList"
          getComponent={() =>
            require('../screens/Profile/NotificationsListScreen')
              .NotificationsListScreen
          }
        />
        <Stack.Screen
          name="PracticeCommonList"
          getComponent={() =>
            require('../screens/Practice/PracticeCommonList')
              .PracticeCommonListScreen
          }
        />
        <Stack.Screen
          name="PracticeQuestionDetail"
          getComponent={() =>
            require('../screens/Practice/PracticeQuestionDetail')
              .PracticeQuestionDetailScreen
          }
        />
        <Stack.Screen
          name="PdfList"
          getComponent={() =>
            require('../screens/Menu/PdfListScreen').PdfListScreen
          }
        />
        <Stack.Screen
          name="MicrophoneSetup"
          getComponent={() =>
            require('../screens/Microphone/MicrophoneSetup').MicrophoneSetupScreen
          }
        />
        <Stack.Screen
          name="LiveSessions"
          getComponent={() =>
            require('../screens/LiveSessions/LiveSessionsScreen')
              .LiveSessionsScreen
          }
        />
        <Stack.Screen
          name="AudioModuleDemo"
          getComponent={() => require('../modules/audio').AudioModuleScreen}
        />
        <Stack.Screen
          name="MonthlyPrediction"
          getComponent={() =>
            require('../screens/MonthlyPrediction/MonthlyPredictionScreen')
              .MonthlyPredictionScreen
          }
        />
        <Stack.Screen
          name="DailyFeedback"
          getComponent={() =>
            require('../screens/DailyFeedback/DailyFeedbackListScreen')
              .DailyFeedbackListScreen
          }
        />
        <Stack.Screen
          name="DailyFeedbackDetail"
          getComponent={() =>
            require('../screens/DailyFeedback/DailyFeedbackDetailScreen')
              .DailyFeedbackDetailScreen
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
