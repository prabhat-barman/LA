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

      // Sort newest-first by completion date so the most recently
      // finished mock is the leftmost card in the rail (best
      // matches user mental model: "show me my latest result").
      // Entries without timestamps sink to the end — stable
      // relative to each other.
      merged.sort((a, b) => {
        const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
        const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
        return bTime - aTime;
      });

      return merged;
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
      map.set(`${p.variant}-${String(p.mockId)}`, p);
    }
    return map;
  }, [query.data]);

  return {
    ...query,
    pastMocks: query.data ?? [],
    byKey,
  };
};
