// Phase 5.1 — full history screen types.
//
// History reuses the `PastMock` shape from the result family (no
// new normalization needed) and adds a screen-local sort order
// enum. The four sort modes were picked to match user mental
// models for "I'm looking through old attempts":
//   • newest — default, "what did I just do?"
//   • oldest — first time pre-baseline
//   • highest — celebrate / find PBs
//   • lowest — find what went wrong / regressions

export type HistorySortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

export const HISTORY_SORT_OPTIONS: ReadonlyArray<{
  id: HistorySortOrder;
  label: string;
}> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'highest', label: 'Highest' },
  { id: 'lowest', label: 'Lowest' },
];
