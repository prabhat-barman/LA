import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import { normalizePendingMock } from '../helpers';
import type { PendingMock } from '../types';

// Backend ships pending tests under one of several response shapes
// (depending on backend version) — strip them down to a flat array
// of raw entries before handing off to the normalizer.
const extractPendingList = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.result)) return o.result;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.pending)) return o.pending;
    // Some legacy responses wrap under `original.result`.
    if (o.original && typeof o.original === 'object') {
      const inner = (o.original as Record<string, unknown>).result;
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
};

const PENDING_QUERY_KEY = ['pending-mocks'] as const;

// Dedupe pending mocks by `(variant, mockId)`. Same backend-shape
// concern as `usePastMocks` — overlapping pagination or the same
// mock appearing across both endpoints would otherwise cause:
//   • React `key` collisions in the In Progress rail.
//   • Stale-vs-fresh `lastSavedAtIso` confusion (the dup picked
//     last wins, which may overwrite the more-recent save state).
// Last-write-wins is fine here — backend dupes from a single
// session should carry identical save state; in the rare case
// where they differ, the later record is more likely to reflect
// the user's current attempt.
export const dedupePendingMocks = (mocks: PendingMock[]): PendingMock[] => {
  const seen = new Map<string, PendingMock>();
  let dupeCount = 0;
  for (const m of mocks) {
    const key = `${m.variant}-${String(m.mockId)}`;
    if (seen.has(key)) dupeCount += 1;
    seen.set(key, m);
  }
  if (__DEV__ && dupeCount > 0) {
    logger.warn(
      `[usePendingMocks] dropped ${dupeCount} duplicate pending-mock record(s) — backend returned the same (variant, mockId) more than once`,
    );
  }
  return Array.from(seen.values());
};

// React Query hook that fetches *both* the standard and extensive
// pending-mock lists in parallel and merges them into one normalized
// array. The two-endpoint split mirrors the MockTestScreen's existing
// Mock / Extensive toggle but we deliberately surface them merged
// here — the In Progress rail spans both variants because a user can
// have paused attempts in either one and we want a single place to
// resume from.
//
// Each normalized entry carries its own `variant` field so the
// MockTestScreen tap handler knows which endpoint family to route
// back to when launching the runner.
export const usePendingMocks = () => {
  const query = useQuery({
    queryKey: PENDING_QUERY_KEY,
    queryFn: async (): Promise<PendingMock[]> => {
      // Fire both endpoints in parallel — they're independent and we
      // don't want a slow standard list to delay surfacing extensive
      // pending tests (or vice versa). `allSettled` so one endpoint
      // failing doesn't black-hole the other.
      const [standard, extensive] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.PENDING_TEST_LIST),
        apiClient.get(API_ENDPOINTS.EXTENSIVE_PENDING_TEST_LIST),
      ]);

      const merged: PendingMock[] = [];

      if (standard.status === 'fulfilled') {
        for (const raw of extractPendingList(standard.value.data)) {
          const normalized = normalizePendingMock(raw, { variant: 'full' });
          if (normalized) merged.push(normalized);
        }
      } else {
        logger.warn(
          '[usePendingMocks] standard pending list failed',
          standard.reason,
        );
      }

      if (extensive.status === 'fulfilled') {
        for (const raw of extractPendingList(extensive.value.data)) {
          const normalized = normalizePendingMock(raw, { variant: 'extensive' });
          if (normalized) merged.push(normalized);
        }
      } else {
        logger.warn(
          '[usePendingMocks] extensive pending list failed',
          extensive.reason,
        );
      }

      return dedupePendingMocks(merged);
    },
    // Short stale time — pending state changes whenever the user
    // saves & exits or finalizes a test, and the In Progress rail
    // should reflect that on next focus / refresh. 30s catches
    // most "user came back from runner" cases without hammering
    // the endpoint on every screen mount.
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Map keyed by `${variant}-${mockId}` for O(1) "does this test
  // have a pending attempt?" lookups from per-card logic. Computed
  // here so the consumer doesn't have to remember the key shape.
  const byKey = useMemo(() => {
    const map = new Map<string, PendingMock>();
    for (const p of query.data ?? []) {
      map.set(`${p.variant}-${String(p.mockId)}`, p);
    }
    return map;
  }, [query.data]);

  return {
    ...query,
    pendingMocks: query.data ?? [],
    byKey,
  };
};

export const PENDING_MOCKS_QUERY_KEY = PENDING_QUERY_KEY;
