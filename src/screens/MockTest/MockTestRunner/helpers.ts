import { resolveAudioUrl, resolveImageUrl } from '../../../utils/mediaUrls';
import {
  DEFAULT_SECTION_DURATION_SEC,
  SUBCATEGORY_TO_ANSWER_KIND,
  SUBCATEGORY_TO_SECTION,
  SUBMIT_MAX_RETRIES,
} from './constants';
import type {
  AnswerDraft,
  AnswerKind,
  MockSection,
  MockSession,
  MockTestVariant,
  PendingMock,
  Question,
  SubcategoryId,
  SubmitContext,
} from './types';

// Single lookup helpers — kept as thin wrappers so call sites don't
// have to import the constants directly (easier to swap the data
// source later, e.g. if subcategory mapping moves server-side).

export const getAnswerKind = (subcategoryId: SubcategoryId): AnswerKind =>
  SUBCATEGORY_TO_ANSWER_KIND[subcategoryId];

export const getSection = (subcategoryId: SubcategoryId): MockSection =>
  SUBCATEGORY_TO_SECTION[subcategoryId];

// Resolves a section's duration in seconds, falling back to the PTE
// standard default when the backend hands us a missing / zero value.
// Returns the resolved value plus a flag so callers can log when the
// fallback fired (we want to know if the backend silently regresses).
export const resolveSectionDuration = (
  section: MockSection,
  backendDurationSec: number | null | undefined,
): { durationSec: number; usedFallback: boolean } => {
  const n = Number(backendDurationSec);
  if (Number.isFinite(n) && n > 0) {
    return { durationSec: n, usedFallback: false };
  }
  return {
    durationSec: DEFAULT_SECTION_DURATION_SEC[section],
    usedFallback: true,
  };
};

// True when the next question (if any) belongs to a different section.
// Used to decide whether the runner should pop a section-break screen
// or just advance to the next question.
export const isLastInSection = (
  questions: Pick<Question, 'subcategory_id'>[],
  index: number,
): boolean => {
  if (index < 0 || index >= questions.length) return true;
  if (index === questions.length - 1) return true;
  return (
    getSection(questions[index].subcategory_id) !==
    getSection(questions[index + 1].subcategory_id)
  );
};

// Walks the questions list once and returns the contiguous section
// ranges that drive the per-section timer + break overlay.
//
// Why pre-compute this in the normalizer instead of deriving lazily?
// Two reasons:
//   1. The runner re-renders on every tick of the section timer and
//      every keystroke in writing-style answers. Re-scanning the
//      question list 60+ times a second is wasteful.
//   2. Section duration resolution involves a per-section fallback
//      (backend may omit any section). Doing that once at session
//      load means we log "fallback fired" warnings once per section
//      instead of spamming them on every render.
//
// `sectionDurationsSec` is partial — when a section is missing we
// fall back to the PTE default via `resolveSectionDuration`. The
// returned ranges are always contiguous (no gaps) and cover the
// whole `questions` array.
export const buildSectionRanges = (
  questions: Pick<Question, 'subcategory_id'>[],
  sectionDurationsSec: Partial<Record<MockSection, number>>,
): Array<{
  section: MockSection;
  startIndex: number;
  endIndex: number;
  durationSec: number;
}> => {
  if (questions.length === 0) return [];

  const ranges: Array<{
    section: MockSection;
    startIndex: number;
    endIndex: number;
    durationSec: number;
  }> = [];

  let cursor = 0;
  while (cursor < questions.length) {
    const section = getSection(questions[cursor].subcategory_id);
    let end = cursor;
    while (
      end + 1 < questions.length &&
      getSection(questions[end + 1].subcategory_id) === section
    ) {
      end += 1;
    }
    const { durationSec } = resolveSectionDuration(
      section,
      sectionDurationsSec[section] ?? null,
    );
    ranges.push({
      section,
      startIndex: cursor,
      endIndex: end,
      durationSec,
    });
    cursor = end + 1;
  }

  return ranges;
};

// Finds the index in `sectionRanges` that contains the given question
// index. Linear scan, O(sections) — sections cap at 4 for Full Mock so
// faster than a Map lookup. Returns 0 when the question is before any
// range, last index when past the end (defensive: keeps the runner's
// section state in a valid bucket even if `currentIndex` somehow runs
// past `questions.length - 1`).
export const findSectionIndexForQuestion = (
  sectionRanges: ReadonlyArray<{ startIndex: number; endIndex: number }>,
  questionIndex: number,
): number => {
  if (sectionRanges.length === 0) return 0;
  for (let i = 0; i < sectionRanges.length; i += 1) {
    const r = sectionRanges[i];
    if (questionIndex >= r.startIndex && questionIndex <= r.endIndex) {
      return i;
    }
  }
  return questionIndex < sectionRanges[0].startIndex
    ? 0
    : sectionRanges.length - 1;
};

// PTE Academic real-exam convention: after the Reading section ends
// and before Listening starts, the test offers an OPTIONAL 10-min
// break. Skipping it just continues to Listening immediately; the
// timer doesn't carry over and the section timer doesn't start
// counting until the user dismisses the overlay (or it auto-expires).
//
// Sectional mocks never see this — single-section variants short-
// circuit out of the section-break path long before this helper runs.
// We still gate by variant === 'full' as belt-and-suspenders so a
// future "sectional Reading+Listening combo" variant doesn't trip it.
export const OPTIONAL_LISTENING_BREAK_SEC = 10 * 60;

export const shouldOfferOptionalBreak = (
  completedSection: MockSection,
  nextSection: MockSection,
  variant: MockTestVariant,
): boolean =>
  variant === 'full' &&
  completedSection === 'Reading' &&
  nextSection === 'Listening';

