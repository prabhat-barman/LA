import type { AnswerKind, MockSection, SubcategoryId } from './types';

// subcategory_id → answer shape. Centralized here so the question
// router, footer, and payload formatter all agree on what a question
// "does". Update this map (and `SUBCATEGORY_TO_SECTION` below) when
// the backend introduces a new subcategory.
//
// Mapping is anchored to the backend's `subcategory_id` → answer-shape
// expectations as documented in the mock-test payload contract:
//   - MCQ-single covers 8, 14, 17, 18 (yes, 17 "highlight correct
//     summary" and 18 "missing word" are single-choice picks, not
//     true highlight UX — the backend treats them as single-select).
//   - 19 is the only true "highlight words" type that submits both
//     `selected[]` and `html[]`.
//   - 11 (Reading FIB) and 12 (Reading & Writing FIB) share the
//     same `selected[]` wire format (leading-comma interleaved CSV)
//     but their picker UX differs: 11 is a flat word bank, 12 is a
//     per-blank dropdown.
//   - 22 is a speaking variant present in mock tests.
export const SUBCATEGORY_TO_ANSWER_KIND: Record<SubcategoryId, AnswerKind> = {
  // Speaking (1..5) + Respond-to-a-situation (21) + variant (22).
  1: 'speaking',
  2: 'speaking',
  3: 'speaking',
  4: 'speaking',
  5: 'speaking',
  21: 'speaking',
  22: 'speaking',

  // Writing (6..7) + listening writing-style answers (13 summarize
  // spoken, 20 write from dictation).
  6: 'writing',
  7: 'writing',
  13: 'writing',
  20: 'writing',

  // MCQ single-select. Includes Listening "Highlight Correct Summary"
  // (17) and "Missing Word" (18) — both are single-pick from a list
  // even though the UI surface differs.
  8: 'mcq-single',
  14: 'mcq-single',
  17: 'mcq-single',
  18: 'mcq-single',

  // MCQ multi-select (Reading + Listening).
  9: 'mcq-multi',
  15: 'mcq-multi',

  // Reading "Re-order paragraphs".
  10: 'reorder',

  // Reading "Fill in the Blanks" (11) — flat word bank, tap a word
  // then tap a blank to drop it in. Distinct picker UX from the
  // per-blank dropdown of sub 12.
  11: 'fib-bank',
  // Reading & Writing "Fill in the Blanks" (12) — each blank has
  // its own independent dropdown choice list.
  12: 'fib-dropdown',

  // Fill-in-the-blanks (free text input). Listening FIB — user types
  // the missing word(s). NOTE: payload doc doesn't list 16 explicitly;
  // this assignment follows the PTE Academic specification. Verify
  // once the runner hits the first listening FIB submit in dev.
  16: 'fib-input',

  // Word highlight — "Highlight Incorrect Words" (19) submits both
  // `selected[]` (the picked word ids) and `html[]` (the rendered
  // marked-up transcript).
  19: 'highlight',
};

// subcategory_id → section. Drives the section timer in Full Mock and
// the section-break screen between Speaking → Writing etc.
export const SUBCATEGORY_TO_SECTION: Record<SubcategoryId, MockSection> = {
  1: 'Speaking',
  2: 'Speaking',
  3: 'Speaking',
  4: 'Speaking',
  5: 'Speaking',
  21: 'Speaking',
  22: 'Speaking',

  6: 'Writing',
  7: 'Writing',

  8: 'Reading',
  9: 'Reading',
  10: 'Reading',
  11: 'Reading',
  12: 'Reading',

  13: 'Listening',
  14: 'Listening',
  15: 'Listening',
  16: 'Listening',
  17: 'Listening',
  18: 'Listening',
  19: 'Listening',
  20: 'Listening',
};

// Hard fallback durations (seconds) used ONLY when the backend's
// duration field is missing or zero. These mirror standard PTE Academic
// timings — they exist so the runner doesn't bricks itself with a
// 0-second timer, and we log a warning whenever they kick in.
export const DEFAULT_SECTION_DURATION_SEC: Record<MockSection, number> = {
  Speaking: 35 * 60,
  Writing: 35 * 60,
  Reading: 30 * 60,
  Listening: 38 * 60,
};

// How many SUBMIT_MOCK requests we let fly in parallel during the
// queue drain. Picked low so we don't trip backend rate limits at the
// end-of-test rush (worst case: 30 questions all submitted within a
// few hundred ms of each other). Raise once we've profiled.
export const SUBMIT_QUEUE_CONCURRENCY = 2;

// Max retry attempts per answer. After this many failures the queue
// flips the item to `failed` and the final review screen surfaces it
// with a manual "retry" CTA backed by `SUBMIT_FAILED_MOCK`.
export const SUBMIT_MAX_RETRIES = 3;
