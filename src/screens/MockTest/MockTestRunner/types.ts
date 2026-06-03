// Type contracts for the mock-test runner. Phase 1.0 lays the
// foundation; component-shape types may grow as we learn the exact
// `MOCK_TEST_DETAIL` response from the backend, but the discriminated
// unions for `AnswerDraft` / `AnswerKind` are stable and should be
// treated as the source of truth across the runner.

export type MockTestVariant = 'full' | 'extensive';

export type MockSection = 'Speaking' | 'Writing' | 'Reading' | 'Listening';

// Every subcategory id the PTE Academic backend ships. Numbering
// matches `src/config/URLS.ts` (the per-type practice endpoints) so
// upstream code can pass the value through unchanged.
//
//   1..5  + 21, 22  → Speaking (21 = "Respond to a situation";
//                    22 = additional speaking variant surfaced by the
//                    mock-test endpoints — kept here so the union
//                    accepts every id the runner can encounter.)
//   6, 7            → Writing (Summarize Text, Essay)
//   8..12           → Reading (MCQ single/multi, Reorder, Fill blanks)
//   13..20          → Listening (Summarize spoken, MCQ, Fill blanks,
//                     Highlight summary, Missing/Incorrect words,
//                     Dictation)
export type SubcategoryId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22;

// What kind of answer the question accepts. Drives the runner footer's
// "Next enabled?" check, the per-question component switch in
// `QuestionRouter`, and the payload formatter in the submit queue.
//
// Kept narrower than `SubcategoryId` on purpose — many question types
// share the same answer shape (e.g. 1..5 + 21 all record audio).
export type AnswerKind =
  | 'speaking'
  | 'writing'
  | 'mcq-single'
  | 'mcq-multi'
  | 'reorder'
  // Reading "Fill in the Blanks" (sub 11) — flat word bank, drag /
  // tap any word into any blank. Same wire format as fib-dropdown
  // (leading-comma interleaved CSV) but the picker UX is different.
  | 'fib-bank'
  | 'fib-dropdown'
  | 'fib-input'
  | 'highlight';

// Backend response shape for `MOCK_TEST_DETAIL` is not yet locked. We
// model the *internal* normalized question here and keep `raw` as an
// escape hatch for fields we haven't promoted into the typed surface
// yet. Components MUST read normalized fields first.
export interface Question {
  id: number | string;
  subcategory_id: SubcategoryId;
  kind: AnswerKind;
  title?: string;
  prompt?: string;
  paragraph?: string;
  imageUrl?: string;
  audioUrl?: string;
  options?: { id: string; text: string }[];
  paragraphs?: { id: string; text: string }[];
  blanks?: { id: string; choices?: string[] }[];
  // Raw `answer` field from the backend. Only used for highlight
  // questions (subcategory 19) where the displayable paragraph lives
  // here (with `<span id='cAns'>…</span>` markers wrapping the
  // intended-correct words). The runner strips the markers for
  // display and tokenizes by whitespace.
  answerMarkup?: string;
  // Pre-parsed fill-in-the-blank structure. Populated by the
  // normalizer for subcategories 11, 12, 16. `parts.length` is
  // always `blanks.length + 1` — the text segments between (and
  // around) the blanks.
  //
  // Per FIB variant:
  //   • sub 11 (fib-bank): `bank` is the flat list of words pooled
  //     from every `option[i].options` entry — any blank can take
  //     any bank word. `blanks[i].choices` is undefined.
  //   • sub 12 (fib-dropdown): `blanks[i].choices` is the per-blank
  //     choice list. `bank` is undefined.
  //   • sub 16 (fib-input): both `choices` and `bank` are undefined
  //     — the user types freely into each blank.
  fib?: {
    parts: string[];
    blanks: { id: string; choices?: string[] }[];
    bank?: string[];
  };
  // Original payload from the API — retained so unmodeled fields can
  // still be inspected during development / surfaced in error reports.
  raw: unknown;
}