// Whether the user has provided "enough" of an answer for Next to be
// enabled. This is intentionally lenient — backends typically accept
// partial answers; we just want to stop accidental empty submits.
export const isAnswerComplete = (draft: AnswerDraft): boolean => {
  switch (draft.kind) {
    case 'speaking':
      return draft.audioFilePath.length > 0 && draft.durationSec > 0;
    case 'writing':
      return draft.text.trim().length > 0;
    case 'mcq-single':
      return draft.selectedId !== null && draft.selectedId.length > 0;
    case 'mcq-multi':
      return draft.selectedIds.length > 0;
    case 'reorder':
      return draft.orderedIds.length > 0;
    case 'fib-bank':
    case 'fib-dropdown':
      // Dropdown / bank FIB accept partial answers — backend scores
      // per blank, so we enable Next as soon as the user has filled
      // at least one. Matches the reference project's gate for both
      // the per-blank dropdown (sub 12) and the drag-bank (sub 11).
      return draft.values.some(v => v !== null && v.length > 0);
    case 'fib-input':
      // Text-input FIB requires every blank to be typed. Sub 16
      // (Listening "Fill in the blanks") plays an audio with N
      // missing words and the user is expected to fill all of them.
      return (
        draft.values.length > 0 &&
        draft.values.every(v => v.trim().length > 0)
      );
    case 'highlight':
      return draft.selectedIndices.length > 0;
    case 'empty':
      return false;
  }
};

// Exponential backoff for the submit queue. Returns the delay in ms
// for the Nth retry attempt (1-indexed), or null when the attempt is
// out of range. After `SUBMIT_MAX_RETRIES` the queue marks the item
// as failed instead of retrying again.
export const getRetryDelayMs = (attempt: number): number | null => {
  if (!Number.isFinite(attempt)) return null;
  if (attempt < 1 || attempt > SUBMIT_MAX_RETRIES) return null;
  return 1000 * Math.pow(2, attempt - 1);
};

// HH:MM:SS / MM:SS formatter used by the timer pill in the runner
// header. Negative and non-finite inputs are coerced to "0:00" to
// keep the UI from ever flashing "-1:42" during a tick race.
export const formatRemainingTime = (totalSec: number): string => {
  const safe =
    Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

// MM:SS formatter for the `duration[]` field on speaking submissions.
// Backend example payload shows "00:30" for a 30-second recording, so
// we always pad both halves. Mirrors what the legacy mock-test client
// sends on the wire.
export const formatDurationMMSS = (totalSec: number): string => {
  const safe =
    Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
};

// Stable queue-item id. Mock id + question id together are unique
// across an attempt; using both means retrying the same answer never
// produces a duplicate row in the queue.
export const buildQueueItemId = (
  mockId: number | string,
  questionId: number | string,
): string => `${mockId}-${questionId}`;

// Renders the user's selection in the shape the backend's `selected[]`
// field wants — comma-joined string for multi-value answers, plain
// value for single-pick. Returns null when there is no selection so
// callers can choose between sending `""` vs omitting the field.
export const buildSelectedString = (draft: AnswerDraft): string | null => {
  switch (draft.kind) {
    case 'mcq-single':
      return draft.selectedId;
    case 'mcq-multi':
      return draft.selectedIds.length > 0 ? draft.selectedIds.join(',') : null;
    case 'reorder':
      return draft.orderedIds.length > 0 ? draft.orderedIds.join(',') : null;
    case 'fib-bank':
    case 'fib-dropdown': {
      if (draft.values.length === 0) return null;
      // Empty slots preserved as empty strings so positional
      // decoding on the backend still lines up. NOTE: both bank
      // (sub 11) and dropdown (sub 12) actually want a different
      // (interleaved-with-leading-comma) format on the wire —
      // that's applied centrally in `buildSubmitPayload`, not here,
      // so this helper stays generic.
      return draft.values.map(v => v ?? '').join(',');
    }
    case 'fib-input': {
      if (draft.values.length === 0) return null;
      return draft.values.join(',');
    }
    case 'highlight':
      // Backend wants the user-picked WORDS, not their indices —
      // scoring cross-references against the cAns spans in the
      // original answer markup. `selectedWords` and `selectedIndices`
      // are parallel; the component is responsible for keeping them
      // in lockstep.
      return draft.selectedWords.length > 0
        ? draft.selectedWords.join(',')
        : null;
    case 'writing':
    case 'speaking':
    case 'empty':
      return null;
  }
};

// Word count for writing answers — used to populate `length[]`.
// Counts runs of non-whitespace; matches the typical PTE word-count
// heuristic well enough for backend validation.
export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
};

// Fill-in-the-blank question parser. The backend ships the question
// text with two kinds of markers:
//   • `<span id='cAns'>WORD</span>` — wraps the *correct* word for
//     each blank. We strip these for the runner display (the user
//     shouldn't see the answers) but keep the surrounding text intact.
//   • `__add_blank__` — a sentinel where the dropdown / text input
//     should be rendered. The whole text is split on this marker to
//     produce the text segments around the blanks.
//
// Per FIB variant:
//   • sub 12 (dropdown) — backend ships per-blank choices on
//     `r.option[i].options` as a comma-separated string. Each blank
//     gets ITS OWN list. `mode = 'dropdown'`.
//   • sub 11 (bank) — backend ships the same `r.option[i].options`
//     structure, but the user picks from a SHARED flat bank pooled
//     across all entries. `mode = 'bank'`.
//   • sub 16 (input) — no per-blank choices, no bank. The user types
//     freely. `mode = 'input'`.
//
// Returns null when the question text is unparseable so the caller
// can degrade gracefully (the question will then render via the
// unsupported placeholder rather than crashing the runner).
export type FibParseMode = 'bank' | 'dropdown' | 'input';

