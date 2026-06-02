import type { MockSection, MockTestVariant } from '../MockTestRunner/types';
import type {
  EnablingSkillScore,
  MockResult,
  PastMock,
  PteScore,
  SectionScore,
} from './types';

// Min/max PTE band. Used to clamp anything we extract — even nominally
// 10-90 backends occasionally surface stale 0 or 95 values.
const PTE_MIN = 10;
const PTE_MAX = 90;

// Lookup catalog of every field name we've seen across the codebase
// (drawn from `useScoreBreakdown.ts`) and PTE conventions. The
// normalizer walks these in order and takes the first non-null
// numeric value. Easy to extend when a new backend variant lands —
// add the field name to the relevant list and the normalizer picks
// it up on the next render.
const OVERALL_FIELDS = [
  'overall_score',
  'overall',
  'score_percent',
  'percentage',
  'total_score',
  'score',
  'final_score',
  'pte_score',
];

const SECTION_FIELDS: Record<MockSection, string[]> = {
  Speaking: [
    'speaking_score',
    'speaking',
    'communicative_speaking',
    'sp_score',
    'speakingScore',
  ],
  Writing: [
    'writing_score',
    'writing',
    'communicative_writing',
    'wr_score',
    'writingScore',
  ],
  Reading: [
    'reading_score',
    'reading',
    'communicative_reading',
    'rd_score',
    'readingScore',
  ],
  Listening: [
    'listening_score',
    'listening',
    'communicative_listening',
    'ls_score',
    'listeningScore',
  ],
};

// Canonical enabling-skill names (left side) → backend field name
// candidates (right side). PTE Academic ships six skills; the
// backend may return any subset.
const ENABLING_SKILL_FIELDS: Array<{
  name: string;
  fields: string[];
}> = [
  {
    name: 'Grammar',
    fields: ['grammar', 'grammar_score', 'enabling_grammar'],
  },
  {
    name: 'Oral Fluency',
    fields: [
      'oral_fluency',
      'oral_fluency_score',
      'fluency',
      'fluency_score',
      'enabling_fluency',
    ],
  },
  {
    name: 'Pronunciation',
    fields: ['pronunciation', 'pronunciation_score', 'enabling_pronunciation'],
  },
  {
    name: 'Spelling',
    fields: ['spelling', 'spelling_score', 'enabling_spelling'],
  },
  {
    name: 'Vocabulary',
    fields: ['vocabulary', 'vocabulary_score', 'enabling_vocabulary'],
  },
  {
    name: 'Written Discourse',
    fields: [
      'written_discourse',
      'discourse',
      'discourse_score',
      'written_discourse_score',
      'enabling_discourse',
    ],
  },
];

const TITLE_FIELDS = ['title', 'name', 'mock_title', 'test_title', 'label'];
const TIMESTAMP_FIELDS = [
  'submitted_at',
  'submittedAt',
  'completed_at',
  'completedAt',
  'created_at',
  'createdAt',
  'finished_at',
  'finishedAt',
  'date',
  'time',
];
const TOTAL_Q_FIELDS = [
  'total_questions',
  'totalQuestions',
  'q_count',
  'questions_count',
  'questionCount',
  'total_q',
];
const ATTEMPTED_Q_FIELDS = [
  'attempted',
  'attempted_questions',
  'attemptedQuestions',
  'answered',
  'answered_questions',
  'completed_questions',
];

// Cheap "is this a plain object?" check. We get a lot of nested
// structures from the backend (`{ overall: { score: 65 } }`) and need
// to recurse into them without blowing up on null / primitives.
const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

// Convert anything plausibly numeric into a finite number, returning
// `null` for everything else. Handles:
//   • Bare numbers (passed through after finiteness check)
//   • Numeric strings ("65", "65.5", "  65 ", "65/90")
//   • Wrapper objects ({ score: 65, out_of: 90 })
// Returns null for null/undefined/NaN/Infinity/empty-string/junk.
export const coerceScore = (val: unknown): number | null => {
  if (val == null) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 0) return null;
    // Handle "65/90" style — take the numerator.
    const slashIdx = trimmed.indexOf('/');
    const numerator = slashIdx >= 0 ? trimmed.slice(0, slashIdx) : trimmed;
    const parsed = Number(numerator);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (isObject(val)) {
    // Score wrapper: { score: 65, out_of: 90 } — recurse on the
    // most common nested fields. Avoid infinite recursion by NOT
    // re-entering `coerceScore` on the same shape; instead inline
    // a numeric extraction.
    const inner =
      val.score ?? val.value ?? val.total ?? val.points ?? val.band ?? null;
    if (inner != null && inner !== val) {
      return coerceScore(inner);
    }
  }
  return null;
};