// In-memory answer the user is currently composing for a question.
// `empty` lets `useReducer` start in a known state without nullability.
export type AnswerDraft =
  | { kind: 'speaking'; audioFilePath: string; durationSec: number }
  | { kind: 'writing'; text: string }
  | { kind: 'mcq-single'; selectedId: string | null }
  | { kind: 'mcq-multi'; selectedIds: string[] }
  | { kind: 'reorder'; orderedIds: string[] }
  // Ordered values, parallel to `question.fib.blanks`. `null` means
  // "no selection yet" (blank not filled). For text-input FIB we use
  // `''` instead — semantically equivalent at submit time but makes
  // TextInput's controlled-value contract cleaner.
  | { kind: 'fib-bank'; values: (string | null)[] }
  | { kind: 'fib-dropdown'; values: (string | null)[] }
  | { kind: 'fib-input'; values: string[] }
  // `selectedWords` mirrors `selectedIndices` (parallel arrays) so the
  // submit payload can lift the user's picked words directly without
  // having to re-tokenize the question at submit time. The component
  // computes both on every selection change.
  | { kind: 'highlight'; selectedIndices: number[]; selectedWords: string[] }
  | { kind: 'empty' };

// The "answer" portion of a submission — just what the user provided
// for one question. JSON-serializable so the queue can persist this
// to AsyncStorage when we add offline support in Phase 2.
export interface AnswerSubmission {
  mockId: number | string;
  questionId: number | string;
  subcategoryId: SubcategoryId;
  draft: AnswerDraft;
  // Epoch ms when the user pressed Next. Used for both backend
  // tie-breaking and local "submitted X seconds ago" UI.
  submittedAt: number;
}

// Wire-level context required to build the SUBMIT_MOCK FormData
// payload. The backend expects a bundle of test-state metadata along
// with each answer (`q_count`, `time`, `pending`, `complete`, etc.)
// so the runner has to thread these through alongside the raw answer.
//
// Kept separate from `AnswerSubmission` because these fields are
// recomputed at submit time (e.g. `remainingTotalSeconds` ticks down)
// — they should not be frozen into the queued draft.
export interface SubmitContext {
  answer: AnswerSubmission;
  // 1-indexed position of this question inside the full test.
  questionNumber: number;
  // Total number of questions in the test (backend's `q_count`).
  totalQuestions: number;
  // Seconds the user spent on THIS question before pressing Next.
  secondsSpentOnQuestion: number;
  // Seconds remaining on the overall test timer at submit time.
  remainingTotalSeconds: number;
  // The question's `audio_script` (or null) — echoed back to the
  // backend in `script[]`. Kept opaque; runner pulls it from `Question`.
  audioScript: string | null;
  // The question's display/prompt text — echoed back to the backend
  // in `text[]`. Legacy app always sends this for every question
  // type; omitting it causes a `foreach() ... null given` 500 on the
  // PHP side when the controller iterates the input. Empty string
  // when no prompt is available rather than missing the key.
  questionText: string | null;
  // Ground truth from the question payload — backend wants it echoed
  // in `answer[]`, `ans[]`, `q_ans[]`, `correct[]` (legacy, but
  // required). Null for question kinds where no canonical answer exists.
  correctAnswer: string | null;
  // HTML representation of the user's selection — only meaningful for
  // word-highlight (subcategory 19). Null otherwise.
  htmlAnswer: string | null;
  // Save-and-exit flag (becomes `pending: '1'` on the wire).
  isPending: boolean;
  // Final-submit / timeout flag (becomes `complete: '1'`).
  isComplete: boolean;
  // Device platform string the backend wants in `isPlatform`.
  platform: 'android' | 'ios';
}

export type QueueStatus = 'pending' | 'in-flight' | 'succeeded' | 'failed';

// Per-answer record in the in-flight submit queue. `id` is stable
// across retries so the queue can dedupe and the UI can attach
// progress indicators to a single row.
//
// `context` holds the full `SubmitContext` snapshotted when the user
// pressed Next — frozen so retries replay the same payload (the
// `remainingTotalSeconds` shouldn't tick down between attempts).
export interface QueueItem {
  id: string; // `${mockId}-${questionId}`
  context: SubmitContext;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
}

