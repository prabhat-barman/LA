import analytics from '@react-native-firebase/analytics';
import { logger } from './logger';

// Thin Firebase Analytics wrapper. The wrapper exists for three
// reasons:
//   1. The Firebase SDK returns Promises that we usually don't want
//      to await in call sites (analytics calls must never block UI).
//      We swallow + log here instead of leaking unhandled rejections.
//   2. Centralised place to add prefix / tagging logic later
//      (e.g. `core_` vs `acad_` event names for the two app
//      variants) without touching every screen.
//   3. Single mock point for tests — most callers should be able to
//      do `jest.mock('../../services/analytics', () => ({ ... }))`
//      and not have to know anything about Firebase's surface.

type AnalyticsParams = Record<string, string | number | boolean>;

const safe = (op: string, fn: () => Promise<unknown>): void => {
  fn().catch(err => {
    // Analytics is fire-and-forget — never throw out into UI code.
    logger.debug(`[analytics] ${op} failed`, err);
  });
};

// Track a screen view. Firebase's automatic screen tracking only
// fires on `react-navigation` v5+ with the official integration —
// since we manage navigation manually in places, calling this
// explicitly gives reliable coverage.
export const trackScreen = (
  screenName: string,
  screenClass?: string,
): void => {
  safe('logScreenView', () =>
    analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    }),
  );
};

// Track a custom event. Limit to 40-character names and ≤25 params
// per Firebase's contract — we don't enforce that here but call
// sites should keep it tight.
export const trackEvent = (
  name: string,
  params?: AnalyticsParams,
): void => {
  safe(`logEvent:${name}`, () => analytics().logEvent(name, params));
};

// Attach the signed-in user's id to the analytics session. Firebase
// requires the id to be ≤ 256 chars; we send it as-is.
export const setAnalyticsUserId = (userId: string | null): void => {
  safe('setUserId', () => analytics().setUserId(userId));
};

// Attach a single user property (e.g. plan tier, app variant).
// `null` clears the property.
export const setAnalyticsUserProperty = (
  key: string,
  value: string | null,
): void => {
  safe(`setUserProperty:${key}`, () =>
    analytics().setUserProperty(key, value),
  );
};

// Frequently-used event names live here so screens don't sprinkle
// magic strings everywhere. New events can be added without making
// this list exhaustive — `trackEvent` accepts any string.
export const AnalyticsEvents = {
  AppOpen: 'app_open',
  SignIn: 'sign_in',
  SignUp: 'sign_up',
  PracticeStart: 'practice_start',
  PracticeSubmit: 'practice_submit',
  MockStart: 'mock_start',
  MockComplete: 'mock_complete',
  BookTrialOpen: 'book_trial_open',
  BookTrialSubmit: 'book_trial_submit',
  WalkthroughComplete: 'walkthrough_complete',
  WalkthroughSkip: 'walkthrough_skip',
} as const;
