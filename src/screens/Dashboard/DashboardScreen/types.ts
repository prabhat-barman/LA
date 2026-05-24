// Backend `type` mapping for tutorial videos in `data.video[]` (verified):
//   2 = Speaking, 3 = Writing, 4 = Reading, 5 = Listening, 6 = Final Tips (Others)
export type VideoSkillTab =
  | 'Speaking'
  | 'Writing'
  | 'Reading'
  | 'Listening'
  | 'Others';

export type BreakdownSkill =
  | 'Overall'
  | 'Speaking'
  | 'Listening'
  | 'Writing'
  | 'Reading';

export interface DashboardVideoItem {
  id: number;
  title: string;
  video: string;
  description?: string;
  type?: number;
}

export interface BreakdownMetaEntry {
  label: string;
  score: number;
  color: string;
  tint: string;
}

export type BreakdownMeta = Record<BreakdownSkill, BreakdownMetaEntry>;

export interface PracticeCounts {
  done: string;
  total: string;
}
