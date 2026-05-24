import type { VideoSkillTab } from './types';

// Backend `type` mapping for tutorial videos in `data.video[]` (verified
// against production data):
//   2 = Speaking, 3 = Writing, 4 = Reading, 5 = Listening, 6 = Final Tips (Others)
export const TAB_TO_TYPES: Record<VideoSkillTab, number[]> = {
  Speaking: [2],
  Writing: [3],
  Reading: [4],
  Listening: [5],
  Others: [6],
};

export const VIDEO_TABS: VideoSkillTab[] = [
  'Speaking',
  'Writing',
  'Reading',
  'Listening',
  'Others',
];

// Default category totals shown when the backend hasn't returned counts
// yet — keeps the UI from collapsing to zeros mid-load.
export const DEFAULT_CATEGORY_TOTALS = {
  speaking: '8,637',
  writing: '2,642',
  reading: '4,151',
  listening: '6,819',
} as const;

// Default profile placeholder. Used when the user has no avatar or the
// path is null/undefined.
export const DEFAULT_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
