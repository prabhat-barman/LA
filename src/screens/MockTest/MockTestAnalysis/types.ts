// Per-question analysis screen — what the user got right / wrong on
// each question of a finished mock test. Reached from the result
// screen's "Question Breakdown" CTA.
//
// Like MockTestResult, we don't have a locked backend contract for
// MOCK_ANALYSIS (`mock/resultDetail/{mockId}`) yet — the normalizer
// extracts what it can from a defensive set of field-name aliases
// and the screen renders gracefully when fields are missing.

import type {
  MockSection,
  MockTestVariant,
  SubcategoryId,
} from '../MockTestRunner/types';
import type { PteScore } from '../MockTestResult/types';

// Component score — for free-response items (Speaking / Writing) the
// backend usually breaks the question's score into multiple sub-axes
// (Content, Fluency, Pronunciation, Grammar, Form, etc.) each with
// its own scale (max 6 for Content, max 90 for Fluency, max 2 for
// Grammar, etc.). We surface the max alongside the score so the UI
// can render "5/6" rather than "5".
export interface QuestionComponentScore {
  name: string;
  score: number | null;
  max: number;
}

// Verdict for binary-graded items (MCQ, reorder, FIB, highlight).
// `null` means the backend didn't surface a correctness flag — the
// UI falls back to comparing `userAnswer` and `correctAnswer` for
// display when this happens.
export type QuestionVerdict = 'correct' | 'partial' | 'incorrect' | null;

export interface QuestionAnalysis {
  // Stable id from the backend (or a synthesized one when missing).
  // Used as the FlatList key and the debug-sheet anchor.
  id: string;
  // 1-indexed position inside the test. Falls back to the array
  // index + 1 when the backend doesn't surface a sequence number.
  questionNumber: number;
  section: MockSection;
  // Subcategory drives the type label ("Read Aloud", "Multiple
  // Choice Multiple Answers", etc.) shown on each card. Null when
  // the backend doesn't echo it back.
  subcategoryId: SubcategoryId | null;
  // Title / short prompt from the question record. The card shows
  // the first ~120 chars; full text is only relevant in the
  // dev-only RawResponseSheet.
  title: string | null;
  // Overall score for this single question. PTE-banded (10-90) for
  // some question types, raw count (e.g. 3/5) for others — we keep
  // both `score` and `maxScore` so the card can render "3/5" or
  // "65/90" depending on the question type.
  score: PteScore;
  maxScore: number | null;
  // Correctness verdict for binary-graded items. Null for
  // free-response items (where the user reads the component scores
  // instead).
  verdict: QuestionVerdict;
  // Display-friendly user submission. For MCQ this is the picked
  // option text; for writing it's the essay snippet; for speaking
  // it's a transcript when available. Null when the backend
  // doesn't surface a representation we can render.
  userAnswer: string | null;
  correctAnswer: string | null;
  // Free-response component breakdown — empty array for binary items.
  // Always rendered in the order the backend returned (e.g. Content,
  // Fluency, Pronunciation for Speaking).
  componentScores: QuestionComponentScore[];
  // Original record for the long-press debug sheet.
  raw: unknown;
}

// Route params. Same context the result screen carries — we pass
// them through so the analysis screen has the metadata to render
// its own header without a second fetch.
export interface MockTestAnalysisRouteParams {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  title?: string;
}
