import type { PastMock } from '../MockTestResult/types';
import type { HistorySortOrder } from './types';

// Sort a list of past mocks according to the requested order.
// Returns a NEW array — never mutates the input — so React Query
// caches stay immutable and the screen's `useMemo` can rely on
// reference identity for re-render skipping.
//
// Score-based sorts (highest/lowest) move pending mocks (overall
// == null) to the bottom regardless of direction. Showing
// "Pending" entries at the top of a "Highest score" view would be
// confusing — they're not high or low, they're not yet graded.
// Time-based sorts (newest/oldest) keep pending mocks in their
// chronological position because their timestamps ARE meaningful.
export const sortPastMocks = (
  mocks: PastMock[],
  order: HistorySortOrder,
): PastMock[] => {
  const copy = [...mocks];

  switch (order) {
    case 'newest':
      return copy.sort((a, b) => {
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        if (aTime !== bTime) return bTime - aTime;
        // Stable tie-breaker — keeps ordering deterministic across
        // re-renders even when several mocks share a timestamp (e.g.
        // bulk-graded by the backend in the same minute).
        return String(b.mockId).localeCompare(String(a.mockId));
      });

    case 'oldest':
      return copy.sort((a, b) => {
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        if (aTime !== bTime) return aTime - bTime;
        return String(a.mockId).localeCompare(String(b.mockId));
      });

    case 'highest':
      return copy.sort((a, b) => {
        // Push nulls to the end regardless of direction.
        if (a.overall == null && b.overall == null) return 0;
        if (a.overall == null) return 1;
        if (b.overall == null) return -1;
        if (a.overall !== b.overall) return b.overall - a.overall;
        // Tie-break on newer-first so a "PB tied with an old attempt"
        // surfaces the recent one (user's most-likely interest).
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        return bTime - aTime;
      });

    case 'lowest':
      return copy.sort((a, b) => {
        if (a.overall == null && b.overall == null) return 0;
        if (a.overall == null) return 1;
        if (b.overall == null) return -1;
        if (a.overall !== b.overall) return a.overall - b.overall;
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        return bTime - aTime;
      });

    default: {
      // Exhaustiveness check — TS will surface uncovered enum
      // members here at compile time if HistorySortOrder grows.
      const _exhaustive: never = order;
      return _exhaustive;
    }
  }
};