export const parseFibQuestion = (
  rawText: string | undefined,
  rawOptions: unknown[],
  mode: FibParseMode,
): {
  parts: string[];
  blanks: { id: string; choices?: string[] }[];
  bank?: string[];
} | null => {
  if (typeof rawText !== 'string' || rawText.length === 0) return null;

  // Strip the `cAns` spans entirely — they wrap the correct answer
  // and have no place in the user-facing prompt.
  const stripped = rawText.replace(
    /<span id=['"]cAns['"]>([^<]*)<\/span>/g,
    '',
  );

  // Split on the blank sentinel. `parts.length` is always
  // `blankCount + 1` even when blanks are at the very start or end
  // (split inserts empty strings at the edges).
  const parts = stripped.split(/__add_blank__/g);
  const blankCount = parts.length - 1;
  if (blankCount <= 0) return null;

  // Backend's option entries look like
  // `{ id, question_id, options: "a, b, c" }`. We extract the per-
  // entry choice list once and reuse it for both blank.choices
  // (dropdown mode) and the bank (bank mode).
  const perEntryChoices: string[][] = [];
  const blanks: { id: string; choices?: string[] }[] = [];
  for (let i = 0; i < blankCount; i += 1) {
    const rawOpt = rawOptions[i];
    const opt =
      rawOpt && typeof rawOpt === 'object'
        ? (rawOpt as Record<string, unknown>)
        : undefined;
    // Use the backend option id when present (stable across re-
    // renders) and fall back to the index otherwise — keeps key
    // continuity for FlatList / controlled inputs.
    const id =
      opt && (typeof opt.id === 'string' || typeof opt.id === 'number')
        ? String(opt.id)
        : `blank-${i}`;

    const rawChoices = typeof opt?.options === 'string' ? opt.options : '';
    const choices = rawChoices
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    perEntryChoices.push(choices);

    if (mode === 'dropdown') {
      blanks.push({ id, choices });
    } else {
      blanks.push({ id });
    }
  }

  if (mode === 'bank') {
    // Flatten every entry's choices into a single bank. Duplicates
    // are preserved — the reference component doesn't dedupe and
    // PTE Reading FIB will sometimes legitimately ship the same
    // word in multiple entries.
    const bank = perEntryChoices.flat();
    return { parts, blanks, bank };
  }

  return { parts, blanks };
};

// Per-PTE the backend uses two distinct wire formats for the
// `selected[]` field of FIB submissions:
//   • Subs 11, 12 (Reading FIB / R&W FIB dropdown) — interleaved
//     with a *leading* comma per value: `,a,,b,,c` (so odd indices
//     in the resulting CSV carry the values). The PHP server-side
//     parser only reads odd-indexed positions for these types.
//   • Sub 16 (Listening text-input FIB) — plain `a,b,c`.
//
// Exposed so `buildSubmitPayload` can swap the value in for sub
// 11/12 without duplicating the comma-prefix dance.
export const buildInterleavedFibSelected = (
  values: ReadonlyArray<string | null>,
): string => values.map(v => `,${v ?? ''}`).join(',');

// Tokenizes the highlight question's answer markup into the flat
// list of displayable words. Strips all HTML tags (replacing them
// with a single space so adjacent text segments stay separated) and
// splits on whitespace. The cAns span content is preserved as a
// regular token because in PTE the user sees ALL words inline and
// has to pick the ones they consider incorrect.
//
// Returns an empty array for null / non-string input rather than
// throwing so the HighlightQuestion component degrades gracefully.
export const tokenizeHighlightAnswer = (raw: string | undefined): string[] => {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  // Replace `&nbsp;` with a space *before* stripping tags so we don't
  // accidentally glue tokens together when the backend ships
  // non-breaking spaces between words.
  const text = raw.replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, ' ');
  return text
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
};

// ── Backend response normalization ─────────────────────────────────

// Known subcategory ids — used to defensively narrow `unknown` values
// from the API into our `SubcategoryId` union. Anything outside this
// set gets logged and dropped by the normalizer.
const VALID_SUBCATEGORY_IDS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
]);

// Safe `unknown → string | undefined` cast that strips falsy / non-string
// values. The backend occasionally returns `null` / numbers in fields
// the runner expects as strings (title, prompt) — this normalizes that
// into a single optional-string contract.
const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

// Picks the first defined string from a list of candidate keys on a
// raw object. Used by the normalizer to handle the multiple legacy
// aliases the backend ships (e.g. `question` vs `q_text`).
const pickString = (
  raw: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const k of keys) {
    const v = asString(raw[k]);
    if (v !== undefined) return v;
  }
  return undefined;
};

// Normalizes one raw question record from the mock-test detail
// response into the runner's internal `Question` shape. Returns null
// when the record can't be salvaged (missing id or unknown subcategory),
// so the caller can drop and log instead of crashing the runner.
export const normalizeQuestion = (raw: unknown): Question | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const rawId = r.id ?? (r.pivot as Record<string, unknown> | undefined)?.question_id;
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : null;
  if (id === null) return null;

  const subRaw = r.subcategory_id ?? r.subcategoryId;
  const subNum = Number(subRaw);
  if (!Number.isFinite(subNum) || !VALID_SUBCATEGORY_IDS.has(subNum)) {
    return null;
  }
  const subcategory_id = subNum as SubcategoryId;

  return {
    id,
    subcategory_id,
    kind: getAnswerKind(subcategory_id),
    title: pickString(r, 'title', 'q_title', 'question_title', 'name'),
    prompt: pickString(r, 'question', 'question_mcq', 'mcq_question', 'q_text'),
    paragraph: pickString(r, 'paragraph', 'text', 'q_text'),
    // Backend ships a confusing mix of absolute URLs, bucket-relative
    // paths (`/ptedata/ptemedia/x.wav`), and bare filenames. Native
    // <Image> and the audio player only accept absolute URIs, so we
    // resolve once here — keeping components agnostic of the various
    // S3 / API host conventions. `resolveAudioUrl` returns '' when the
    // input is empty, which we coerce back to `undefined` so the
    // `Question` contract (optional, never empty-string) stays clean.
    //
    // Describe Image (subcategory 3) ships its image under `media_link`
    // and `SpeakingQuestion` uses `audioUrl` as the image source — so
    // we route the audio slot through the *image* resolver in that one
    // case to avoid mis-classifying an image as a ptemedia audio file.
    imageUrl:
      resolveImageUrl(
        pickString(r, 'image_link', 'q_image', 'question_image', 'image_file'),
      ) || undefined,
    audioUrl: (() => {
      const raw = pickString(
        r,
        'audio_file',
        'q_audio',
        'question_audio',
        'media_link',
        'audio',
      );
      const resolved =
        subcategory_id === 3 ? resolveImageUrl(raw) : resolveAudioUrl(raw);
      return resolved || undefined;
    })(),
    options: Array.isArray(r.option)
      ? (r.option as unknown[]).flatMap(o => {
          if (!o || typeof o !== 'object') return [];
          const opt = o as Record<string, unknown>;
          const optId = opt.id ?? opt.option_id;
          const text = asString(opt.options) ?? asString(opt.text);
          if ((typeof optId !== 'string' && typeof optId !== 'number') || !text) return [];
          return [{ id: String(optId), text }];
        })
      : undefined,
    // Highlight (subcategory 19) renders the corrupted paragraph
    // shipped under `answer`. Captured for every question kind for
    // simplicity — components that don't need it will just ignore it.
    answerMarkup: pickString(r, 'answer'),
    // Pre-parse FIB structure for subs 11, 12, 16. Done eagerly
    // here (rather than at render time in the component) so the
    // runner's single source of truth for question shape lives in
    // the normalizer and the parser logic is easy to unit-test.
    fib: (() => {
      const mode: 'bank' | 'dropdown' | 'input' | null =
        subcategory_id === 11
          ? 'bank'
          : subcategory_id === 12
            ? 'dropdown'
            : subcategory_id === 16
              ? 'input'
              : null;
      if (mode === null) return undefined;
      return (
        parseFibQuestion(
          pickString(r, 'question', 'q_text'),
          Array.isArray(r.option) ? (r.option as unknown[]) : [],
          mode,
        ) ?? undefined
      );
    })(),
    raw,
  };
};

