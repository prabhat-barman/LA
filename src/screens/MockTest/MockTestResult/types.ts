// Normalized result payload the MockTestResultScreen renders. The
// backend's MOCK_SCORE response is not yet locked — fields below mirror
// the PTE-standard score model (overall 10-90 + per-section + enabling
// skills) and the normalizer extracts what it can find from a wide
// variety of input shapes.
//
// Anything unrecognized is preserved on `raw` so the long-press debug
// sheet can dump the original payload back to the developer.

import type { MockSection, MockTestVariant } from '../MockTestRunner/types';

// Bounded PTE band (10..90) — every numeric score in the normalized
// surface is clamped into this range so the UI never paints a bar that
// overshoots its track. `null` means "backend didn't surface this
// score" and the UI should render the card as "pending" rather than 0.
export type PteScore = number | null;

export interface SectionScore {
  section: MockSection;
  score: PteScore;
  // Some backends return a 0-1 percentage rather than the 10-90 band.
  // Captured here verbatim for the debug sheet; the normalizer also
  // converts it into `score` when only the percentage is present.
  rawPercentage?: number;
}

// PTE communicative skills — Grammar, Oral Fluency, Pronunciation,
// Spelling, Vocabulary, Written Discourse. The set the backend returns
// varies by mock variant; the UI handles missing entries gracefully.
export interface EnablingSkillScore {
  name: string;
  score: PteScore;
}

// Final shape consumed by the screen. `overall` may be null when the
// backend hasn't computed the score yet (e.g. async grading still in
// flight); the UI then renders the "Pending" empty state.
export interface MockResult {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Display-friendly title. Best-effort: pulled from `title`, `name`,
  // or composed from variant + category if the backend omits it.
  title: string;
  // 10-90 PTE band. Null when grading hasn't completed.
  overall: PteScore;
  // Always 4 entries (Full Mock) or 1 (sectional). Sections not
  // covered by the mock have `score: null`. Order matches the test's
  // own section order: Speaking → Writing → Reading → Listening.
  sections: SectionScore[];
  // Communicative skills — empty array when the backend omitted them.
  // The screen renders the card only when length > 0.
  enablingSkills: EnablingSkillScore[];
  // Total questions in the mock + how many the user attempted (any
  // non-empty submission). Both null when the backend doesn't surface
  // them; the UI renders dashes in that case.
  totalQuestions: PteScore;
  attemptedQuestions: PteScore;
  // ISO timestamp when the result was generated. Best-effort parsed
  // from common backend field names; `null` when nothing parseable
  // is present.
  submittedAtIso: string | null;
  // The original API payload. Surfaced via the long-press debug
  // sheet so we can iterate the normalizer when the real shape
  // differs from our defensive guesses.
  raw: unknown;
}

// Lightweight summary of a completed mock test, rendered as a card
// in the "Completed Tests" rail on MockTestScreen. Tapping a card
// navigates into MockTestResult for the full breakdown.
//
// Deliberately narrower than `MockResult` — the list endpoint
// (MOCK_RESULT / EXTENSIVE_MOCK_RESULT) returns a slim per-test
// summary, and forcing the rail to render full result detail would
// waste bandwidth + render time. The full payload is fetched lazily
// when the user taps in.
export interface PastMock {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Display title. Best-effort: backend field → composed default
  // ("Full Mock #123") if missing.
  title: string;
  // Overall PTE score (10-90). Null when the backend hasn't graded
  // the test yet — the card then renders "Pending" instead of a
  // numeric score so the user knows results are still incoming.
  overall: PteScore;
  // Per-section breakdown (Phase 6.1). Populated opportunistically
  // from the list response — some backends ship section scores in
  // the list payload, others don't. The Progress dashboard uses
  // these for per-section trend charts + weakest-skill detection;
  // empty (every section null) means the dashboard gracefully
  // falls back to overall-only.
  //
  // Sectional mocks (variant === 'extensive') populate the ONE
  // section matching their `category` from `overall` and leave the
  // rest null. Full Mocks attempt to extract every section from
  // dedicated backend fields (`speaking_score`, etc).
  sectionScores: Partial<Record<MockSection, PteScore>>;
  // ISO timestamp the mock was completed. Used for the card meta
  // line ("Jun 1"). Null when the backend doesn't surface a
  // recognisable timestamp.
  submittedAtIso: string | null;
  // Original raw entry — kept for parity with PendingMock so
  // consumers can fall back to legacy fields the normalizer
  // doesn't surface (and so debugging tools can dump the source).
  raw: unknown;
}

// Route params for the result screen. Mirrors the runner's params
// minus the prereq-specific bits. `mockId` + `variant` + `category`
// are all we need to fetch and label the result.
export interface MockTestResultRouteParams {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Optional — when present, shown as the screen's headline instead
  // of the composed default. Lets the runner pass through whatever
  // title the prereq screen had so the user sees a consistent label
  // across the prereq → runner → result flow.
  title?: string;
}
