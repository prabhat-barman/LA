import {
  CATEGORY_DETAILS,
  CategoryDetail,
  DIFFICULTY_CHIP_DEFAULT,
  DIFFICULTY_CHIP_STYLES,
} from './constants';
import { SubscoreChecklistIcon } from './icons';
import type { AttemptLog, MCQOption, SortFilter } from './types';

// MCQ categories.
//   Reading      : 8  (single)  / 9  (multi)
//   Listening    : 14 (single)  / 15 (multi)
//   Highlight    : 17 (single)  — "Highlight Correct Summary" — the
//                  backend ships option rows; user picks ONE summary.
//   Missing Word : 18 (single)  — option rows; user picks ONE word.
// 17 and 18 use the same wire format as 8/14 (a single option id) so
// reusing the MCQ UI keeps them on the cheap, well-tested code path.
const MCQ_SINGLE_CATEGORIES = new Set<number>([8, 14, 17, 18]);
const MCQ_MULTI_CATEGORIES = new Set<number>([9, 15]);

export const isMcqSingleCategory = (categoryId: number): boolean =>
  MCQ_SINGLE_CATEGORIES.has(categoryId);

export const isMcqMultipleCategory = (categoryId: number): boolean =>
  MCQ_MULTI_CATEGORIES.has(categoryId);

export const isMcqCategory = (categoryId: number): boolean =>
  isMcqSingleCategory(categoryId) || isMcqMultipleCategory(categoryId);

// Reading "Re-order Paragraphs" (10). Single-category check exposed so
// the screen can branch on a name rather than a magic number.
export const isReorderCategory = (categoryId: number): boolean =>
  categoryId === 10;

// Fill-in-the-blank variants (11 Reading bank, 12 R&W dropdown,
// 16 Listening text input). Shared check for the screen-level
// validation; the per-variant UI lives in the runner-bridge.
const FIB_CATEGORIES = new Set<number>([11, 12, 16]);
export const isFibCategory = (categoryId: number): boolean =>
  FIB_CATEGORIES.has(categoryId);

// Listening "Highlight Incorrect Words" (19) — user taps words in the
// shown transcript that diverge from the spoken audio.
export const isHighlightWordsCategory = (categoryId: number): boolean =>
  categoryId === 19;

// Listening "Write from Dictation" (20). Treated as a writing-style
// answer (typed text), but distinguished here so the screen can show
// the audio player + a single-line input instead of the essay textarea.
export const isDictationCategory = (categoryId: number): boolean =>
  categoryId === 20;

// Convenience: the screen's "submit via the runner-bridge" set —
// every category whose UI is rendered by `MockRunnerBridge` rather
// than the legacy Practice question UIs. Keeps the call site
// declarative.
export const isRunnerBridgeCategory = (categoryId: number): boolean =>
  isReorderCategory(categoryId) ||
  isFibCategory(categoryId) ||
  isHighlightWordsCategory(categoryId);

// MCQ options ship in raw insertion order ("D", "C", "B", "A" in the
// reference sample). Sort by the leading letter so the UI always
// reads A → B → C → … Options without a recognisable prefix fall back
// to the backend `index` and then to their original position so we
// never silently drop or shuffle malformed payloads.
export const sortMcqOptions = <T extends MCQOption>(options: T[] | undefined): T[] => {
  if (!Array.isArray(options) || options.length === 0) return [];
  const withIndex = options.map((opt, i) => ({ opt, i }));
  withIndex.sort((a, b) => {
    const al = getOptionLeadingLetter(a.opt.options);
    const bl = getOptionLeadingLetter(b.opt.options);
    if (al !== null && bl !== null && al !== bl) return al - bl;
    if (al !== null && bl === null) return -1;
    if (al === null && bl !== null) return 1;
    const ai = Number(a.opt.index ?? a.i);
    const bi = Number(b.opt.index ?? b.i);
    if (!isNaN(ai) && !isNaN(bi) && ai !== bi) return ai - bi;
    return a.i - b.i;
  });
  return withIndex.map(({ opt }) => opt);
};

// Returns 0..25 for "A) …" / "B) …" / etc., or null if the text doesn't
// start with a single ASCII letter followed by a separator. Tolerant of
// stray whitespace and a few common separators (`)` / `.` / `:`).
export const getOptionLeadingLetter = (text: string | undefined): number | null => {
  if (!text) return null;
  const m = text.trimStart().match(/^([A-Za-z])[).:\s]/);
  if (!m) return null;
  const code = m[1].toUpperCase().charCodeAt(0) - 65;
  return code >= 0 && code < 26 ? code : null;
};