// Live runner session. Holds the bulk-fetched question list from
// `MOCK_TEST_DETAIL` plus the test-level state needed to drive the
// timer + resume / progress indicators.
//
// Section grouping is derived on demand from `questions[].subcategory_id`
// via `getSection()` rather than precomputed here — keeps the session
// shape simple and avoids two sources of truth.
export interface MockSession {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Total time the user has across the entire test (sum of section
  // durations for Full Mock, or the single section for Extensive).
  totalDurationSec: number;
  // Per-section durations (seconds), captured from the backend's
  // `speaking_time` / `writing_time` / `reading_time` / `listening_time`
  // fields when present. Used by the Full Mock prereq welcome table
  // and (later) the per-section timer in the runner. Partial because
  // a Sectional mock will only populate the relevant section, and
  // because the backend isn't guaranteed to ship all four fields.
  sectionDurationsSec: Partial<Record<MockSection, number>>;
  // Full ordered list of questions returned by the bulk-fetch
  // endpoint. The runner walks this array via `currentIndex`; the
  // backend's `curr_q` lands in `startIndex` for resume.
  questions: Question[];
  // 0 for a fresh attempt, `curr_q` from the API when resuming a
  // saved-and-exited test.
  startIndex: number;
  // Pre-computed contiguous section boundaries (Speaking → Writing →
  // Reading → Listening order for Full Mock). Each entry covers
  // `[startIndex, endIndex]` inclusive in the `questions` array and
  // carries its own timer budget. Computed eagerly by the normalizer
  // so the runner doesn't have to re-scan questions on every render
  // to figure out where it is.
  //
  // Sectional mocks (Speaking-only, Listening-only, etc.) end up with
  // a single-entry array — the runner's section-break code is a no-op
  // in that case.
  sectionRanges: ReadonlyArray<{
    section: MockSection;
    startIndex: number;
    endIndex: number;
    durationSec: number;
  }>;
}

// What `navigation.navigate('MockTestRunner', …)` accepts. Intentionally
// narrow — the runner hydrates everything else from the backend itself
// to avoid stale state on resume / deep-link / push-notification entry.
export interface MockTestRunnerRouteParams {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  title: string;
  // Populated when the user is resuming a saved-and-exit attempt
  // (entry point: `PENDING_TEST_LIST`). The runner uses these to
  // skip to the right question and seed the timer instead of starting
  // from scratch.
  resume?: {
    startQuestionIndex: number;
    remainingSecondsTotal: number;
  };
  // Local file URI of the personal introduction audio captured in the
  // prereq carousel (PTE "Introduce yourself" — Speaking section's
  // identity-verification recording). The runner doesn't consume it
  // today; Phase 2.0+ will multipart-upload this alongside the final
  // SUBMIT_MOCK call. Threaded through here so the URI survives the
  // prereq → runner navigation without needing a context/store.
  personalIntroAudioPath?: string;
}

// Normalized entry from PENDING_TEST_LIST / EXTENSIVE_PENDING_TEST_LIST.
// Each entry is a paused-attempt the user can resume — we surface
// these as a separate "In Progress" rail on MockTestScreen and route
// directly to MockTestRunner with `resume` populated on tap (skipping
// the prereq carousel, which the user already cleared).
//
// Fields are derived defensively from the backend response — the
// pending-list payload uses different field names than mock detail
// (legacy aliases: `mock_id`, `curr_q`, `time`/`remaining_time`,
// `mock_name`/`title`). The normalizer tolerates either spelling.
export interface PendingMock {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  title: string;
  // Question index to seed the runner with on resume. Derived from
  // the backend's `curr_q` (0-based) or `current_question` (1-based)
  // depending on which field is present — normalizer collapses to
  // 0-based.
  startQuestionIndex: number;
  // Total remaining seconds across the whole test. Wired into the
  // mock timer's `initialSeconds` so the clock picks up where it
  // left off instead of restarting from `totalDurationSec`.
  remainingSecondsTotal: number;
  // Convenience fields for the In Progress card UI — derived in the
  // normalizer so the screen doesn't have to recompute on every
  // re-render.
  totalQuestions?: number;
  // Original payload for debugging / future field extraction.
  raw: unknown;
}
