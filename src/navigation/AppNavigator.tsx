import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '../services/navigationService';
import SplashScreen from '../screens/Splash';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import SignInScreen from '../screens/Onboarding/SignInScreen';
import SignUpScreen from '../screens/Onboarding/SignUpScreen';

import OTPScreen from '../screens/Onboarding/OTPScreen';
import NewPasswordScreen from '../screens/Onboarding/NewPasswordScreen';
import ForgotPasswordScreen from '../screens/Onboarding/ForgotPasswordScreen';
import { DashboardTabNavigator } from './DashboardTabNavigator';

// Profile, Support, and Settings screen imports
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { PersonalInfoScreen } from '../screens/Profile/PersonalInfoScreen';
import { EditProfileScreen } from '../screens/Profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/Profile/ChangePasswordScreen';
import { SubscriptionScreen } from '../screens/Profile/SubscriptionScreen';
import { NotificationSettingsScreen } from '../screens/Profile/NotificationSettingsScreen';
import { ContactSupportScreen } from '../screens/Profile/ContactSupportScreen';
import { LegalSupportScreen } from '../screens/Profile/LegalSupportScreen';
import { TermsConditionsScreen } from '../screens/Profile/TermsConditionsScreen';
import { PrivacyPolicyScreen } from '../screens/Profile/PrivacyPolicyScreen';
import { RefundPolicyScreen } from '../screens/Profile/RefundPolicyScreen';
import { FAQScreen } from '../screens/Profile/FAQScreen';
import { NotificationsListScreen } from '../screens/Profile/NotificationsListScreen';
import { PracticeCommonListScreen } from '../screens/Practice/PracticeCommonListScreen';
import { PracticeQuestionDetailScreen } from '../screens/Practice/PracticeQuestionDetailScreen'; // refresh-trigger
import { PdfListScreen } from '../screens/Menu/PdfListScreen';
import { MicrophoneSetupScreen } from '../screens/Microphone/MicrophoneSetupScreen';
import { LiveSessionsScreen } from '../screens/LiveSessions/LiveSessionsScreen';
import { AudioModuleScreen } from '../modules/audio';
import { MonthlyPredictionScreen } from '../screens/MonthlyPrediction/MonthlyPredictionScreen';
import { DailyFeedbackListScreen } from '../screens/DailyFeedback/DailyFeedbackListScreen';
import { DailyFeedbackDetailScreen } from '../screens/DailyFeedback/DailyFeedbackDetailScreen';

// Maintenance check
import Config from '../config/Config';
import { MaintenanceScreen } from '../screens/Maintenance/MaintenanceScreen';

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

        {/* Profile and Settings screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
        <Stack.Screen name="LegalSupport" component={LegalSupportScreen} />
        <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="RefundPolicy" component={RefundPolicyScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="NotificationsList" component={NotificationsListScreen} />
        <Stack.Screen name="PracticeCommonList" component={PracticeCommonListScreen} />
        <Stack.Screen name="PracticeQuestionDetail" component={PracticeQuestionDetailScreen} />
        <Stack.Screen name="PdfList" component={PdfListScreen} />
        <Stack.Screen name="MicrophoneSetup" component={MicrophoneSetupScreen} />
        <Stack.Screen name="LiveSessions" component={LiveSessionsScreen} />
        <Stack.Screen name="AudioModuleDemo" component={AudioModuleScreen} />
        <Stack.Screen name="MonthlyPrediction" component={MonthlyPredictionScreen} />
        <Stack.Screen name="DailyFeedback" component={DailyFeedbackListScreen} />
        <Stack.Screen name="DailyFeedbackDetail" component={DailyFeedbackDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