// Treats the backend's `time` field as MINUTES (matches the mock-test
// list endpoint), with a heuristic for the rare case it ships seconds:
// anything > 1000 is almost certainly already seconds, since 1000 min
// = ~17 hours which doesn't correspond to any real PTE test.
export const resolveTotalDurationSec = (rawTime: unknown): number => {
  const n = Number(rawTime);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1000 ? Math.floor(n) : Math.floor(n * 60);
};

// Normalizes the full `MOCK_TEST_DETAIL` response into a runner-ready
// session. Returns `null` if the response shape is unrecoverable.
//
// Defensive on purpose: backend ships several legacy aliases for the
// same fields and the runner crashing on a malformed payload is much
// worse than silently dropping a malformed question.
export const normalizeMockTestDetail = (
  rawResponse: unknown,
  ctx: {
    mockId: number | string;
    variant: MockTestVariant;
    category: MockSection | 'Full Mock';
  },
): MockSession | null => {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  const root = rawResponse as Record<string, unknown>;

  // The mock detail typically lives at `data.mock` but defensively
  // accept the older flat shape where everything is at the root.
  const dataNode =
    (root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root) ?? root;
  const mockNode =
    (dataNode.mock && typeof dataNode.mock === 'object'
      ? (dataNode.mock as Record<string, unknown>)
      : dataNode) ?? dataNode;

  const rawQuestions = Array.isArray(mockNode.question)
    ? mockNode.question
    : Array.isArray(mockNode.questions)
      ? mockNode.questions
      : [];

  const questions: Question[] = [];
  for (const q of rawQuestions) {
    const normalized = normalizeQuestion(q);
    if (normalized) questions.push(normalized);
  }

  if (questions.length === 0) return null;

  const startIndexRaw = Number(dataNode.curr_q);
  const startIndex =
    Number.isFinite(startIndexRaw) && startIndexRaw > 0
      ? Math.min(Math.floor(startIndexRaw), questions.length - 1)
      : 0;

  const totalDurationSec = resolveTotalDurationSec(dataNode.time);

  // Per-section times. Backend ships these under both `mock.X_time`
  // and (in some legacy responses) `data.X_time`, so we check both
  // nodes and accept the first non-zero value. Note the legacy
  // `writting_time` spelling — preserved on purpose, the backend
  // typo is part of the contract.
  const pickSectionSec = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const raw = (mockNode as Record<string, unknown>)[key] ??
        (dataNode as Record<string, unknown>)[key];
      const resolved = resolveTotalDurationSec(raw);
      if (resolved > 0) return resolved;
    }
    return undefined;
  };

  const sectionDurationsSec: MockSession['sectionDurationsSec'] = {};
  const speaking = pickSectionSec('speaking_time');
  if (speaking !== undefined) sectionDurationsSec.Speaking = speaking;
  const writing = pickSectionSec('writting_time', 'writing_time');
  if (writing !== undefined) sectionDurationsSec.Writing = writing;
  const reading = pickSectionSec('reading_time');
  if (reading !== undefined) sectionDurationsSec.Reading = reading;
  const listening = pickSectionSec('listening_time');
  if (listening !== undefined) sectionDurationsSec.Listening = listening;

  return {
    mockId: ctx.mockId,
    variant: ctx.variant,
    category: ctx.category,
    totalDurationSec,
    sectionDurationsSec,
    questions,
    startIndex,
    // Eager section-boundary computation so the runner never has to
    // re-scan questions on render. Single-section (sectional) mocks
    // get a single-entry array which makes the break-overlay logic a
    // no-op without any special-casing in the runner.
    sectionRanges: buildSectionRanges(questions, sectionDurationsSec),
  };
};

// Normalizes one entry from PENDING_TEST_LIST / EXTENSIVE_PENDING_TEST_LIST.
// The backend ships these with looser field naming than the mock-detail
// response — we accept any of the legacy aliases for each field and
// drop entries that can't be salvaged (no mock id → nothing to resume).
//
// `variant` is taken from the caller (not the payload) because it
// depends on which endpoint we hit. `category` is best-effort: backend
// may ship it as a numeric `category` code (1..5) or a label
// (`Speaking` / `Full Mock` / …); we normalize both. Missing →
// defaults to 'Full Mock' since full mocks are by far the most common
// resume scenario.
const pickPositiveInt = (
  raw: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const k of keys) {
    const n = Number(raw[k]);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return undefined;
};

