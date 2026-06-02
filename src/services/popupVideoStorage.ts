import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// Per-day throttle for the Dashboard welcome popup video. Stores
// the yyyy-mm-dd of the last day the popup was shown. The
// Dashboard checks `shouldShowPopupVideoToday()` on first mount;
// once it shows it calls `markPopupVideoShownToday()` so subsequent
// cold-starts on the same day skip the popup.

const POPUP_LAST_SHOWN_KEY = 'popup_video:last_shown_date_v1';

const today = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const shouldShowPopupVideoToday = async (): Promise<boolean> => {
  try {
    const last = await AsyncStorage.getItem(POPUP_LAST_SHOWN_KEY);
    return last !== today();
  } catch (err) {
    logger.debug('[popupVideo] read failed', err);
    return false; // fail-safe: don't pop the modal on storage errors
  }
};

export const markPopupVideoShownToday = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(POPUP_LAST_SHOWN_KEY, today());
  } catch (err) {
    logger.debug('[popupVideo] write failed', err);
  }
};
