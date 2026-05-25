import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoState['type'] | null;
}

const DEFAULT_STATUS: NetworkStatus = {
  // Optimistic default: assume online so we don't flash an offline
  // banner before NetInfo has a chance to report the real state.
  isConnected: true,
  isInternetReachable: null,
  type: null,
};

// Subscribes to NetInfo and returns the latest connection status.
// Use the `isConnected` flag to decide whether to render the offline
// banner; `isInternetReachable === false` means we're on a network
// that can't actually reach the internet (e.g. captive portal).
//
// IMPORTANT: NetInfo on Android (especially emulators) can fire many
// events back-to-back with identical payloads. We diff each event
// against the previous status and skip the setState if nothing
// meaningful changed — otherwise the entire app subtree re-renders
// every few seconds for no reason.
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>(DEFAULT_STATUS);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const next: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type ?? null,
      };
      setStatus(prev => {
        if (
          prev.isConnected === next.isConnected &&
          prev.isInternetReachable === next.isInternetReachable &&
          prev.type === next.type
        ) {
          return prev;
        }
        return next;
      });
    });
    return unsubscribe;
  }, []);

  return status;
};
