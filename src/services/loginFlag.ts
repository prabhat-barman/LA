import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// AsyncStorage marker set immediately after a successful sign-in
// (email/password, Google, Apple, sign-up flow). Dashboard reads
// this on first mount to decide whether to trigger one-time
// post-login experiences — currently the welcome popup video that
// the backend ships in `dashboard.data.popup_video.youtube_vid`.
//
// Consume + clear in the same tick so subsequent app launches
// (which aren't logins) skip the popup.

const KEY = 'auth:just_logged_in_v1';

export const markJustLoggedIn = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch (err) {
    logger.debug('[loginFlag] set failed', err);
  }
};

export const consumeJustLoggedIn = async (): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === '1') {
      await AsyncStorage.removeItem(KEY);
      return true;
    }
    return false;
  } catch (err) {
    logger.debug('[loginFlag] read failed', err);
    return false;
  }
};
