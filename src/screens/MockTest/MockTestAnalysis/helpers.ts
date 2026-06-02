import { getSection } from '../MockTestRunner/helpers';
import type { SubcategoryId } from '../MockTestRunner/types';
import { coerceScore } from '../MockTestResult/helpers';
import type {
  QuestionAnalysis,
  QuestionComponentScore,
  QuestionVerdict,
} from './types';

// Field aliases. Mirrors the defensive patterns in MockTestResult —
// PTE backends use a wildly inconsistent vocabulary across endpoints
// and we'd rather check 6 names than miss a field.
const QUESTION_LIST_ENVELOPE_KEYS = [
  'questions',
  'question_list',
  'questionList',
  'details',
  'detail',
  'items',
  'data',
  'list',
  'results',
];
const ID_FIELDS = ['id', 'question_id', 'questionId', 'q_id', 'qid'];
const QNUM_FIELDS = [
  'question_number',
  'questionNumber',
  'qn',
  'q_no',
  'qno',
  'index',
  'position',
];
const SUBCAT_FIELDS = [
  'subcategory_id',
  'subcategoryId',
  'sub_category',
  'subCategory',
  'subcat',
  'sub_cat_id',
  'type_id',
  'typeId',
];
const TITLE_FIELDS = [
  'title',
  'question_title',
  'questionTitle',
  'name',
  'prompt',
  'short_title',
  'text',
];
const SCORE_FIELDS = [
  'score',
  'q_score',
  'question_score',
  'questionScore',
  'final_score',
  'obtained_score',
  'marks_obtained',
];
const MAX_SCORE_FIELDS = [
  'max_score',
  'maxScore',
  'out_of',
  'from',
  'total',
  'max_marks',
  'maxMarks',
];
const USER_ANS_FIELDS = [
  'user_answer',
  'userAnswer',
  'submitted_answer',
  'submittedAnswer',
  'response',
  'answer_text',
  'answerText',
  'student_answer',
  'studentAnswer',
];
const CORRECT_ANS_FIELDS = [
  'correct_answer',
  'correctAnswer',
  'correct',
  'ans',
  'expected',
  'expected_answer',
  'expectedAnswer',
  'right_answer',
  'rightAnswer',
];
const VERDICT_FIELDS = [
  'verdict',
  'status',
  'result',
  'is_correct',
  'isCorrect',
  'correctness',
];
const COMPONENT_LIST_FIELDS = [
  'components',
  'component_scores',
  'componentScores',
  'subscores',
  'sub_scores',
  'breakdown',
  'score_breakdown',
  'criteria',
  'new_format',
];

const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

// First-non-empty field lookup. Same pattern as the result normalizer.
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

const firstStringFromFields = (
  src: Record<string, unknown>,
  fields: string[],
): string | null => {
  for (const f of fields) {
    const v = src[f];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
};

// Locates the actual question list inside an unknown payload. PTE
// backends nest the list in different places — try the obvious keys,
// then check if the payload itself is already an array, then check
// the top-level object's first array-typed value as a last resort.
export const extractQuestionList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];

  for (const k of QUESTION_LIST_ENVELOPE_KEYS) {
    const v = payload[k];
    if (Array.isArray(v)) return v;
    if (isObject(v)) {
      // Some backends double-wrap: { data: { questions: [...] } }
      for (const inner of QUESTION_LIST_ENVELOPE_KEYS) {
        const ii = v[inner];
        if (Array.isArray(ii)) return ii;
      }
    }
  }
  // Last resort — first array-typed value at the top level.
  for (const v of Object.values(payload)) {
    if (Array.isArray(v)) return v;
  }
  return [];
};

