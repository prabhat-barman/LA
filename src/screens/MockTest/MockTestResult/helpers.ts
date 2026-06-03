import { resolveImageUrl } from '../../../utils/mediaUrls';
import type { MockSection, MockTestVariant } from '../MockTestRunner/types';
import type {
  EnablingSkillScore,
  MockResult,
  MockResultUserInfo,
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
  'total', // ← backend ships `data.total` for the headline number
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
    // Note: backend ships a typo `writting` in the `com` block —
    // legacy ScoreCardScreen.js line 220 maps `data.com.writting` →
    // "writing". Accept it here so the section card renders the
    // real score instead of an empty placeholder.
    'writting',
    'writting_score',
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
    // Backend's `data.enable.vocab` (shortened) is the live field —
    // legacy spelling-out aliases kept for older fixtures.
    fields: ['vocab', 'vocabulary', 'vocabulary_score', 'enabling_vocabulary'],
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

// Composes the default headline label used when backend didn't ship
// one in `data.text`. Mirrors the title default rule so the two
// labels read consistently.
const composeScoreLabel = (
  category: MockSection | 'Full Mock',
): string =>
  category === 'Full Mock' ? 'Mock Test Score' : `${category} Score`;

// Reads the `user_data` block (top-level on the raw payload, peer
// of `data`). Resolves the avatar path through resolveImageUrl so
// the UI can render `<Image source={{ uri }}>` directly. All fields
// default to null when missing.
const extractUserInfo = (rawPayload: unknown): MockResultUserInfo => {
  const empty: MockResultUserInfo = {
    firstName: null,
    lastName: null,
    imageUrl: null,
    email: null,
    dob: null,
    countryResidence: null,
    countryCitizenship: null,
  };
  if (!isObject(rawPayload)) return empty;
  const userData = rawPayload.user_data;
  if (!isObject(userData)) return empty;

  const stringOrNull = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    // Backend sometimes ships the literal string "null" — treat it
    // as missing, not as a value (mirrors legacy formatUserName).
    if (trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  };

  const rawImage = stringOrNull(userData.image);
  // resolveImageUrl handles the `/storage/...` profile path shape
  // the backend ships — see mediaUrls.ts for the rules.
  const imageUrl = rawImage ? resolveImageUrl(rawImage) : null;

  return {
    firstName: stringOrNull(userData.first_name),
    lastName: stringOrNull(userData.last_name),
    imageUrl: imageUrl || null,
    email: stringOrNull(userData.email),
    dob: stringOrNull(userData.dob),
    countryResidence: stringOrNull(userData.country_residence),
    countryCitizenship: stringOrNull(userData.country_citizenship),
  };
};

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
  const userInfo = extractUserInfo(payload);

  if (!inner) {
    // Couldn't even find a working object — return the empty shell
    // so the UI can render its pending state with full context.
    return {
      mockId: ctx.mockId,
      variant: ctx.variant,
      category: ctx.category,
      title: ctx.fallbackTitle ?? composedDefaultTitle,
      scoreLabel: composeScoreLabel(ctx.category),
      overall: null,
      sections: buildSections(ctx.category, {}),
      enablingSkills: [],
      totalQuestions: null,
      attemptedQuestions: null,
      submittedAtIso: null,
      userInfo,
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
  // Backend's `data.text` is the headline label that sits under the
  // overall number (e.g. "Speaking Score"). Fall back to a composed
  // default keyed on category so the layout stays consistent when
  // the backend omits it.
  const scoreLabel =
    firstStringFromFields(inner, ['text', 'score_label', 'label']) ??
    composeScoreLabel(ctx.category);

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
    scoreLabel,
    overall,
    sections,
    enablingSkills,
    // Question counts use raw numbers (no PTE banding) — they're
    // counts, not scores. Round defensively in case backend ships
    // floats.
    totalQuestions: totalRaw != null ? Math.round(totalRaw) : null,
    attemptedQuestions: attemptedRaw != null ? Math.round(attemptedRaw) : null,
    submittedAtIso,
    userInfo,
    raw: payload,
  };
};

// Always returns four entries for Full Mock (Speaking, Writing,
// Reading, Listening) and one entry for sectional. Missing scores
// are surfaced as `score: null` rather than dropped so the UI can
// render a placeholder card per section.
//
// Backend nests per-section scores under `data.com` (legacy
// ScoreCardScreen.js:213). We probe `src.com` FIRST so the real
// numbers win; the flat fallback covers older test fixtures and
// hypothetical future backends that hoist the scores up a level.
const buildSections = (
  category: MockSection | 'Full Mock',
  src: Record<string, unknown>,
): SectionScore[] => {
  const sectionsToRender: MockSection[] =
    category === 'Full Mock'
      ? ['Speaking', 'Writing', 'Reading', 'Listening']
      : [category];
  const comBlock = isObject(src.com) ? src.com : null;
  return sectionsToRender.map(section => {
    const fromCom = comBlock
      ? coerceScore(firstFromFields(comBlock, SECTION_FIELDS[section]))
      : null;
    const raw =
      fromCom != null
        ? fromCom
        : coerceScore(firstFromFields(src, SECTION_FIELDS[section]));
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
//
// Same nesting trick as `buildSections` — backend ships enabling
// skills under `data.enable`. Flat fallback supports test fixtures.
const buildEnablingSkills = (
  src: Record<string, unknown>,
): EnablingSkillScore[] => {
  const enableBlock = isObject(src.enable) ? src.enable : null;
  const out: EnablingSkillScore[] = [];
  for (const skill of ENABLING_SKILL_FIELDS) {
    const fromEnable = enableBlock
      ? coerceScore(firstFromFields(enableBlock, skill.fields))
      : null;
    const raw =
      fromEnable != null
        ? fromEnable
        : coerceScore(firstFromFields(src, skill.fields));
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

  const nestedMock =
    rawEntry.mock && typeof rawEntry.mock === 'object' && !Array.isArray(rawEntry.mock)
      ? (rawEntry.mock as Record<string, unknown>)
      : null;

  // Coerces a candidate field value into the canonical id format
  // (finite number OR non-empty trimmed string). Returns null for
  // anything else. Hoisted so both `mockId` and `resultId` extraction
  // share the exact same shape rules.
  const coerceId = (v: unknown): number | string | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    return null;
  };

  // Mock id is the question-set identifier. Prefer the nested
  // `mock.id` shape (legacy backend ships it this way), then fall
  // back to flat fields. Mirrors `normalizePendingMock`'s contract
  // so the rail composer (`${variant}-${mockId}`) produces stable
  // keys for both rails.
  let mockId: number | string | null = null;
  const sources = nestedMock ? [nestedMock, rawEntry] : [rawEntry];
  for (const src of sources) {
    for (const f of PAST_MOCK_ID_FIELDS) {
      const found = coerceId(src[f]);
      if (found != null) {
        mockId = found;
        break;
      }
    }
    if (mockId != null) break;
  }
  if (mockId == null) return null;

  // Result-row id is what MOCK_SCORE / MOCK_ANALYSIS expect in the
  // URL. It's the OUTER row's own primary key (NOT the nested
  // `mock.id`) — calling `mock/score/{mock.id}` returns null and the
  // PHP backend throws an NPE on `user_id` access. Mirrors legacy
  // `MockTestResultScreen.js:228` which passes `item?.id` (outer)
  // to ScoreCardScreen.
  //
  // We deliberately read ONLY from the outer entry (not the nested
  // `mock` object) for `id`/`result_id`/`user_mock_id` so we never
  // confuse the row id with the mock master id. Falls back to
  // `mockId` for legacy/dummy data that doesn't expose a row id.
  let resultId: number | string | null = null;
  for (const f of ['result_id', 'resultId', 'user_mock_id', 'attempt_id', 'id']) {
    const found = coerceId(rawEntry[f]);
    if (found != null) {
      resultId = found;
      break;
    }
  }
  // Last-resort fallback: if the payload truly has no separate row
  // id, use mockId. This keeps tests + legacy fixtures working
  // while preferring the correct id when both are present.
  if (resultId == null) resultId = mockId;

  // Category — number code OR string label. Default 'Full Mock' to
  // match the way most past mocks ship out of PTE backends; the rail
  // card surfaces this so a wrong default is visible at a glance.
  let category: MockSection | 'Full Mock' = 'Full Mock';
  let categoryFound = false;
  for (const src of sources) {
    for (const f of PAST_CATEGORY_FIELDS) {
      const rawCategory = src[f];
      if (rawCategory == null) continue;

      const categoryVal =
        rawCategory && typeof rawCategory === 'object' && !Array.isArray(rawCategory)
          ? (rawCategory as Record<string, unknown>).id ?? (rawCategory as Record<string, unknown>).category_id ?? rawCategory
          : rawCategory;

      const asNum = Number(categoryVal);
      if (Number.isFinite(asNum) && PAST_CATEGORY_CODE_TO_LABEL[asNum]) {
        category = PAST_CATEGORY_CODE_TO_LABEL[asNum];
        categoryFound = true;
        break;
      }
      if (typeof categoryVal === 'string') {
        const trimmed = categoryVal.trim();
        if (
          trimmed === 'Speaking' ||
          trimmed === 'Writing' ||
          trimmed === 'Reading' ||
          trimmed === 'Listening' ||
          trimmed === 'Full Mock'
        ) {
          category = trimmed;
          categoryFound = true;
          break;
        }
      }
    }
    if (categoryFound) break;
  }

  // Overall score — reuses the per-test normalizer's helpers. PTE
  // banding (10-90) applies so the rail card never paints an out-of-
  // range value; `null` = pending grading, surfaced as "Pending" in
  // the UI rather than an awkward 0.
  const overallVal =
    firstFromFields(rawEntry, OVERALL_FIELDS) ??
    (nestedMock ? firstFromFields(nestedMock, OVERALL_FIELDS) : null);
  const overallRaw = coerceScore(overallVal);
  const overall = toPteBand(overallRaw);

  // Title — backend-provided or composed default. Same composition
  // rule the per-test normalizer uses so the rail card and the
  // detail screen header read consistently for the same mock.
  const titleVal =
    firstStringFromFields(rawEntry, PAST_TITLE_FIELDS) ??
    (nestedMock ? firstStringFromFields(nestedMock, PAST_TITLE_FIELDS) : null);
  const title =
    titleVal ??
    (category === 'Full Mock'
      ? `${ctx.variant === 'full' ? 'Full' : 'Extensive'} Mock #${mockId}`
      : `${category} Mock #${mockId}`);

  // Submitted-at timestamp — reuses the per-test normalizer's
  // catalog of common timestamp field names.
  let submittedAtIso: string | null = null;
  for (const src of sources) {
    for (const f of TIMESTAMP_FIELDS) {
      const iso = coerceTimestampIso(src[f]);
      if (iso) {
        submittedAtIso = iso;
        break;
      }
    }
    if (submittedAtIso) break;
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
      const val =
        firstFromFields(rawEntry, SECTION_FIELDS[section]) ??
        (nestedMock ? firstFromFields(nestedMock, SECTION_FIELDS[section]) : null);
      const raw = coerceScore(val);
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
    resultId,
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
