import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineBannerProps {
  // Allow callers to override the message — e.g. "Saving may fail
  // while offline" inside a form-heavy screen.
  message?: string;
}

// Shows a thin amber banner whenever NetInfo reports the device is
// offline. Mounted near the navigation root so every screen gets it
// without per-screen wiring.
//
// We pad with the top safe-area inset so the banner sits below the
// system status bar — otherwise on Android screens that use
// `StatusBar translucent` (like Onboarding) the banner would render
// directly over the system clock and icons.
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = "You're offline — showing cached content where available.",
}) => {
  const { isConnected } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Only rely on `isConnected` (OS-level link state), NOT
  // `isInternetReachable`. The latter probes clients3.google.com under
  // the hood, which fails with false negatives on:
  //   - regions where the probe URL is blocked / rate-limited
  //   - slow networks where the probe times out before our axios calls
  //   - simulators / emulators with quirky NAT
  // Real API calls succeeding is the source of truth for connectivity;
  // we trust those and only show the banner when the OS itself says
  // there is no link.
  if (isConnected) return null;

  // On Android, `StatusBar.currentHeight` is the most reliable fallback
  // for screens that don't sit inside a SafeAreaProvider boundary; on
  // iOS, the safe-area inset is always populated.
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 0
      : 0;

  return (
    <View
      style={[styles.container, { paddingTop: topInset + 6 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text} accessibilityLabel={message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  text: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontWeight: '600',
  },
});