// Maps the raw verdict from many possible representations into our
// 3-state union. Falls back to null when the backend didn't surface
// anything — caller renders without a verdict pill.
const coerceVerdict = (raw: unknown): QuestionVerdict => {
  if (raw == null) return null;
  if (typeof raw === 'boolean') return raw ? 'correct' : 'incorrect';
  if (typeof raw === 'number') {
    // 1/0 convention; some backends use partial=0.5.
    if (raw === 1) return 'correct';
    if (raw === 0) return 'incorrect';
    if (raw > 0 && raw < 1) return 'partial';
    return null;
  }
  if (typeof raw === 'string') {
    const norm = raw.trim().toLowerCase();
    if (
      norm === 'correct' ||
      norm === 'right' ||
      norm === 'pass' ||
      norm === 'passed' ||
      norm === 'success' ||
      norm === 'true' ||
      norm === 'yes' ||
      norm === '1'
    ) {
      return 'correct';
    }
    if (
      norm === 'incorrect' ||
      norm === 'wrong' ||
      norm === 'fail' ||
      norm === 'failed' ||
      norm === 'false' ||
      norm === 'no' ||
      norm === '0'
    ) {
      return 'incorrect';
    }
    if (norm === 'partial' || norm === 'partially_correct' || norm === 'partial_correct') {
      return 'partial';
    }
  }
  return null;
};

// User / correct answer can be a string, array of strings, or array
// of option objects ({ id, text }). We flatten into a single display
// string, joining with " · " so multi-answer questions read cleanly.
const coerceAnswer = (raw: unknown): string | null => {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  if (Array.isArray(raw)) {
    const parts = raw
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        if (isObject(item)) {
          // { text } / { value } / { label } / { word } — common
          // option-object shapes across PTE backends.
          const text =
            item.text ?? item.value ?? item.label ?? item.word ?? item.name;
          if (typeof text === 'string') return text.trim();
        }
        return '';
      })
      .filter(part => part.length > 0);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (isObject(raw)) {
    // Single option-object — same lookup as the array branch.
    const text =
      raw.text ?? raw.value ?? raw.label ?? raw.word ?? raw.name;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }
  }
  return null;
};

// Extracts the component-scores list (Content/Fluency/etc) from any
// of the common container shapes. Returns an empty array when the
// backend doesn't surface a breakdown — the card then just shows
// the overall question score without per-component rows.
const coerceComponentScores = (
  src: Record<string, unknown>,
): QuestionComponentScore[] => {
  // First try the explicit container fields.
  for (const containerField of COMPONENT_LIST_FIELDS) {
    const c = src[containerField];
    if (Array.isArray(c)) {
      return c
        .map(entry => {
          if (!isObject(entry)) return null;
          const name = firstStringFromFields(entry, [
            'name',
            'title',
            'label',
            'criterion',
            'component',
          ]);
          if (!name) return null;
          const score = coerceScore(
            entry.score ??
              entry.value ??
              entry.obtained ??
              entry.points ??
              null,
          );
          const max = coerceScore(
            entry.max ??
              entry.out_of ??
              entry.from ??
              entry.total ??
              entry.max_score ??
              null,
          );
          return {
            name,
            score: score == null ? null : Number(score),
            // Default max=90 (PTE-style band) when backend omits it —
            // matches the way `useScoreBreakdown` resolves unknown
            // max values in the practice flow.
            max: max == null ? 90 : Math.round(max),
          };
        })
        .filter((entry): entry is QuestionComponentScore => entry != null);
    }
    if (isObject(c)) {
      // { content: { score: 4, max: 6 }, fluency: { ... } } shape
      // is common — fold into the same flat list.
      const out: QuestionComponentScore[] = [];
      for (const [key, val] of Object.entries(c)) {
        if (!isObject(val)) continue;
        const score = coerceScore(val.score ?? val.value ?? val.obtained);
        const max = coerceScore(val.max ?? val.out_of ?? val.from);
        out.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          score: score == null ? null : Number(score),
          max: max == null ? 90 : Math.round(max),
        });
      }
      if (out.length > 0) return out;
    }
  }
  return [];
};

const subcategoryFromRaw = (val: unknown): SubcategoryId | null => {
  const n = coerceScore(val);
  if (n == null) return null;
  const rounded = Math.round(n);
  if (rounded >= 1 && rounded <= 22) return rounded as SubcategoryId;
  return null;
};

interface NormalizerContext {
  mockId: number | string;
}