// Normalize an extracted numeric into the PTE 10-90 band:
//   • <= 1   → treat as 0-1 percentage, scale to 10-90
//   • 1..10  → treat as bare 0-10 → scale (rare; some legacy backends)
//   • 10..90 → pass through
//   • > 90   → clamp to 90 (defensive; some scores come back as 100)
//   • < 10 + > 1 → clamp UP to 10 (PTE doesn't go below 10)
// Returns `null` for null input.
const toPteBand = (raw: number | null): PteScore => {
  if (raw == null) return null;
  let v = raw;
  if (v > 0 && v <= 1) {
    // 0-1 percentage → 10-90 band.
    v = PTE_MIN + v * (PTE_MAX - PTE_MIN);
  } else if (v > 1 && v < PTE_MIN) {
    // 1-10 raw → assume already in PTE space, clamp up.
    v = PTE_MIN;
  }
  if (v > PTE_MAX) v = PTE_MAX;
  if (v < PTE_MIN) v = PTE_MIN;
  return Math.round(v);
};

// First-match field lookup. Useful for "find the overall score field
// no matter what the backend named it." Returns the raw extracted
// value (not yet PTE-banded) so the caller can decide how to clamp.
const firstFromFields = (
  src: Record<string, unknown>,
  fields: string[],
): unknown => {
  for (const f of fields) {
    const v = src[f];
    if (v != null && (typeof v !== 'string' || v.trim().length > 0)) {
      return v;
    }
  }
  return null;
};

// Walks a couple of common nesting wrappers ("result", "data",
// "mock_result", "score_data") to find the actual score payload.
// Backends frequently wrap the meaningful content one level deep
// inside a transport envelope.
const unwrapEnvelope = (payload: unknown): Record<string, unknown> | null => {
  if (!isObject(payload)) return null;
  // If the payload already has any of our overall fields at the top
  // level, no unwrap needed.
  for (const f of OVERALL_FIELDS) {
    if (payload[f] != null) return payload;
  }
  // Otherwise try common envelope keys.
  const envelopeKeys = ['result', 'data', 'mock_result', 'score', 'score_data'];
  for (const k of envelopeKeys) {
    const inner = payload[k];
    if (isObject(inner)) return inner;
    // Some backends return { data: [ { ... } ] } — first array entry.
    if (Array.isArray(inner) && inner.length > 0 && isObject(inner[0])) {
      return inner[0] as Record<string, unknown>;
    }
  }
  // Last resort: assume the top-level object IS the result, even if
  // none of our overall fields matched. The downstream extraction
  // will then surface a null overall — which is the correct
  // "pending" state for a backend that returns metadata without
  // grades.
  return payload;
};

// Try to coerce anything timestamp-shaped into ISO. Returns null for
// unparseable input. Accepts: ISO strings, ms epoch, second epoch,
// `YYYY-MM-DD HH:MM:SS` style.
const coerceTimestampIso = (val: unknown): string | null => {
  if (val == null) return null;
  if (typeof val === 'number') {
    // Heuristic: < year-2001-in-seconds → assume seconds, else ms.
    const ms = val < 1e12 ? val * 1000 : val;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 0) return null;
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
};

