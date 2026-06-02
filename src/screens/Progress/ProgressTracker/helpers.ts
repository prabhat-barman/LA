// ─── Helpers for Progress Tracker normalization + display ──────────────────
// The screen merges two backend payloads (`/categories` and
// `/progress/{skill_id}?mock=0`) into a single, normalized list of
// subcategories per skill. Keeping the API shapes loose (`unknown`) and
// the internal shape strict lets the normalizer absorb backend churn
// without spreading `any` casts across the render tree.

import type {
  ProgressData,
  ProgressSkill,
  ProgressSubcategory,
  RawCategoriesPayload,
  RawProgressPayload,
} from './types';

// ─── Tiny coercion helpers ─────────────────────────────────────────────────
// Hand-rolled because the existing project-level helpers live in too many
// places and pulling them in here would create a dependency on shape we
// don't actually need.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const coerceNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    // Strip currency / suffix noise but require at least one digit so
    // strings like "n/a" or "abc" don't silently coerce to 0 (empty
    // string parses to 0 in JS, which would mask bad backend payloads).
    if (!/\d/.test(v)) return fallback;
    const n = Number(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const coerceString = (v: unknown, fallback = ''): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
};

const SKILL_NORMALIZE: Record<string, ProgressSkill> = {
  speaking: 'Speaking',
  writing: 'Writing',
  reading: 'Reading',
  listening: 'Listening',
};

const coerceSkill = (v: unknown): ProgressSkill | null => {
  if (typeof v !== 'string') return null;
  return SKILL_NORMALIZE[v.toLowerCase()] ?? null;
};

// ─── Categories normalizer ─────────────────────────────────────────────────
// The CATEGORIES endpoint is the source of truth for: subcategory id,
// title, parent skill, and total question count. The `attempted` count
// here is used as a fallback only — when PROGRESS data is available we
// prefer its unique-question-id count because it more accurately
// reflects how many distinct questions the user has touched.

interface RawSubcategory {
  id?: unknown;
  sub_id?: unknown;
  category_id?: unknown;
  title?: unknown;
  name?: unknown;
  pte_core_title?: unknown;
  category?: unknown;
  skill?: unknown;
  parent_category?: unknown;
  total_questions?: unknown;
  total?: unknown;
  questions_count?: unknown;
  attempted?: unknown;
  attempted_count?: unknown;
}

const normalizeOneSubcategory = (raw: unknown): ProgressSubcategory | null => {
  if (!isRecord(raw)) return null;
  const r = raw as RawSubcategory;
  const id = coerceNumber(r.id ?? r.sub_id ?? r.category_id, NaN);
  if (!Number.isFinite(id) || id <= 0) return null;
  const skill = coerceSkill(r.category ?? r.skill ?? r.parent_category);
  if (!skill) return null;
  const title = coerceString(r.title ?? r.name, '').trim();
  if (!title) return null;
  return {
    id,
    title,
    pteCoreTitle: coerceString(r.pte_core_title) || undefined,
    skill,
    attempted: coerceNumber(r.attempted ?? r.attempted_count, 0),
    total: coerceNumber(r.total_questions ?? r.total ?? r.questions_count, 0),
    accuracy: null,
    targetAccuracy: 0,
  };
};

export const normalizeCategoriesPayload = (
  raw: RawCategoriesPayload | unknown,
): ProgressSubcategory[] => {
  if (!isRecord(raw)) return [];
  const list = Array.isArray(raw.subcategories) ? raw.subcategories : [];
  const out: ProgressSubcategory[] = [];
  for (const item of list) {
    const n = normalizeOneSubcategory(item);
    if (n) out.push(n);
  }
  return out;
};

// ─── Progress (per-question scores) normalizer ────────────────────────────
// The /progress/{skill}?mock=0 response is keyed by subcategory id:
//   { data: { "<subcategoryId>": [ { question_id, score: [ {score, from} ] }, ... ] } }
// For each subcategory we compute:
//   - attempted = unique `question_id` count   (more accurate than length)
//   - accuracy  = sum(score.score) / sum(score.from) * 100
// Any rows with malformed score entries are silently skipped — we'd rather
// under-count than crash the screen for a single bad row.

export interface ProgressStats {
  attempted: number;
  accuracy: number | null; // null when there are no scoreable attempts
}

interface RawAttempt {
  question_id?: unknown;
  questionId?: unknown;
  id?: unknown;
  score?: unknown;
}

interface RawScoreEntry {
  score?: unknown;
  from?: unknown;
  max?: unknown;
  outOf?: unknown;
}