const CATEGORY_CODE_TO_LABEL: Record<number, MockSection | 'Full Mock'> = {
  1: 'Speaking',
  2: 'Writing',
  3: 'Reading',
  4: 'Listening',
  5: 'Full Mock',
};

export const normalizePendingMock = (
  rawEntry: unknown,
  ctx: { variant: MockTestVariant },
): PendingMock | null => {
  if (!rawEntry || typeof rawEntry !== 'object') return null;
  const r = rawEntry as Record<string, unknown>;

  const nestedMock =
    r.mock && typeof r.mock === 'object' && !Array.isArray(r.mock)
      ? (r.mock as Record<string, unknown>)
      : null;

  // Mock id is the only truly required field — without it we can't
  // navigate into the runner. Accept any of the common aliases as a
  // non-empty string or a finite number. We check the nested mock first if present.
  const mockIdRaw = nestedMock
    ? (nestedMock.id ?? nestedMock.mock_id ?? nestedMock.mockId ?? r.mock_id ?? r.mockId ?? r.id)
    : (r.mock_id ?? r.mockId ?? r.id ?? r.mock);
  let mockId: number | string;
  if (typeof mockIdRaw === 'number' && Number.isFinite(mockIdRaw)) {
    mockId = mockIdRaw;
  } else if (typeof mockIdRaw === 'string' && mockIdRaw.trim().length > 0) {
    mockId = mockIdRaw;
  } else {
    return null;
  }

  // Resolve category. Backend may ship as numeric code or label.
  let category: MockSection | 'Full Mock' = 'Full Mock';
  const rawCategory = nestedMock ? (nestedMock.category ?? r.category) : r.category;
  const categoryVal =
    rawCategory && typeof rawCategory === 'object' && !Array.isArray(rawCategory)
      ? (rawCategory as Record<string, unknown>).id ?? (rawCategory as Record<string, unknown>).category_id ?? rawCategory
      : rawCategory;

  const catCode = Number(categoryVal);
  if (Number.isFinite(catCode) && CATEGORY_CODE_TO_LABEL[catCode]) {
    category = CATEGORY_CODE_TO_LABEL[catCode];
  } else if (typeof categoryVal === 'string') {
    const labeled = categoryVal.trim();
    if (
      labeled === 'Speaking' ||
      labeled === 'Writing' ||
      labeled === 'Reading' ||
      labeled === 'Listening' ||
      labeled === 'Full Mock'
    ) {
      category = labeled;
    }
  }

  // Current question. Backend uses `curr_q` (0-based) or
  // `current_question` (1-based). Collapse to 0-based — the runner's
  // `currentIndex` is 0-based and we want a single contract there.
  const currZeroBased =
    pickPositiveInt(r, 'curr_q') ??
    (nestedMock ? pickPositiveInt(nestedMock, 'curr_q') : undefined);
  const currOneBased =
    pickPositiveInt(r, 'current_question', 'question_number') ??
    (nestedMock ? pickPositiveInt(nestedMock, 'current_question', 'question_number') : undefined);
  const startQuestionIndex =
    currZeroBased !== undefined
      ? currZeroBased
      : currOneBased !== undefined
        ? Math.max(0, currOneBased - 1)
        : 0;

  // Remaining time. Backend uses `time` (seconds, remaining) or
  // `remaining_time` (also seconds). Default to 0 — the runner will
  // fall back to its session.totalDurationSec when initialSeconds is
  // zero/null, which is the right behaviour for a paused-with-no-
  // time-info attempt.
  const remainingSecondsTotal =
    pickPositiveInt(r, 'time', 'remaining_time', 'time_left', 'time_remaining', 'total_remaining_time') ??
    (nestedMock ? pickPositiveInt(nestedMock, 'time', 'remaining_time', 'time_left', 'time_remaining', 'total_remaining_time') : null) ??
    0;

  const totalQuestions =
    (nestedMock ? pickPositiveInt(nestedMock, 'q_count', 'total_questions', 'question_count', 'question_total') : null) ??
    pickPositiveInt(r, 'q_count', 'total_questions', 'question_count', 'question_total');

  const title =
    (nestedMock ? pickString(nestedMock, 'title', 'mock_name', 'name', 'mock_title') : null) ??
    pickString(r, 'title', 'mock_name', 'name', 'mock_title') ??
    `Mock #${mockId}`;

  return {
    mockId,
    variant: ctx.variant,
    category,
    title,
    startQuestionIndex,
    remainingSecondsTotal,
    totalQuestions,
    raw: rawEntry,
  };
};

// Subcategories grouped by how the backend wants `answer[]` /
// `ans[]` / `q_ans[]` / `correct[]` populated. Pulled verbatim from
// the legacy NormalMockTestScreen mapping (lines 858-886) so the
// wire payload matches the PHP controller's expectations.
//
//   GROUND_TRUTH_ECHO — all four fields = derived ground truth
//     (MCQ, reorder, fill-in-the-blanks, dictation, etc.)
//   GROUND_TRUTH_NULL_ANSWER — answer[]=null, others = ground truth
//     (Read Aloud (1) + Highlight Text 21 — these have no
//      user-supplied option; the backend doesn't expect `answer[]`)
//   HIGHLIGHT (19) — special case in builder body
//   default — fields take the question's raw `answer` field
//     (Repeat Sentence, Retell Lecture, etc.)
const GROUND_TRUTH_ECHO_SUBS: ReadonlySet<SubcategoryId> = new Set<SubcategoryId>([
  8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20,
]);
const GROUND_TRUTH_NULL_ANSWER_SUBS: ReadonlySet<SubcategoryId> = new Set<SubcategoryId>([
  1, 21,
]);

// Speaking subcategories — used to gate which answer-shape fields
// get nulled vs populated. Mirrors `AUDIO_ONLY_SUBCATEGORIES` in
// SpeakingQuestion but for ALL speaking kinds (1..5 + 21, 22).
const SPEAKING_SUBS: ReadonlySet<SubcategoryId> = new Set<SubcategoryId>([
  1, 2, 3, 4, 5, 21, 22,
]);

