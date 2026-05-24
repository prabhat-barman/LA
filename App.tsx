import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RNBootSplash from "react-native-bootsplash";
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { UserProvider } from './src/context/UserContext';
import { DashboardDataProvider } from './src/context/DashboardDataContext';
import { RecorderProvider } from './src/context/RecorderContext';
import { ErrorBoundary } from './src/components/organisms/ErrorBoundary';
import { configureGoogleSignIn } from './src/services/socialAuthService';

function App() {
  useEffect(() => {
    const init = async () => {
      // Initialize Google Sign-in configuration parameters
      configureGoogleSignIn();
      // Hide the native splash screen as soon as JS is ready
      await RNBootSplash.hide({ fade: true });
    };

    init();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ToastProvider>
          <UserProvider>
            <DashboardDataProvider>
              <RecorderProvider>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <KeyboardAvoidingView
                  // On Android, AndroidManifest sets windowSoftInputMode=adjustResize,
                  // which already shrinks the layout when the keyboard appears. Using
                  // KeyboardAvoidingView with behavior="height" on top of that causes
                  // a double-resize and content bouncing on focus.
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.container}
                >
                  <AppNavigator />
                </KeyboardAvoidingView>
              </RecorderProvider>
            </DashboardDataProvider>
          </UserProvider>
        </ToastProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