// Pulls a string title out of common fields. Falls back to null so
// the caller can compose a default ("Full Mock · Mock #123").
const firstStringFromFields = (
  src: Record<string, unknown>,
  fields: string[],
): string | null => {
  for (const f of fields) {
    const v = src[f];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
};

interface NormalizerContext {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  fallbackTitle?: string;
}

// Top-level entry point. Never throws — returns a MockResult with
// `overall: null` and empty sections/skills arrays for completely
// unrecognizable payloads so the screen can render its "Pending
// grading" empty state rather than crashing.
export const normalizeMockResult = (
  payload: unknown,
  ctx: NormalizerContext,
): MockResult => {
  const inner = unwrapEnvelope(payload);
  const composedDefaultTitle =
    ctx.category === 'Full Mock'
      ? `${ctx.variant === 'full' ? 'Full' : 'Extensive'} Mock #${ctx.mockId}`
      : `${ctx.category} Mock #${ctx.mockId}`;

  if (!inner) {
    // Couldn't even find a working object — return the empty shell
    // so the UI can render its pending state with full context.
    return {
      mockId: ctx.mockId,
      variant: ctx.variant,
      category: ctx.category,
      title: ctx.fallbackTitle ?? composedDefaultTitle,
      overall: null,
      sections: buildSections(ctx.category, {}),
      enablingSkills: [],
      totalQuestions: null,
      attemptedQuestions: null,
      submittedAtIso: null,
      raw: payload,
    };
  }

  const overall = toPteBand(coerceScore(firstFromFields(inner, OVERALL_FIELDS)));
  const sections = buildSections(ctx.category, inner);
  const enablingSkills = buildEnablingSkills(inner);

  const title =
    ctx.fallbackTitle ??
    firstStringFromFields(inner, TITLE_FIELDS) ??
    composedDefaultTitle;

  const submittedAtIso = (() => {
    for (const f of TIMESTAMP_FIELDS) {
      const iso = coerceTimestampIso(inner[f]);
      if (iso) return iso;
    }
    return null;
  })();

  const totalRaw = coerceScore(firstFromFields(inner, TOTAL_Q_FIELDS));
  const attemptedRaw = coerceScore(firstFromFields(inner, ATTEMPTED_Q_FIELDS));

  return {
    mockId: ctx.mockId,
    variant: ctx.variant,
    category: ctx.category,
    title,
    overall,
    sections,
    enablingSkills,
    // Question counts use raw numbers (no PTE banding) — they're
    // counts, not scores. Round defensively in case backend ships
    // floats.
    totalQuestions: totalRaw != null ? Math.round(totalRaw) : null,
    attemptedQuestions: attemptedRaw != null ? Math.round(attemptedRaw) : null,
    submittedAtIso,
    raw: payload,
  };
};

// Always returns four entries for Full Mock (Speaking, Writing,
// Reading, Listening) and one entry for sectional. Missing scores
// are surfaced as `score: null` rather than dropped so the UI can
// render a placeholder card per section.
const buildSections = (
  category: MockSection | 'Full Mock',
  src: Record<string, unknown>,
): SectionScore[] => {
  const sectionsToRender: MockSection[] =
    category === 'Full Mock'
      ? ['Speaking', 'Writing', 'Reading', 'Listening']
      : [category];
  return sectionsToRender.map(section => {
    const raw = coerceScore(firstFromFields(src, SECTION_FIELDS[section]));
    return {
      section,
      score: toPteBand(raw),
      rawPercentage: raw != null && raw <= 1 ? raw : undefined,
    };
  });
};

// Only includes enabling skills the backend actually surfaced (skips
// entries that resolve to null) — keeps the UI rail tidy instead of
// padding it with six "N/A" cards when the backend only returns two.
const buildEnablingSkills = (
  src: Record<string, unknown>,
): EnablingSkillScore[] => {
  const out: EnablingSkillScore[] = [];
  for (const skill of ENABLING_SKILL_FIELDS) {
    const raw = coerceScore(firstFromFields(src, skill.fields));
    if (raw != null) {
      out.push({ name: skill.name, score: toPteBand(raw) });
    }
  }
  return out;
};

// ── PastMock normalizer ──────────────────────────────────────────────
//
// Per-entry parser for the MOCK_RESULT / EXTENSIVE_MOCK_RESULT list
// endpoints. Defensive — we don't have a locked schema for these
// either, so we walk the same field-alias catalog the per-test
// normalizer uses + a couple of list-specific aliases. Drops entries
// without a usable `mockId` (nothing to navigate to) and returns
// null for those so the caller can `.filter(Boolean)` them out.

// Numeric category code → human label. Same mapping the runner's
// `normalizePendingMock` uses; duplicated rather than imported to
// keep MockTestResult independent of MockTestRunner internals
// (this file already imports types but no helpers from runner).
const PAST_CATEGORY_CODE_TO_LABEL: Record<number, MockSection | 'Full Mock'> = {
  1: 'Speaking',
  2: 'Writing',
  3: 'Reading',
  4: 'Listening',
  5: 'Full Mock',
};

const PAST_MOCK_ID_FIELDS = ['mock_id', 'mockId', 'id', 'mock', 'test_id'];
const PAST_CATEGORY_FIELDS = ['category', 'cat', 'category_id', 'section', 'type'];
const PAST_TITLE_FIELDS = [
  'title',
  'mock_title',
  'mock_name',
  'name',
  'test_title',
  'label',
];

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

export interface PastMockNormalizerContext {
  variant: MockTestVariant;
}

export const normalizePastMock = (
  rawEntry: unknown,
  ctx: PastMockNormalizerContext,
): PastMock | null => {
  if (!isPlainObject(rawEntry)) return null;

  // Mock id is the single required field — without it the rail card
  // has nowhere to navigate. Accept any non-empty string or finite
  // number, mirroring `normalizePendingMock`'s contract so the rail
  // composer (`${variant}-${mockId}`) produces stable keys for both.
  let mockId: number | string | null = null;
  for (const f of PAST_MOCK_ID_FIELDS) {
    const v = rawEntry[f];
    if (typeof v === 'number' && Number.isFinite(v)) {
      mockId = v;
      break;
    }
    if (typeof v === 'string' && v.trim().length > 0) {
      mockId = v.trim();
      break;
    }
  }
  if (mockId == null) return null;

  // Category — number code OR string label. Default 'Full Mock' to
  // match the way most past mocks ship out of PTE backends; the rail
  // card surfaces this so a wrong default is visible at a glance.
  let category: MockSection | 'Full Mock' = 'Full Mock';
  for (const f of PAST_CATEGORY_FIELDS) {
    const v = rawEntry[f];
    if (v == null) continue;
    const asNum = Number(v);
    if (Number.isFinite(asNum) && PAST_CATEGORY_CODE_TO_LABEL[asNum]) {
      category = PAST_CATEGORY_CODE_TO_LABEL[asNum];
      break;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (
        trimmed === 'Speaking' ||
        trimmed === 'Writing' ||
        trimmed === 'Reading' ||
        trimmed === 'Listening' ||
        trimmed === 'Full Mock'
      ) {
        category = trimmed;
        break;
      }
    }
  }

  // Overall score — reuses the per-test normalizer's helpers. PTE
  // banding (10-90) applies so the rail card never paints an out-of-
  // range value; `null` = pending grading, surfaced as "Pending" in
  // the UI rather than an awkward 0.
  const overallRaw = coerceScore(firstFromFields(rawEntry, OVERALL_FIELDS));
  const overall = toPteBand(overallRaw);

  // Title — backend-provided or composed default. Same composition
  // rule the per-test normalizer uses so the rail card and the
  // detail screen header read consistently for the same mock.
  const title =
    firstStringFromFields(rawEntry, PAST_TITLE_FIELDS) ??
    (category === 'Full Mock'
      ? `${ctx.variant === 'full' ? 'Full' : 'Extensive'} Mock #${mockId}`
      : `${category} Mock #${mockId}`);

  // Submitted-at timestamp — reuses the per-test normalizer's
  // catalog of common timestamp field names.
  let submittedAtIso: string | null = null;
  for (const f of TIMESTAMP_FIELDS) {
    const iso = coerceTimestampIso(rawEntry[f]);
    if (iso) {
      submittedAtIso = iso;
      break;
    }
  }

  // Phase 6.1 — Opportunistic section-score extraction. The list
  // endpoint sometimes ships per-section scores in the same payload
  // as the overall (saves a round-trip vs MOCK_SCORE/{id} per row).
  // When fields aren't present they stay null and the Progress
  // dashboard's per-section trend chart just renders empty/dashed
  // bars for that section — no UI breakage.
  //
  // Sectional mocks (extensive) are a special case: their `overall`
  // IS the score for their one section. Mirror it into
  // `sectionScores` so the per-section trend chart can still plot
  // them alongside Full Mock data.
  const sectionScores: Partial<Record<MockSection, PteScore>> = {};
  const SECTIONS: MockSection[] = ['Speaking', 'Writing', 'Reading', 'Listening'];
  if (category === 'Full Mock') {
    for (const section of SECTIONS) {
      const raw = coerceScore(firstFromFields(rawEntry, SECTION_FIELDS[section]));
      const banded = toPteBand(raw);
      if (banded != null) sectionScores[section] = banded;
    }
  } else if (overall != null) {
    // Sectional mock — mirror overall into the matching section so
    // the per-section trend chart can include extensive Speaking
    // mocks in the Speaking trend, etc.
    sectionScores[category] = overall;
  }

  return {
    mockId,
    variant: ctx.variant,
    category,
    title,
    overall,
    sectionScores,
    submittedAtIso,
    raw: rawEntry,
  };
};

// Display helper for the score band → label. Used by both the
// overall card and per-section cards. Bands match the PTE official
// score interpretation rubric.
export const describeScoreBand = (score: PteScore): string => {
  if (score == null) return 'Pending';
  if (score >= 79) return 'Expert';
  if (score >= 65) return 'Very Good';
  if (score >= 50) return 'Good';
  if (score >= 36) return 'Modest';
  return 'Limited';
};