// Extracts `<span id='cAns'>…</span>` matches from an HTML blob, used
// for the legacy ground-truth recovery path. The cleaned inner text
// (stripped of nested markup) is what the backend wants in `correct[]`.
const extractCAnsSpans = (html: string | null | undefined): string[] => {
  if (!html) return [];
  const regex = /<span id=['"]?cAns['"]?>([\s\S]*?)<\/span>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const stripped = m[1].replace(/<[^>]*>/g, '').trim();
    if (stripped) out.push(stripped);
  }
  return out;
};

// Computes the "ground truth" string the backend wants in `correct[]`
// (and, for most subs, in the sibling `answer[] / ans[] / q_ans[]`
// fields too). Mirrors legacy `getGroundTruth` from
// NormalMockTestScreen.js / FullMockTestScreen.js / ExtensiveMockTestScreen.js
// — the four files all duplicate the same logic, so we collapse it
// here once and unit-test it.
//
//   - Primary: pull text out of `<span id='cAns'>` tags inside the
//     question's `answer` field, or the question text itself as a
//     fallback. Comma-join when multiple spans match.
//   - MCQ subs (8, 9, 14, 15, 17, 18): join correct option IDs.
//   - Reorder (10): sort options by `index` and join IDs.
//   - Listening/Speaking comprehension (2, 5): fall back to
//     `answer || audio_script`.
//   - Highlight (19): comma-join the words preceding each `<span>`.
//   - Default: raw `answer` field.
//
// Exported so the SUBMIT_MOCK payload builder + tests share the same
// implementation.
export const getGroundTruth = (
  raw: Record<string, unknown> | null | undefined,
): string => {
  if (!raw) return '';
  const subIdRaw = raw.subcategory_id;
  const subId = Number(subIdRaw);
  const answerStr = typeof raw.answer === 'string' ? raw.answer : '';
  const questionStr = typeof raw.question === 'string' ? raw.question : '';
  const audioScriptStr =
    typeof raw.audio_script === 'string' ? raw.audio_script : '';

  // 1. Primary <span id='cAns'> extraction — same for most subs
  // EXCEPT highlight (19), which needs the words BEFORE each span.
  const spansFromAnswer = extractCAnsSpans(answerStr);
  const spansFromQuestion = extractCAnsSpans(questionStr);
  const detected =
    spansFromAnswer.length > 0 ? spansFromAnswer : spansFromQuestion;
  if (detected.length > 0 && subId !== 19) {
    return detected.join(',');
  }

  // 2. MCQ — join correct option IDs.
  if ([8, 9, 14, 15, 17, 18].includes(subId)) {
    const options = Array.isArray(raw.option) ? (raw.option as unknown[]) : [];
    const ids = options
      .filter(
        (o): o is { id?: unknown; correct?: unknown; options?: unknown } =>
          typeof o === 'object' && o !== null,
      )
      .filter(o => o.correct === 1 || o.correct === '1')
      .map(o => {
        if (typeof o.id === 'string' || typeof o.id === 'number') {
          return String(o.id);
        }
        return typeof o.options === 'string' ? o.options : '';
      })
      .filter(s => s.length > 0);
    return ids.length > 0 ? ids.join(',') : answerStr;
  }

  // 3. Reorder paragraphs — sort by `index` and join IDs.
  if (subId === 10) {
    const options = Array.isArray(raw.option) ? (raw.option as unknown[]) : [];
    const sorted = options
      .filter(
        (o): o is { id?: unknown; index?: unknown } =>
          typeof o === 'object' && o !== null,
      )
      .slice()
      .sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0))
      .map(o => (o.id !== undefined ? String(o.id) : ''))
      .filter(s => s.length > 0);
    return sorted.join(',');
  }

  // 4. Repeat Sentence (2) & ASQ (5) — fall back to audio_script.
  if (subId === 2 || subId === 5) {
    return answerStr || audioScriptStr || '';
  }

  // 5. Highlight Incorrect Words (19) — comma-join the words RIGHT
  // BEFORE each `<span id='cAns'>` opening tag.
  if (subId === 19) {
    const regex = /([^\s<]+)\s*(?=<span id=['"]?cAns['"]?>)/gi;
    const incorrect: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(answerStr)) !== null) {
      const tok = match[1]?.trim();
      if (tok) incorrect.push(tok);
    }
    return incorrect.join(',') || answerStr;
  }

  // 6. Default — raw answer field (writing, dictation, etc.).
  return answerStr;
};

