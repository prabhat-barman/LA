import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useToast } from './ToastContext';
import { getItem, setItem } from '../utils/secureStorage';
import apiClient from '../services/apiClient';
import { logger } from '../services/logger';
import { API_ENDPOINTS } from '../config/apiConfig';
import { persistBackendActiveSubscription } from '../utils/subscriptionValidator';

interface DashboardDataContextType {
  dashboardData: any;
  loading: boolean;
  refreshing: boolean;
  hasNotifications: boolean;
  loadDashboardData: (isPullToRefresh?: boolean) => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export const DashboardDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [hasNotifications, setHasNotifications] = useState(false);

  // Timezone Auto Synchronization
  const syncTimezone = useCallback(async () => {
    try {
      const isSynced = await getItem('timezone_synced');
      if (isSynced === 'true') return;

      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await apiClient.post(API_ENDPOINTS.SET_TIMEZONE, { timezone: deviceTimezone });
      await setItem('timezone_synced', 'true');
    } catch (err) {
      logger.warn('Silent timezone sync failed:', err);
    }
  }, []);

  // Device Token Registration for Push Notifications
  const registerDeviceToken = useCallback(async () => {
    try {
      const token = await getItem('fcm_device_token');
      if (!token) return; // No token stored yet — FCM/APNs will populate this later
      const isRegistered = await getItem('device_token_registered');
      if (isRegistered === 'true') return;

      await apiClient.post(API_ENDPOINTS.DEVICE_TOKEN, {
        device_token: token,
        device_type: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      await setItem('device_token_registered', 'true');
    } catch (err) {
      logger.warn('Silent device token registration failed:', err);
    }
  }, []);

  // Main fetch runner
  const loadDashboardData = useCallback(async (isPullToRefresh = false) => {
    // Skip silently when there is no auth token yet (pre-login splash, logged-out
    // navigation transitions, etc.). The provider now lives at app root so it
    // mounts before SignIn — we must not noisily fail when there's no session.
    const token = await getItem('user_token');
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Fetch dashboard data. We override the global 100s timeout because
      // the dashboard sits behind the splash and we'd rather show cached
      // data quickly than block on a slow request. 30s is forgiving enough
      // for cold-cache backends + flaky networks without making the splash
      // feel stuck.
      const dashResponse = await apiClient.get(API_ENDPOINTS.DASHBOARD_DATA, {
        timeout: 30000,
      });
      const data = dashResponse.data?.data || dashResponse.data;
      
      setDashboardData(data);
      
      // Update cache
      await setItem('dashboard_data_cache', JSON.stringify(data));
      if (data?.user?.first_name || data?.first_name) {
        const userObj = data.user || data;
        await setItem('user_data', JSON.stringify(userObj));
      }

      // Persist active subscription so the validator can grant access
      // even when the user paid via backend (admin/tutor/web Razorpay/Stripe).
      const activeSubs = data?.active_subscription ?? data?.user?.active_subscription ?? [];
      await persistBackendActiveSubscription(activeSubs);

      // 2. Fetch Notifications (Bell Icon status)
      try {
        const notifResponse = await apiClient.get(API_ENDPOINTS.GET_NOTIFICATIONS);
        const notifList = notifResponse.data?.notifications || notifResponse.data || [];
        setHasNotifications(notifList.length > 0);
      } catch {
        setHasNotifications(false);
      }

      // 3. Fetch App onboarding tour flags
      try {
        await apiClient.get(API_ENDPOINTS.ONBOARDING);
      } catch {
        // Ignore onboarding tour errors silently
      }

      // 4. Trigger silent timezone sync
      syncTimezone();

      // 5. Register device token for push notifications
      registerDeviceToken();

    } catch (error: any) {
      // Classify recoverable failures so the dev console doesn't light up red
      // for things we already handle gracefully via the cache fallback below.
      //
      //   - Auth transients: the apiClient interceptor briefly rejects all
      //     requests after a 401 while the auth flow redirects to SignIn.
      //   - Timeouts (axios `ECONNABORTED`): slow backend / flaky network.
      //   - Network errors: device offline, DNS failure, etc.
      //
      // For any of these we still try the offline cache so the user sees
      // *something* instead of an empty dashboard.
      const status = error?.response?.status;
      const message: string = error?.message || '';
      const code: string = error?.code || '';
      const isAuthTransient =
        status === 401
        || message.includes('API blocked due to session expiration');
      const isTimeout =
        code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(message);
      const isNetworkError = message.includes('Network Error');
      const isRecoverable = isAuthTransient || isTimeout || isNetworkError;

      if (isRecoverable) {
        // Use `warn` (not `error`) so React Native's red-box LogBox stays
        // quiet for these expected, recovered-from cases.
        const tag = isAuthTransient
          ? 'auth transient'
          : isTimeout
            ? 'timeout'
            : 'offline';
        logger.warn(`Dashboard load skipped (${tag}):`, message);
      } else {
        logger.error(error, 'Failed to load dashboard data');
      }

      // Hydrate from offline storage cache regardless — better to show stale
      // data than a blank screen during a flaky auth moment.
      let usedCache = false;
      try {
        const cachedStr = await getItem('dashboard_data_cache');
        if (cachedStr) {
          setDashboardData(JSON.parse(cachedStr));
          usedCache = true;
        }
      } catch {
        // Ignore cache fetch errors
      }

      // User-facing toast: keep it terse and actionable. Auth transients get
      // no toast at all (the SignIn redirect speaks for itself). Other
      // failures get a single message — different copy depending on whether
      // we have cache to show.
      if (!isAuthTransient) {
        if (isTimeout || isNetworkError) {
          showToast(
            usedCache
              ? 'Slow connection — showing offline data'
              : 'Slow connection — try again in a moment',
            usedCache ? 'success' : 'error',
          );
        } else if (usedCache) {
          showToast('Loaded from offline cache', 'success');
        } else {
          showToast(message || 'Failed to update dashboard data', 'error');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, syncTimezone, registerDeviceToken]);

  const contextValue = useMemo(() => ({
    dashboardData,
    loading,
    refreshing,
    hasNotifications,
    loadDashboardData,
  }), [dashboardData, loading, refreshing, hasNotifications, loadDashboardData]);

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  );
};

export const useDashboardData = () => {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};
