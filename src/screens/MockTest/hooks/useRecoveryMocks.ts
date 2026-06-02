import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import apiClient from '../../../services/apiClient';
import {
  SUBMIT_MAX_RETRIES,
  SUBMIT_QUEUE_CONCURRENCY,
} from '../MockTestRunner/constants';
import { buildSubmitPayload, getRetryDelayMs } from '../MockTestRunner/helpers';
import {
  clearPersistedQueueItems,
  listPersistedMocks,
  loadPersistedQueueItems,
  persistFailedQueueItems,
  type PersistedMockSummary,
} from '../MockTestRunner/persistence';
import {
  createSubmitQueue,
  type FlushResult,
} from '../MockTestRunner/scheduler';
import type { QueueItem } from '../MockTestRunner/types';

// Phase 2.3 — App-level recovery surface.
//
// Wraps `listPersistedMocks()` in a React Query for the MockTestScreen
// banner, plus exposes a per-mock retry handler that spins up a
// short-lived scheduler instance to push failed items at the SUBMIT
// endpoint without forcing the user to re-open the runner.
//
// Why a one-shot scheduler instead of just looping through items
// with apiClient.post directly?
//   • Same concurrency / backoff behaviour as the in-runner queue —
//     produces consistent retry semantics from the user's POV.
//   • Already battle-tested via the scheduler test suite — wrapping
//     it is cheaper than reimplementing the loop here.
//   • The scheduler's `hydrate` + `retryFailed` flow gives us the
//     pending → in-flight → succeeded/failed lifecycle for free,
//     including its per-item `lastError` propagation.

export const RECOVERY_MOCKS_QUERY_KEY = ['recovery-mocks'] as const;

export interface UseRecoveryMocksResult {
  // Persisted mock summaries, newest-first. Same shape as
  // `listPersistedMocks` returns directly — empty array when there's
  // nothing to recover.
  persistedMocks: PersistedMockSummary[];
  // Standard React Query loading / error / refetch surface.
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  // The mockId currently being retried, or `null` when idle. The
  // banner uses this to gate per-row "Retry" buttons and show a
  // pending spinner on the active row. Only one retry runs at a
  // time to avoid hammering the network with multiple parallel
  // bulk-resubmits.
  retryingMockId: number | string | null;
  // Triggers a recovery flush for one persisted mock. On full
  // success: clears the storage entry and invalidates the query so
  // the banner self-hides. On partial success: re-persists the
  // residual failures (with their new attempt counts) so the user
  // can try again later.
  retryMock: (mockId: number | string) => Promise<FlushResult | null>;
}

export const useRecoveryMocks = (): UseRecoveryMocksResult => {
  const queryClient = useQueryClient();

  // 30s staleTime — banner should react quickly to a successful
  // retry, but doesn't need to thrash storage on every screen
  // re-mount during a single session.
  const query = useQuery({
    queryKey: RECOVERY_MOCKS_QUERY_KEY,
    queryFn: listPersistedMocks,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    // Recovery is a "show what's in local storage" probe — never
    // worth retrying on failure since `listPersistedMocks` already
    // returns [] on any AsyncStorage error rather than throwing.
    retry: false,
  });

  const [retryingMockId, setRetryingMockId] = useState<
    number | string | null
  >(null);

  const retryMock: UseRecoveryMocksResult['retryMock'] = useCallback(
    async (mockId) => {
      if (retryingMockId != null) return null;
      setRetryingMockId(mockId);
      try {
        const persistedItems = await loadPersistedQueueItems(mockId);
        if (persistedItems.length === 0) {
          // Nothing to do — storage was cleared between the banner
          // render and the tap (probably by a separate runner mount
          // succeeding). Invalidate so the banner refreshes.
          await clearPersistedQueueItems(mockId);
          queryClient.invalidateQueries({
            queryKey: RECOVERY_MOCKS_QUERY_KEY,
          });
          return { allSucceeded: true, failedItems: [], totalItems: 0 };
        }

        // Short-lived scheduler — lives only for the duration of
        // this retry. No subscribers, no live state to worry about.
        const queue = createSubmitQueue({
          submitFn: async (item: QueueItem) => {
            const formData = buildSubmitPayload(item.context);
            await apiClient.post(API_ENDPOINTS.SUBMIT_MOCK, formData);
          },
          maxConcurrency: SUBMIT_QUEUE_CONCURRENCY,
          maxRetries: SUBMIT_MAX_RETRIES,
          getRetryDelayMs,
        });
        queue.hydrate(persistedItems);
        const result = await queue.retryFailed();

        if (result.allSucceeded) {
          await clearPersistedQueueItems(mockId);
        } else {
          // Re-persist the residual failures so the banner can
          // continue to surface them on the next mount. The new
          // record carries the bumped `attempts` counter and any
          // updated `lastError` so the user gets fresh diagnostic
          // info if they peek at it later.
          //
          // Preserves the same metadata from the existing record.
          // We look it up from the listing rather than re-reading
          // the file (which we just deleted by calling hydrate?)
          // — actually `loadPersistedQueueItems` doesn't delete,
          // so we could pull meta from cache. Simpler: pull it
          // from the existing summary.
          const summary = query.data?.find(s => s.mockId === mockId);
          await persistFailedQueueItems(mockId, queue.getItems(), {
            variant: summary?.variant,
            category: summary?.category,
            title: summary?.title,
          });
        }

        queryClient.invalidateQueries({
          queryKey: RECOVERY_MOCKS_QUERY_KEY,
        });
        return result;
      } finally {
        setRetryingMockId(null);
      }
    },
    [queryClient, query.data, retryingMockId],
  );

  return {
    persistedMocks: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    retryingMockId,
    retryMock,
  };
};
