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
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>(DEFAULT_STATUS);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type ?? null,
      });
    });
    return unsubscribe;
  }, []);

  return status;
};