const computeStatsForBucket = (rawBucket: unknown): ProgressStats => {
  if (!Array.isArray(rawBucket)) return { attempted: 0, accuracy: null };

  const uniqueQuestions = new Set<number>();
  let totalScore = 0;
  let totalFrom = 0;

  for (const item of rawBucket) {
    if (!isRecord(item)) continue;
    const attempt = item as RawAttempt;
    const qid = coerceNumber(
      attempt.question_id ?? attempt.questionId ?? attempt.id,
      NaN,
    );
    if (Number.isFinite(qid) && qid > 0) uniqueQuestions.add(qid);

    if (Array.isArray(attempt.score)) {
      for (const sRaw of attempt.score) {
        if (!isRecord(sRaw)) continue;
        const s = sRaw as RawScoreEntry;
        const got = coerceNumber(s.score, NaN);
        const outOf = coerceNumber(s.from ?? s.max ?? s.outOf, NaN);
        if (!Number.isFinite(got) || !Number.isFinite(outOf) || outOf <= 0) {
          continue;
        }
        totalScore += got;
        totalFrom += outOf;
      }
    }
  }

  let accuracy: number | null = null;
  if (totalFrom > 0) {
    accuracy = Math.max(0, Math.min(100, Math.round((totalScore * 100) / totalFrom)));
  }
  return { attempted: uniqueQuestions.size, accuracy };
};

export const normalizeProgressPayload = (
  raw: RawProgressPayload | unknown,
): Map<number, ProgressStats> => {
  const out = new Map<number, ProgressStats>();
  if (!raw) return out;

  // Unwrap the outer envelope if present. We accept either the bare
  // bucket-map or `{data: {...}}` because some interceptors strip the
  // envelope and others don't.
  let bucketMap: unknown = raw;
  if (isRecord(raw) && 'data' in raw && isRecord(raw.data)) {
    bucketMap = raw.data;
  }
  if (!isRecord(bucketMap)) return out;

  for (const [keyStr, value] of Object.entries(bucketMap)) {
    const id = coerceNumber(keyStr, NaN);
    if (!Number.isFinite(id) || id <= 0) continue;
    const stats = computeStatsForBucket(value);
    // Always set the entry — even an empty bucket carries useful
    // information (attempted=0 with explicit progress data confirms the
    // user hasn't started this subcategory yet).
    out.set(id, stats);
  }
  return out;
};

// ─── Merge ──────────────────────────────────────────────────────────────────
// Categories drives the list; per-subcategory progress overrides the
// `attempted` count (since the backend's CATEGORIES count is sometimes
// stale) and supplies the accuracy. When PROGRESS has no entry for a
// subcategory we keep the categories `attempted` as a best-effort fallback
// and leave accuracy as null so the UI renders "—" instead of a
// misleading 0%.

export const mergeProgressData = (
  subcategories: ProgressSubcategory[],
  statsBySubcategoryId: Map<number, ProgressStats>,
): ProgressData => {
  const bySkill: Record<ProgressSkill, ProgressSubcategory[]> = {
    Speaking: [],
    Writing: [],
    Reading: [],
    Listening: [],
  };
  const populatedSkills = new Set<ProgressSkill>();
  for (const sub of subcategories) {
    const stats = statsBySubcategoryId.get(sub.id);
    const merged: ProgressSubcategory = stats
      ? { ...sub, attempted: stats.attempted, accuracy: stats.accuracy }
      : sub;
    bySkill[sub.skill].push(merged);
    populatedSkills.add(sub.skill);
  }
  return { bySkill, populatedSkills };
};

// ─── UI helpers ─────────────────────────────────────────────────────────────

// Returns a progress ratio in [0, 1]. Guards against divide-by-zero and
// stray negatives in the backend payload.
export const computeProgressRatio = (attempted: number, total: number): number => {
  if (!total || total <= 0) return 0;
  return Math.min(1, Math.max(0, attempted / total));
};

// Format big numbers with thousands separators consistently across the
// screen (locale-aware to match the rest of the app).
export const formatCount = (n: number): string => n.toLocaleString();

// Section accent — matches the Dashboard / Practice screen palette so the
// visual language stays consistent when the user lands here from those
// surfaces.
export const SKILL_ACCENT: Record<ProgressSkill, string> = {
  Speaking: '#007AFF',
  Writing: '#34C759',
  Reading: '#FF9500',
  Listening: '#AF52DE',
};

// Accuracy/progress bar color. We use a single accent (green) for the
// progress bar to match the old app's visual; the only variant is "no
// progress yet" which dims the track.
export const PROGRESS_BAR_COLOR = '#94C23C';
export const PROGRESS_BAR_TRACK = '#E5E5EA';
