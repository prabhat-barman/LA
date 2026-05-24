import type { CategoryConfig, SkillCategory } from './types';

// Backend `stgy_video_cat_id` mapping (verified from GET /get-stgy-videos):
//   1 = Introduction (treated as intro)
//   2 = Speaking zone
//   3 = Writing zone
//   4 = Reading zone
//   5 = Listening zone
//   6 = Final Tips (treated as finalTip)
export const SKILL_CATEGORY_ID: Record<number, SkillCategory> = {
  2: 'Speaking',
  3: 'Writing',
  4: 'Reading',
  5: 'Listening',
};
export const INTRO_CATEGORY_ID = 1;
export const FINAL_TIP_CATEGORY_ID = 6;

export const PLACEHOLDER_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80';

export const FALLBACK_AVATAR_URI =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

// Only surface a backend message as a paywall banner when it actually mentions
// subscribing / upgrading. Generic success strings ("Videos fetched", etc.)
// should not be rendered as a paywall.
export const PAYWALL_KEYWORDS = [
  'subscribe',
  'subscription',
  'upgrade',
  'premium',
  'plan',
];

export const CATEGORIES: ReadonlyArray<CategoryConfig> = [
  { name: 'Speaking', color: '#007AFF' },
  { name: 'Writing', color: '#34C759' },
  { name: 'Reading', color: '#FF9500' },
  { name: 'Listening', color: '#AF52DE' },
];