// Builds the multipart FormData for `SUBMIT_MOCK`. Field shape follows
// the legacy mock-test contract verified against the existing payload
// doc — PHP-style array fields (`id[]`, `type[]`, …), test-state meta
// (`q_count`, `q_time`, `time`, `pending`, `complete`), and ground-truth
// echo fields (`answer[]`, `ans[]`, `q_ans[]`, `correct[]`).
//
// We intentionally append every field the backend lists (even when the
// value is null / empty) so the server-side parser doesn't fall into a
// "missing field" branch and reject the submission.
export const buildSubmitPayload = (ctx: SubmitContext): FormData => {
  const fd = new FormData();
  const {
    answer,
    questionNumber,
    totalQuestions,
    secondsSpentOnQuestion,
    remainingTotalSeconds,
    audioScript,
    questionText,
    correctAnswer,
    rawAnswer,
    htmlAnswer,
    isComplete,
    platform,
    variant,
    category,
    currentSectionIndex,
  } = ctx;
  const { mockId, questionId, subcategoryId, draft } = answer;

  const isSpeaking = SPEAKING_SUBS.has(subcategoryId);

  // `appendNull` writes the literal null sentinel that the legacy
  // mobile app sends for "empty" fields. RN's FormData stores the
  // raw value in `_parts` and the network layer stringifies it to
  // the string "null" on the wire — which is exactly what the PHP
  // controller's switch arms expect ("" makes some arms behave like
  // a real user answer). Centralising this here makes the legacy-
  // parity intent explicit at the call site.
  const appendNull = (name: string): void => {
    fd.append(name, null as unknown as string);
  };

  const isFullMock = variant === 'full' && category === 'Full Mock';
  const isExtensive = variant === 'extensive';

  // ── Scalar test-state metadata ────────────────────────────────────
  fd.append('mock_id', mockId as any);
  fd.append('q_count', totalQuestions as any);
  fd.append('q_time', Math.max(0, Math.floor(secondsSpentOnQuestion)) as any);
  fd.append('time', Math.max(0, Math.floor(remainingTotalSeconds)) as any);
  
  // Legacy parity: mapping the exact fields and types from legacy mock screens
  // pending: Extensive is dynamic (isPending ? 1 : 0), others are hardcoded 1
  const pendingVal = isExtensive ? (ctx.isPending ? 1 : 0) : 1;
  fd.append('pending', pendingVal as any);

  // complete: Full Mock is 1 only when completing Section 3, others are isComplete ? 1 : 0
  const completeVal = isFullMock
    ? (isComplete && currentSectionIndex === 2 ? 1 : 0)
    : (isComplete ? 1 : 0);
  fd.append('complete', completeVal as any);

  // skip: Full Mock sends section number (isFrom) when section completes. Extensive sends 0. Normal omits it.
  if (isFullMock) {
    if (isComplete) {
      const isFrom = currentSectionIndex + 1;
      const skipVal = isFrom > 2 ? 2 : isFrom;
      fd.append('skip', skipVal as any);
    }
  } else if (isExtensive) {
    fd.append('skip', 0 as any);
  }

  appendNull('audio_text');
  fd.append('device', 'mobile');
  fd.append('isPlatform', platform);
  fd.append('question_number', questionNumber as any);
  
  // `curr_q` is 0 on the very final submission, otherwise the current question number
  fd.append('curr_q', (isComplete ? 0 : questionNumber) as any);

  // ── Array fields (PHP `[]` notation) ──────────────────────────────
  fd.append('id[]', questionId as any);
  fd.append('type[]', subcategoryId as any);
  fd.append('response[]', true as any);

  // `script[]`: Read Aloud (subcategory 1) has no audio prompt —
  // legacy sends `null` explicitly there. Every other subcategory
  // echoes the question's `audio_script` (or null if absent).
  if (subcategoryId === 1) {
    appendNull('script[]');
  } else {
    if (audioScript == null) {
      appendNull('script[]');
    } else {
      fd.append('script[]', audioScript);
    }
  }
  // `lang[]` is unused on the wire today — legacy sends null for
  // every submission.
  appendNull('lang[]');
  // `text[]` is the question prompt text; backend logs it verbatim
  // and 500s on missing key.
  fd.append('text[]', questionText ?? '');

  // ── Strategy (Read Aloud only) ────────────────────────────────────
  // Subcategory 1 has a "Normal" vs "One Line Strategy" toggle in
  // the legacy app, posted as `strategy` = "1" or "2". We don't
  // surface a strategy picker yet, so default to "1" (Normal) —
  // backend treats the field as required for sub 1.
  if (subcategoryId === 1) {
    fd.append('strategy', '1');
  }

  // ── Ground-truth echo ─────────────────────────────────────────────
  // Per-subcategory mapping pulled from legacy
  // NormalMockTestScreen.js:858-886 (mirrored across all three mock
  // screens). Three flavours:
  //   - Highlight (19): answer/correct = ground truth, ans/q_ans =
  //     the raw markup off the question payload.
  //   - GROUND_TRUTH_ECHO_SUBS: all four fields = ground truth.
  //   - GROUND_TRUTH_NULL_ANSWER_SUBS (1, 21): answer = null,
  //     others = ground truth.
  //   - default: answer/ans/q_ans = raw answer, correct = ground truth.
  const ground = correctAnswer ?? '';
  const rawAns = rawAnswer ?? '';
  const appendStringOrNull = (name: string, value: string): void => {
    if (value === '') appendNull(name);
    else fd.append(name, value);
  };
  if (subcategoryId === 19) {
    appendStringOrNull('answer[]', ground);
    appendStringOrNull('correct[]', ground);
    appendStringOrNull('ans[]', rawAns);
    appendStringOrNull('q_ans[]', rawAns);
  } else if (GROUND_TRUTH_ECHO_SUBS.has(subcategoryId)) {
    appendStringOrNull('answer[]', ground);
    appendStringOrNull('ans[]', ground);
    appendStringOrNull('q_ans[]', ground);
    appendStringOrNull('correct[]', ground);
  } else if (GROUND_TRUTH_NULL_ANSWER_SUBS.has(subcategoryId)) {
    appendNull('answer[]');
    appendStringOrNull('ans[]', ground);
    appendStringOrNull('q_ans[]', ground);
    appendStringOrNull('correct[]', ground);
  } else {
    appendStringOrNull('answer[]', rawAns);
    appendStringOrNull('ans[]', rawAns);
    appendStringOrNull('q_ans[]', rawAns);
    appendStringOrNull('correct[]', ground);
  }

  // ── User answer fields ────────────────────────────────────────────
  // Speaking kinds never populate `selected[]` / `text_answer[]` /
  // `length[]` — the user's "answer" is the audio blob in `file[]`.
  // Legacy explicitly nulls these three for every speaking submission.
  if (isSpeaking) {
    appendNull('selected[]');
    appendNull('text_answer[]');
    appendNull('length[]');
  } else {
    // Per-kind wire-format override: subs 11 (bank) and 12
    // (dropdown) both want the leading-comma interleaved form
    // (`,a,,b,,c`) on `selected[]`. Everything else uses the
    // generic `buildSelectedString` shape.
    let selected = buildSelectedString(draft) ?? '';
    if (draft.kind === 'fib-bank' || draft.kind === 'fib-dropdown') {
      selected = buildInterleavedFibSelected(draft.values);
    }
    appendStringOrNull('selected[]', selected);

    if (draft.kind === 'writing') {
      fd.append('text_answer[]', draft.text);
      fd.append('length[]', countWords(draft.text) as any);
    } else if (
      draft.kind === 'fib-bank' ||
      draft.kind === 'fib-dropdown' ||
      draft.kind === 'fib-input'
    ) {
      appendStringOrNull('text_answer[]', selected);
      appendNull('length[]');
    } else {
      appendNull('text_answer[]');
      appendNull('length[]');
    }
  }

  // ── file[] + duration[] ───────────────────────────────────────────
  // Legacy parity: when a recording was captured, ship the blob with
  // platform-specific MIME + extension (iOS = m4a / audio/m4a,
  // Android = mp4 / audio/mp4). When no recording, ship `null` —
  // the legacy PHP controller distinguishes a null `file[]` (skipped
  // audio) from an empty string (which trips the `foreach()` arm).
  // The `<question_id>.<ext>` filename matches the legacy convention
  // so the backend's S3 uploader writes objects with consistent keys.
  if (
    draft.kind === 'speaking' &&
    draft.audioFilePath &&
    draft.durationSec > 0
  ) {
    const isIos = platform === 'ios';
    let fileUri = draft.audioFilePath;
    if (!isIos) {
      const cleanPath = fileUri.replace(/^file:\/\//, '').replace(/^\/+/, '');
      fileUri = `file:///${cleanPath}`;
    }
    fd.append('file[]', {
      uri: fileUri,
      type: isIos ? 'audio/m4a' : 'audio/mp4',
      name: `${questionId}.${isIos ? 'm4a' : 'mp4'}`,
    } as unknown as Blob);
    fd.append('duration[]', formatDurationMMSS(draft.durationSec));
  } else {
    appendNull('file[]');
    // Legacy ships `duration[]` as `recordTime || "00:00"` —
    // always a MM:SS string even when there's no recording.
    fd.append('duration[]', '00:00');
  }

  // `html[]` is only meaningful for word-highlight (subcategory 19).
  // Legacy ships it as `html || null` — null when the user didn't
  // produce a highlight markup. We mirror that.
  if (htmlAnswer && htmlAnswer.length > 0) {
    fd.append('html[]', htmlAnswer);
  } else {
    appendNull('html[]');
  }

  return fd;
};

// Debug helper: prints every field of a SUBMIT_MOCK FormData to the
// logger in a curl-friendly shape. Useful when the browser/devtools
// can't preview the payload (binary file blob makes the request
// body "[Preview unavailable]") and we need to confirm what actually
// went over the wire.
//
// On React Native, the standard `FormData` instance exposes its
// internals via the non-standard `_parts` array: each entry is a
// `[name, value]` tuple where `value` is either a scalar or a
// `{ uri, name, type }` blob descriptor. We read that directly
// (with a defensive fallback to `entries()` on platforms that ever
// add it) so this helper works in both RN and Node-based jest tests.
export const dumpSubmitFormData = (fd: FormData): Array<{
  name: string;
  value: string;
}> => {
  const rows: Array<{ name: string; value: string }> = [];
  const parts = (fd as unknown as { _parts?: Array<[string, unknown]> })._parts;
  const stringify = (v: unknown): string => {
    if (v === null || v === undefined) return '<null>';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const o = v as { uri?: unknown; name?: unknown; type?: unknown };
      if (typeof o.uri === 'string') {
        return `<file uri=${o.uri} name=${String(o.name ?? '')} type=${String(o.type ?? '')}>`;
      }
      try {
        return JSON.stringify(v);
      } catch {
        return '<unserializable>';
      }
    }
    return String(v);
  };
  if (Array.isArray(parts)) {
    for (const [name, value] of parts) {
      rows.push({ name, value: stringify(value) });
    }
  }
  return rows;
};

