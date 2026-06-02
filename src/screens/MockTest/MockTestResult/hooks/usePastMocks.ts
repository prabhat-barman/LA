import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import { normalizePastMock } from '../helpers';
import type { PastMock } from '../types';

// Same defensive list-extraction pattern as `usePendingMocks` — the
// MOCK_RESULT family of endpoints ships its array under one of a few
// possible envelope keys depending on backend version. Walk them and
// fall back to an empty list rather than throwing.
const extractList = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.result)) return o.result;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.results)) return o.results;
    if (Array.isArray(o.list)) return o.list;
    if (Array.isArray(o.mocks)) return o.mocks;
    if (o.original && typeof o.original === 'object') {
      const inner = (o.original as Record<string, unknown>).result;
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
};

// Cache key. Exported so the runner can `invalidateQueries` after
// finalizing a test, forcing the rail to re-fetch and surface the
// just-completed mock without a manual pull-to-refresh.
export const PAST_MOCKS_QUERY_KEY = ['past-mocks'] as const;

// Dedupe key — same shape every consumer uses for React `key` props
// + the `byKey` Map exposed below. Keeping the format in one place
// means a future "include mockId as a number-vs-string union" change
// is a single-line edit.
const dedupeKey = (m: PastMock): string =>
  `${m.variant}-${String(m.mockId)}`;

// Picks the "better" of two duplicate PastMock records. Order:
//   1. Prefer the one with a non-null `overall` (graded beats pending).
//   2. Prefer the one with MORE populated section scores (Full Mock
//      results sometimes split across multiple rows on the backend
//      and the row with the full breakdown is more useful).
//   3. Otherwise prefer the existing (first-seen) record — stable
//      ordering for unchanged data.
// Called from `dedupePastMocks`. Pure — easy to test.
const pickRicherPastMock = (existing: PastMock, incoming: PastMock): PastMock => {
  if (existing.overall != null && incoming.overall == null) return existing;
  if (existing.overall == null && incoming.overall != null) return incoming;
  const existingSections = Object.keys(existing.sectionScores ?? {}).length;
  const incomingSections = Object.keys(incoming.sectionScores ?? {}).length;
  if (incomingSections > existingSections) return incoming;
  return existing;
};

// Removes records with duplicate `(variant, mockId)` keys, preferring
// the richer record per `pickRicherPastMock`. Backend endpoints
// occasionally return the same mock twice (overlapping pagination,
// or the same mock crossing the standard + extensive lists). Letting
// dupes through poisons three places downstream:
//   • React renders both children with the same `key` and warns,
//     then may omit / duplicate one (unsupported behaviour).
//   • `computeProgressStats` averages over the duplicated rows,
//     skewing avg / best / total.
//   • `computeSectionStats` double-counts the section scores from
//     the dupe, distorting per-section trend charts.
// Dedup at the data source plugs all three at once.
export const dedupePastMocks = (mocks: PastMock[]): PastMock[] => {
  const seen = new Map<string, PastMock>();
  let dupeCount = 0;
  for (const m of mocks) {
    const key = dedupeKey(m);
    const existing = seen.get(key);
    if (existing) {
      dupeCount += 1;
      seen.set(key, pickRicherPastMock(existing, m));
    } else {
      seen.set(key, m);
    }
  }
  if (__DEV__ && dupeCount > 0) {
    // Surface the backend duplication in dev so it gets noticed and
    // (eventually) fixed at the source. Silenced in prod — users
    // shouldn't see infrastructure noise, and the dedup itself is
    // already protecting them from the consequences.
    logger.warn(
      `[usePastMocks] dropped ${dupeCount} duplicate past-mock record(s) — backend returned the same (variant, mockId) more than once`,
    );
  }
  return Array.from(seen.values());
};

// React Query hook that fetches both the standard and extensive
// past-mock lists in parallel. Same shape as `usePendingMocks` —
// merged into one normalized array, each entry carrying its own
// `variant` so the tap handler knows which detail screen route
// params to ship.
//
// Why `staleTime: 60s`? Past results are mostly immutable — once
// a mock is graded the score doesn't change. The 60s window is
// long enough that going Dashboard → MockTestScreen and back
// doesn't trigger a re-fetch, but short enough that the just-
// finalized mock surfaces near-instantly after the runner returns.
// (The runner ALSO invalidates this key on finalize, so the user
// never has to wait the full 60s.)
export const usePastMocks = () => {
  const query = useQuery({
    queryKey: PAST_MOCKS_QUERY_KEY,
    queryFn: async (): Promise<PastMock[]> => {
      const [standard, extensive] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.MOCK_RESULT),
        apiClient.get(API_ENDPOINTS.EXTENSIVE_MOCK_RESULT),
      ]);

      const merged: PastMock[] = [];

      if (standard.status === 'fulfilled') {
        for (const raw of extractList(standard.value.data)) {
          const normalized = normalizePastMock(raw, { variant: 'full' });
          if (normalized) merged.push(normalized);
        }
      } else {
        logger.warn(
          '[usePastMocks] standard mock-result list failed',
          standard.reason,
        );
      }

      if (extensive.status === 'fulfilled') {
        for (const raw of extractList(extensive.value.data)) {
          const normalized = normalizePastMock(raw, { variant: 'extensive' });
          if (normalized) merged.push(normalized);
        }
      } else {
        logger.warn(
          '[usePastMocks] extensive mock-result list failed',
          extensive.reason,
        );
      }

      // Dedup BEFORE sort. Sort order then operates on the unique
      // set so a duplicate doesn't sneak in as a tie-breaker.
      const deduped = dedupePastMocks(merged);

      // Sort newest-first by completion date so the most recently
      // finished mock is the leftmost card in the rail (best
      // matches user mental model: "show me my latest result").
      // Entries without timestamps sink to the end — stable
      // relative to each other.
      deduped.sort((a, b) => {
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        return bTime - aTime;
      });

      return deduped;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Map keyed by `${variant}-${mockId}` for O(1) lookups. Mirrors
  // the shape `usePendingMocks` exposes so the MockTestScreen can
  // join the two rails to mark cards that are "in progress" vs
  // "completed" with the same lookup helper.
  const byKey = useMemo(() => {
    const map = new Map<string, PastMock>();
    for (const p of query.data ?? []) {
      map.set(dedupeKey(p), p);
    }
    return map;
  }, [query.data]);

  return {
    ...query,
    pastMocks: query.data ?? [],
    byKey,
  };
};
