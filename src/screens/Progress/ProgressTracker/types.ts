// ─── Domain types for the Progress Tracker screen ──────────────────────────
// The screen merges two backend payloads (`categories` and `progress`) into
// a single, normalized list of subcategories per skill. Keeping the API
// shapes loose (`Record<string, unknown>`) and the internal shape strict
// lets the normalizer absorb backend churn without spreading `any` casts
// across the render tree.

import type { PracticeSection } from '../../../navigation/types';

export type ProgressSkill = PracticeSection;

export const PROGRESS_SKILLS: readonly ProgressSkill[] = [
  'Speaking',
  'Writing',
  'Reading',
  'Listening',
] as const;

// Backend's per-tab category id used in the `/progress/{id}` URL. This is
// the same numbering used by the legacy app and is decoupled from the
// subcategory ids returned inside the response payload.
export const SKILL_TO_ID: Record<ProgressSkill, number> = {
  Speaking: 1,
  Writing: 2,
  Reading: 3,
  Listening: 4,
};

// `mock=0` => practice-screen progress, `mock=1` => mock-screen progress.
// We only use practice here; mock progress lives in MockTestProgress.
export const PROGRESS_MODE_PRACTICE = 0 as const;

// What the screen renders per row. `attempted` / `total` come from the
// CATEGORIES endpoint; `accuracy` (when available) is grafted in from the
// PROGRESS endpoint. `targetAccuracy` is currently always 0 — a future
// "set your accuracy goal" feature will populate it.
export interface ProgressSubcategory {
  id: number;
  title: string;
  pteCoreTitle?: string;
  skill: ProgressSkill;
  attempted: number;
  total: number;
  accuracy: number | null;
  targetAccuracy: number;
}

export interface ProgressData {
  // Keyed by skill so the screen can switch tabs without re-fetching.
  bySkill: Record<ProgressSkill, ProgressSubcategory[]>;
  // The set of skills that returned at least one subcategory. Lets the
  // UI hide tabs the API has nothing for (rare, but defensive).
  populatedSkills: Set<ProgressSkill>;
}

// ─── API response shapes (loose on purpose) ─────────────────────────────────
// Two endpoints feed this screen:
//
// 1. CATEGORIES (`/categories`)
//    { data: { subcategories: [ {id, title, pte_core_title, category,
//                                total_questions, attempted} ] } }
//    Source of truth for the subcategory list (title, total questions).
//
// 2. PROGRESS (`/progress/{skill_id}?mock=0`)
//    { status: 200, data: {
//        "<subcategoryId>": [
//          { question_id: 101, score: [ {score: 12, from: 15}, ... ] }, ...
//        ],
//        "<subcategoryId>": []
//    }}
//    Frontend computes:
//      - attempted = unique `question_id` count per subcategory
//      - accuracy  = sum(score.score) / sum(score.from) * 100

export interface RawCategoriesPayload {
  subcategories?: unknown[];
  [key: string]: unknown;
}

// Loose; we only ever read `.data` (the subcategory-keyed map) or fall
// through to "no progress for any subcategory" without crashing.
export interface RawProgressPayload {
  data?: unknown;
  [key: string]: unknown;
}
