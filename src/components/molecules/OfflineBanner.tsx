import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineBannerProps {
  // Allow callers to override the message — e.g. "Saving may fail
  // while offline" inside a form-heavy screen.
  message?: string;
}

// Shows a thin amber banner whenever NetInfo reports the device is
// offline. Mounted near the navigation root so every screen gets it
// without per-screen wiring.
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = "You're offline — showing cached content where available.",
}) => {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Treat both "no connection" and "connected but no internet"
  // (captive portal / DNS failure) as offline for UX purposes.
  const offline = !isConnected || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text} accessibilityLabel={message}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
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
