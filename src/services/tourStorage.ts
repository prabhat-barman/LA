import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// One-stop persistence helper for "has the user seen tour step X
// yet?" flags. Each tour site declares a stable key (see TOUR_KEYS
// below) and the hook consumers check/mark via `hasSeenTour` /
// `markTourSeen`.
//
// Versioned suffix on the storage key so we can replay tours after a
// major UX revamp without nuking every other AsyncStorage entry.
const STORAGE_PREFIX = 'tour:seen_v1:';

// Canonical list of tour sites. Add new keys here and reference them
// from the consuming screen. Keeping them centralised:
//   - prevents typos creeping into AsyncStorage keys (one source of
//     truth)
//   - makes the "what tours exist?" question easy to answer for a
//     newcomer to the codebase
//   - lets us blanket-clear all tour state for QA
//     (`resetAllTours()` walks the union).
export const TOUR_KEYS = {
  DashboardWelcome: 'dashboard_welcome',
  DashboardCategories: 'dashboard_categories',
  PracticeFirstQuestion: 'practice_first_question',
  MockTestPrerequisite: 'mock_test_prerequisite',
  ProgressTrackerIntro: 'progress_tracker_intro',
} as const;

export type TourKey = (typeof TOUR_KEYS)[keyof typeof TOUR_KEYS];

const fullKey = (k: TourKey): string => `${STORAGE_PREFIX}${k}`;

export const hasSeenTour = async (key: TourKey): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(fullKey(key));
    return v === '1';
  } catch (err) {
    logger.debug('[tourStorage] read failed', err);
    return true; // fail-safe: don't loop user through tour on storage errors
  }
};

export const markTourSeen = async (key: TourKey): Promise<void> => {
  try {
    await AsyncStorage.setItem(fullKey(key), '1');
  } catch (err) {
    logger.debug('[tourStorage] write failed', err);
  }
};

// Reset helper for QA / "show tour again" affordances in dev menus.
// Iterates through the constants object so newly-added keys are
// included automatically.
export const resetAllTours = async (): Promise<void> => {
  try {
    await Promise.all(
      Object.values(TOUR_KEYS).map(k => AsyncStorage.removeItem(fullKey(k))),
    );
  } catch (err) {
    logger.debug('[tourStorage] reset failed', err);
  }
};