// ─── Bulk skip-remaining + final close payloads ─────────────────────────────
//
// The runner used to satisfy "unanswered tail on section timeout" by
// enqueueing N individual SUBMIT_MOCK posts. The legacy PHP backend
// also exposes two purpose-built endpoints:
//
//   • REMAINING_MOCK  ("set/mockTime")  — one POST that marks an
//     array of question ids as skipped. Faster + atomic from the
//     server's POV than 30 separate per-question submissions on a
//     timeout. Old-app name: `submitRemainingQuesAPI`.
//
//   • SUBMIT_FAILED_MOCK ("submitFailed/mock") — fire-and-forget
//     close signal sent after the user has finished posting all
//     per-question answers. Tells the grader the attempt is done so
//     scoring can run without waiting for a timeout. Old-app name:
//     `submitFailedMockAPI`.
//
// Both helpers below build the multipart payload only — the actual
// `apiClient.post(...)` lives in the runner. Keeping the helpers
// pure means they're test-friendly and the runner stays in charge of
// when to call them.

// Builds the multipart payload for REMAINING_MOCK. The old app sends
// `mock_id`, `id[]` (PHP-style repeated), `skip`, and `time`. We mirror
// that shape exactly so the backend's existing parser accepts it
// without changes.
export const buildRemainingQuesPayload = (params: {
  mockId: number | string;
  questionIds: ReadonlyArray<number | string>;
  remainingTotalSeconds: number;
}): FormData => {
  const { mockId, questionIds, remainingTotalSeconds } = params;
  const fd = new FormData();
  fd.append('mock_id', String(mockId));
  // `skip=1` matches the legacy "these questions were not answered,
  // mark them skipped" contract. The old app sometimes used `2` when
  // the call was triggered by a completed-section boundary rather
  // than a timeout; we use `1` uniformly since both cases end up
  // marking the questions skipped and the server doesn't branch on
  // the value beyond truthiness today.
  fd.append('skip', '1');
  fd.append('time', String(Math.max(0, Math.floor(remainingTotalSeconds))));
  for (const id of questionIds) {
    fd.append('id[]', String(id));
  }
  return fd;
};

// Builds the multipart payload for SUBMIT_FAILED_MOCK. The old app
// only sends `mock_id` — the call is a pure "test done" signal, the
// server pulls everything else from the previously-submitted answers.
export const buildFinalMockClosePayload = (mockId: number | string): FormData => {
  const fd = new FormData();
  fd.append('mock_id', String(mockId));
  return fd;
};
