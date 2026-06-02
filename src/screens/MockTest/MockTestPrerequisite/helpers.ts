import { QUESTION_METADATA } from '../../../config/subcategoryConfig';
import type { Question, SubcategoryId } from '../MockTestRunner/types';

// subcategory_id → human label, derived once at module load from the
// existing `QUESTION_METADATA` table. Centralized here so the prereq
// screen and any future analytics surface render identical strings.
const SUBCATEGORY_LABEL: Record<number, string> = QUESTION_METADATA.reduce(
  (acc, item) => {
    acc[item.id] = item.type;
    return acc;
  },
  {} as Record<number, string>,
);

// Fallback label for an unknown subcategory id. Should only fire if
// the backend ships a new subcategory before the client config is
// updated — surfaces the raw id so it's obvious in QA screenshots.
const labelFor = (subId: SubcategoryId): string =>
  SUBCATEGORY_LABEL[subId] ?? `Type #${subId}`;

export interface QuestionBreakdownEntry {
  label: string;
  count: number;
}

// Group a flat question list into ordered "Type (n)" entries.
// Order is preserved from first appearance in `questions[]` so the
// breakdown reads in the same sequence the test will actually play.
//
// Returns an empty list rather than throwing on an empty input — the
// module-intro slide degrades gracefully and the parent screen can
// still surface "No questions found" via its own error UI.
export const buildQuestionBreakdown = (
  questions: Question[],
): QuestionBreakdownEntry[] => {
  const order: SubcategoryId[] = [];
  const counts = new Map<SubcategoryId, number>();

  for (const q of questions) {
    if (!counts.has(q.subcategory_id)) {
      order.push(q.subcategory_id);
    }
    counts.set(q.subcategory_id, (counts.get(q.subcategory_id) ?? 0) + 1);
  }

  return order.map(subId => ({
    label: labelFor(subId),
    count: counts.get(subId) ?? 0,
  }));
};

// Format a seconds duration as "Xh Ym" / "Y min" / "Z sec".
// Used in the module-intro slide's "Time allowed" row. Kept here
// instead of imported from `helpers.ts` (runner) to avoid a circular
// dependency between MockTestRunner ↔ MockTestPrerequisite.
export const formatTimeAllowed = (totalSec: number): string => {
  if (totalSec <= 0) return '0 min';

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 30 ? `${minutes + 1} min` : `${minutes} min`;
  }
  return `${seconds} sec`;
};
