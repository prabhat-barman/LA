import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { logger } from '../services/logger';
import {
  checkForUpdate,
  openStore,
  type UpdateCheckResult,
} from '../services/versionCheckService';

const LAST_CHECK_KEY = 'version_check:last_check_ts';
// Avoid hammering iTunes / Play Store on every foreground transition
// — a 24h cadence is plenty for an app-store latency window that
// runs on the order of days.
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface UseVersionCheckResult {
  updateInfo: UpdateCheckResult | null;
  showUpdateModal: boolean;
  handleUpdate: () => void;
  handleLater: () => void;
}

// Decides whether enough time has elapsed since the last "we
// actually performed a remote lookup" timestamp. Errs on the side of
// rechecking — bad storage / parse failures return `true` so we
// don't accidentally lock the user out of a force-update prompt.
const shouldRunRemoteCheck = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!raw) return true;
    const last = Number.parseInt(raw, 10);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
};

// Lightweight hook that runs the update check on first mount AND on
// every foreground transition. Force-updates always show the modal;
// optional updates respect the 24h throttle so the user isn't
// nagged on every backgrounding.
export const useVersionCheck = (): UseVersionCheckResult => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const runCheck = useCallback(async (force = false) => {
    try {
      const shouldRun = force || (await shouldRunRemoteCheck());
      if (!shouldRun) return;
      const result = await checkForUpdate();
      if (result.updateAvailable) {
        setUpdateInfo(result);
        setShowUpdateModal(true);
      }
      // Always stamp the last-check time on a successful (non-error)
      // lookup so we don't refetch on every foreground.
      if (!result.error) {
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      }
    } catch (err) {
      logger.warn('[useVersionCheck] runCheck threw', err);
    }
  }, []);

  useEffect(() => {
    runCheck();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') runCheck();
    });
    return () => {
      sub.remove();
    };
  }, [runCheck]);

  const handleUpdate = useCallback(() => {
    setShowUpdateModal(false);
    openStore();
  }, []);

  const handleLater = useCallback(() => {
    // Force-update modals don't expose a "later" CTA in the UI, but
    // we still guard here in case a future caller wires the button
    // by mistake.
    if (updateInfo?.forceUpdate) return;
    setShowUpdateModal(false);
  }, [updateInfo]);

  return { updateInfo, showUpdateModal, handleUpdate, handleLater };
};

export default useVersionCheck;