// Top-level entry. Returns an empty array (NOT null) for empty /
// unrecognized payloads — the screen renders its "No detail
// available" state instead of crashing. Each successful entry gets
// a defensively-built `QuestionAnalysis`.
export const normalizeMockAnalysis = (
  payload: unknown,
  ctx: NormalizerContext,
): QuestionAnalysis[] => {
  const rawList = extractQuestionList(payload);
  if (rawList.length === 0) return [];

  return rawList
    .map((raw, idx): QuestionAnalysis | null => {
      if (!isObject(raw)) return null;
      const subcategoryId = subcategoryFromRaw(firstFromFields(raw, SUBCAT_FIELDS));
      // Fall back to Speaking ONLY when we have a subcategoryId we
      // couldn't classify — getSection accepts any SubcategoryId and
      // returns the bucket. If subcategoryId is null we still want
      // to surface the row, just bucket it under the test's "primary"
      // section (chosen later by the screen).
      const section = subcategoryId != null ? getSection(subcategoryId) : 'Speaking';

      const idRaw = firstFromFields(raw, ID_FIELDS);
      const id =
        idRaw != null && (typeof idRaw === 'string' || typeof idRaw === 'number')
          ? `${ctx.mockId}-${String(idRaw)}`
          : `${ctx.mockId}-idx-${idx}`;

      const qnumRaw = coerceScore(firstFromFields(raw, QNUM_FIELDS));
      const questionNumber = qnumRaw != null ? Math.round(qnumRaw) : idx + 1;

      const score = coerceScore(firstFromFields(raw, SCORE_FIELDS));
      const maxScore = coerceScore(firstFromFields(raw, MAX_SCORE_FIELDS));

      return {
        id,
        questionNumber,
        section,
        subcategoryId,
        title: firstStringFromFields(raw, TITLE_FIELDS),
        score: score == null ? null : Number(score),
        maxScore: maxScore == null ? null : Math.round(maxScore),
        verdict: coerceVerdict(firstFromFields(raw, VERDICT_FIELDS)),
        userAnswer: coerceAnswer(firstFromFields(raw, USER_ANS_FIELDS)),
        correctAnswer: coerceAnswer(firstFromFields(raw, CORRECT_ANS_FIELDS)),
        componentScores: coerceComponentScores(raw),
        raw,
      };
    })
    .filter((entry): entry is QuestionAnalysis => entry != null)
    // Stable sort by questionNumber — the source array may be in
    // submission order or random order depending on backend; the UI
    // contract is "always in test order".
    .sort((a, b) => a.questionNumber - b.questionNumber);
};

// Display label for a subcategory id. Centralized here so the
// QuestionAnalysisCard doesn't need a long switch inline. Returns
// "Question" for unknown / null ids so the card always has SOME
// type label even when the backend omitted the field.
export const subcategoryLabel = (id: SubcategoryId | null): string => {
  switch (id) {
    case 1:
      return 'Read Aloud';
    case 2:
      return 'Repeat Sentence';
    case 3:
      return 'Describe Image';
    case 4:
      return 'Re-tell Lecture';
    case 5:
      return 'Answer Short Question';
    case 6:
      return 'Summarize Written Text';
    case 7:
      return 'Essay';
    case 8:
      return 'Reading MCQ (Single)';
    case 9:
      return 'Reading MCQ (Multi)';
    case 10:
      return 'Re-order Paragraphs';
    case 11:
      return 'Reading Fill Blanks';
    case 12:
      return 'R&W Fill Blanks';
    case 13:
      return 'Summarize Spoken Text';
    case 14:
      return 'Listening MCQ (Multi)';
    case 15:
      return 'Listening MCQ (Single)';
    case 16:
      return 'Listening Fill Blanks';
    case 17:
      return 'Highlight Correct Summary';
    case 18:
      return 'Highlight Incorrect Words';
    case 19:
      return 'Select Missing Word';
    case 20:
      return 'Write From Dictation';
    case 21:
      return 'Respond to Situation';
    case 22:
      return 'Speaking';
    default:
      return 'Question';
  }
};