// Convert the backend `correct` flag (number, "1"/"0", boolean) into a bool.
export const isOptionCorrect = (raw: unknown): boolean => {
  if (raw === true || raw === 1) return true;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  }
  return false;
};

// Parse the backend `answer` / `correct` field (option id string,
// possibly comma-separated for multi-answer) into a Set<string> for
// fast lookup. Whitespace and empty entries are dropped.
export const parseSelectedOptionIds = (raw: unknown): Set<string> => {
  if (raw == null) return new Set();
  const flat = Array.isArray(raw) ? raw.join(',') : String(raw);
  const ids = flat
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
  return new Set(ids);
};

// Build the submit payload for the `answer` field. Backend expects a
// comma-separated string of option ids (matches the legacy mobile clients).
export const buildMcqAnswerPayload = (selectedIds: Iterable<string | number>): string =>
  Array.from(selectedIds).map(String).filter(Boolean).join(',');

// MM:SS clock formatter shared by recorder/playback UI.
export const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Format an attempt timestamp into a friendly local string:
//   today      -> "Today, 12:37 PM"
//   yesterday  -> "Yesterday, 12:37 PM"
//   this year  -> "23 Apr, 12:37 PM"
//   older/newer-> "23 Apr 2026, 12:37 PM"
// Returns 'Unknown date' if the input isn't parseable.
export const formatAttemptDate = (input?: string | number | Date | null): string => {
  if (!input) return 'Unknown date';
  const d = new Date(input);
  if (isNaN(d.getTime())) return 'Unknown date';

  const now = new Date();
  const startOfDay = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateLabel = d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateLabel}, ${time}`;
};

export const ensureArray = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/\n|\u2022|•|;/).map(s => s.trim()).filter(Boolean);
  }
  if (typeof v === 'object') return Object.values(v).map(String).filter(Boolean);
  return [];
};

const FALLBACK_CATEGORY: CategoryDetail = {
  icon: SubscoreChecklistIcon,
  color: '#007AFF',
  description: 'Evaluation criteria breakdown',
  defaultRemarks: ['Well structured and presented.'],
};

export const getCategoryDetails = (name: string): CategoryDetail => {
  const norm = name.toLowerCase().trim();
  if (norm.includes('content')) return CATEGORY_DETAILS.content;
  if (norm.includes('grammar')) return CATEGORY_DETAILS.grammar;
  if (norm.includes('form')) return CATEGORY_DETAILS.form;
  if (norm.includes('vocabulary') || norm.includes('vocab')) return CATEGORY_DETAILS.vocabulary;
  if (norm.includes('linguistic') || norm.includes('range')) return CATEGORY_DETAILS['linguistic range'];
  if (norm.includes('spelling') || norm.includes('spell')) return CATEGORY_DETAILS.spelling;
  if (norm.includes('structure') || norm.includes('struct')) return CATEGORY_DETAILS.structure;
  if (norm.includes('fluency') || norm.includes('oral')) return CATEGORY_DETAILS.fluency;
  if (norm.includes('pronunciation') || norm.includes('pron')) return CATEGORY_DETAILS.pronunciation;
  return FALLBACK_CATEGORY;
};

export const extractFeedbackText = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.remarks ?? val.remark ?? val.feedback ?? val.comment ?? JSON.stringify(val);
  }
  return String(val);
};

export const resolveSubscore = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'object') {
    return val.score ?? 0;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// Pull a sub-score from the backend's `score[]` array by `type`
// (0 = Content, 1 = Fluency, 2 = Pronunciation). Returns 0 if not present.
export const getSubscoreByType = (scoreArr: any, type: number): number => {
  if (!Array.isArray(scoreArr)) return 0;
  const item = scoreArr.find((s: any) => Number(s?.type) === type);
  if (!item) return 0;
  const n = Number(item.score);
  return isNaN(n) ? 0 : n;
};

// Compute overall percentage from `score[]` using each entry's own `from`
// (falls back to 90, the PTE default).
export const computeOverallPercent = (scoreArr: any): number => {
  if (!Array.isArray(scoreArr) || scoreArr.length === 0) return 0;
  let total = 0;
  let max = 0;
  for (const s of scoreArr) {
    const n = Number(s?.score);
    const from = Number(s?.from ?? 90);
    if (!isNaN(n) && from > 0) {
      total += n;
      max += from;
    }
  }
  return max === 0 ? 0 : Math.round((total / max) * 100);
};

export const computeOverallRaw = (scoreArr: any): number => {
  if (!Array.isArray(scoreArr) || scoreArr.length === 0) return 0;
  let total = 0;
  let max = 0;
  for (const s of scoreArr) {
    const n = Number(s?.score);
    const from = Number(s?.from ?? 90);
    if (!isNaN(n) && from > 0) {
      total += n;
      max += from;
    }
  }
  return max === 0 ? 0 : Math.round((total / max) * 90);
};

// Pull the *user's recorded* audio filename out of an attempt row. The
// backend uses slightly different field names across Me / Others responses,
// so we check several known shapes. We deliberately DO NOT fall back to
// any nested `question.media_link` etc. — that is the question prompt
// audio, not the user's recording, and would point to a different S3 path.
export const getAttemptAudioFile = (attempt: any): string | undefined => {
  if (!attempt || typeof attempt !== 'object') return undefined;
  const candidates = [
    attempt.file,
    attempt.audio,
    attempt.audio_file,
    attempt.audio_path,
    attempt.recording,
    attempt.recording_file,
    attempt.recording_path,
    attempt.answer_file,
    attempt.answer_audio,
    attempt.user_audio,
    attempt.user_recording,
    attempt.media_file,
    attempt.attempt_file,
    attempt.attempt_audio,
    attempt.voice_file,
    attempt.voice,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return undefined;
};

// The backend sometimes returns `user` as an array (single-entry) and
// sometimes as an object. Resolve to a display name in either case.
export const getAttemptUserName = (user: any): string => {
  if (!user) return 'Anonymous';
  const u = Array.isArray(user) ? user[0] : user;
  if (!u) return 'Anonymous';
  const first = (u.first_name ?? '').toString().trim();
  const last = (u.last_name ?? '').toString().trim();
  const composed = `${first} ${last}`.trim();
  return composed || u.name || u.user_name || 'Anonymous';
};

// Score-badge color thresholds:
//   0           -> grey   (no attempt / no score yet)
//   1..49       -> red    (poor)
//   50..69      -> yellow (needs improvement)
//   70+         -> green  (good)
export const getOverlayScoreColor = (val: number) => {
  if (!val || val <= 0) return '#8E8E93';
  if (val >= 70) return '#34C759';
  if (val >= 50) return '#FFCC00';
  return '#FF3B30';
};

export const getDifficultyChipStyle = (diff: string) =>
  DIFFICULTY_CHIP_STYLES[diff] ?? DIFFICULTY_CHIP_DEFAULT;

// Word-by-word colouring for the score breakdown highlight transcript.
export const getWordColor = (word: any) => {
  if (typeof word === 'string') return '#1C1F2A';
  const score =
    word?.score ?? word?.percentage ?? word?.val ?? word?.score_percent ?? word?.word_score;
  const status = String(word?.status ?? word?.color ?? word?.state ?? word?.class ?? '').toLowerCase();

  if (score !== undefined) {
    if (score >= 70) return '#34C759';
    if (score >= 40) return '#FF9500';
    return '#FF3B30';
  }

  if (status) {
    if (
      status.includes('good') ||
      status.includes('green') ||
      status.includes('correct') ||
      status.includes('success') ||
      status === '1'
    ) {
      return '#34C759';
    }
    if (
      status.includes('average') ||
      status.includes('orange') ||
      status.includes('yellow') ||
      status.includes('warning') ||
      status === '2'
    ) {
      return '#FF9500';
    }
    if (
      status.includes('bad') ||
      status.includes('red') ||
      status.includes('incorrect') ||
      status.includes('danger') ||
      status === '3'
    ) {
      return '#FF3B30';
    }
  }
  return '#1C1F2A';
};

// Difficulty normalization. The backend serves a few different shapes:
// numeric strings ("1"/"2"/"3"), full words, abbreviations, etc.
export const normalizeDifficulty = (raw: unknown): '' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' => {
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('ADV') || s.includes('HIGH') || s === '3') return 'ADVANCED';
  if (s.includes('INT') || s.includes('MED') || s === '2') return 'INTERMEDIATE';
  if (s.includes('BEG') || s.includes('LOW') || s === '1') return 'BEGINNER';
  return '';
};

const attemptSortValue = (a: AttemptLog): number => {
  const flatOverall = a.score_percent ?? a.percentage ?? a.overall_score;
  if (typeof flatOverall === 'number' && !isNaN(flatOverall)) {
    return flatOverall;
  }
  if (typeof flatOverall === 'string') {
    const num = Number(flatOverall);
    if (!isNaN(num)) return num;
  }
  return computeOverallPercent(a.score);
};

// Single source of truth for the three sort modes used by both
// "Me" and "Others" attempt lists. Latest preserves backend order.
export const sortAttemptsBy = <T extends AttemptLog>(list: T[], filter: SortFilter): T[] => {
  if (filter === 'Latest' || list.length === 0) return list.slice();
  const copy = list.slice();
  if (filter === 'Highest Score') {
    return copy.sort((a, b) => attemptSortValue(b) - attemptSortValue(a));
  }
  return copy.sort((a, b) => attemptSortValue(a) - attemptSortValue(b));
};

export const cleanHtmlText = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/\n{3,}/g, '\n\n');
};

// ─── MockRunnerBridge wire-format helpers ─────────────────────────────
//
// For the question categories Practice routes through
// `MockRunnerBridge` (10, 11, 12, 16, 19) we still have to land a flat
// `answer` string on the practice submit endpoint. Each kind has its
// own legacy wire format — these helpers centralise that conversion
// so the submit code stays readable.

// Local shape of the runner's AnswerDraft (typed loosely on purpose
// — the bridge always feeds us one of these shapes, but Practice
// doesn't import the runner's discriminated union to avoid a cross-
// module type coupling for non-runner consumers).
type RunnerDraft =
  | { kind: 'empty' }
  | { kind: 'reorder'; orderedIds: string[] }
  | { kind: 'fib-bank'; values: (string | null)[] }
  | { kind: 'fib-dropdown'; values: (string | null)[] }
  | { kind: 'fib-input'; values: string[] }
  | { kind: 'highlight'; selectedIndices: number[]; selectedWords: string[] }
  | { kind: string; [field: string]: unknown };

// Wire format for FIB bank (11) and FIB dropdown (12) — backend wants
// the leading-comma interleaved CSV (`,a,,b,,c`) so empty positions
// are preserved as bare commas. Mirrors `buildInterleavedFibSelected`
// in the runner; duplicated here to avoid a cross-module import.
const buildInterleavedFibCsv = (
  values: ReadonlyArray<string | null>,
): string => {
  if (values.length === 0) return '';
  return values.map(v => v ?? '').join(',,');
};

// Convert a `RunnerDraft` into the `answer` string Practice's
// SUBMIT_ANSWER endpoint expects. Returns `null` when the draft is
// empty / cannot be serialised — callers use that as the "user
// hasn't answered yet" signal.
export const buildPracticeAnswerFromDraft = (
  draft: RunnerDraft,
): string | null => {
  switch (draft.kind) {
    case 'reorder': {
      const d = draft as { orderedIds: string[] };
      if (!Array.isArray(d.orderedIds) || d.orderedIds.length === 0) {
        return null;
      }
      return d.orderedIds.join(',');
    }
    case 'fib-bank':
    case 'fib-dropdown': {
      const d = draft as { values: (string | null)[] };
      if (!Array.isArray(d.values) || d.values.length === 0) return null;
      // The interleaved form preserves blank positions, so even a
      // partial answer is a meaningful submission. We only treat the
      // draft as empty when every position is blank.
      const allEmpty = d.values.every(v => v == null || String(v).length === 0);
      if (allEmpty) return null;
      return buildInterleavedFibCsv(d.values);
    }
    case 'fib-input': {
      const d = draft as { values: string[] };
      if (!Array.isArray(d.values) || d.values.length === 0) return null;
      const allEmpty = d.values.every(v => !v || v.trim().length === 0);
      if (allEmpty) return null;
      // Listening FIB-input uses plain comma-join (no leading commas)
      // — the backend differentiates 16 from 11/12 by `type`.
      return d.values.map(v => v ?? '').join(',');
    }
    case 'highlight': {
      const d = draft as { selectedWords: string[] };
      if (!Array.isArray(d.selectedWords) || d.selectedWords.length === 0) {
        return null;
      }
      return d.selectedWords.join(',');
    }
    case 'empty':
    default:
      return null;
  }
};

// User-facing toast copy for "you didn't answer this question type
// yet". Keeps the friendly per-kind copy in one place so the submit
// path stays a one-liner.
export const getMissingAnswerToast = (categoryId: number): string => {
  switch (categoryId) {
    case 10:
      return 'Please re-order the paragraphs before submitting.';
    case 11:
    case 12:
      return 'Please fill in every blank before submitting.';
    case 16:
      return 'Please type the missing words before submitting.';
    case 19:
      return 'Please tap the words that don\u2019t match the audio.';
    case 20:
      return 'Please type what you heard before submitting.';
    default:
      return 'Please answer the question before submitting.';
  }
};
