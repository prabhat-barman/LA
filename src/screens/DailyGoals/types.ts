// Shared types for the Daily Goals (a.k.a. Success Plan) feature.
//
// Backend shape note: the API ships count fields as either numbers
// or numeric strings depending on which version of the PHP serialiser
// fielded the request. Every field that comes from the wire is
// declared as `number | string` and the hook layer coerces with
// `Number(x) || 0` at read time.

export interface DailyGoalTargets {
  // Speaking / Writing / Reading / Listening / Mock totals the user
  // committed to for the day. `null` = no goal set.
  speaking: number | null;
  writing: number | null;
  reading: number | null;
  listening: number | null;
  mock: number | null;
}

export interface DailyGoalProgress {
  speaking_done: number;
  writing_done: number;
  reading_done: number;
  listening_done: number;
  mock_done: number;
}

export interface DailyGoalSnapshot {
  date: string; // YYYY-MM-DD
  targets: DailyGoalTargets;
  progress: DailyGoalProgress;
  // Free-text remarks left by the assigned tutor for the day. The
  // legacy app calls these "admin tasks" — same field, less
  // confusing name.
  tutorNotes: string[];
}

// Skill the user can set / track. Mirrors the dashboard skill chip
// labels so navigation between Dashboard → DailyGoals reads naturally.
export type DailyGoalSkill =
  | 'speaking'
  | 'writing'
  | 'reading'
  | 'listening'
  | 'mock';

export const DAILY_GOAL_SKILLS: DailyGoalSkill[] = [
  'speaking',
  'writing',
  'reading',
  'listening',
  'mock',
];

export const SKILL_LABELS: Record<DailyGoalSkill, string> = {
  speaking: 'Speaking',
  writing: 'Writing',
  reading: 'Reading',
  listening: 'Listening',
  mock: 'Mock Tests',
};
