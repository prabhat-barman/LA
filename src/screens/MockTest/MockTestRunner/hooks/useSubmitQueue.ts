import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import {
  SUBMIT_MAX_RETRIES,
  SUBMIT_QUEUE_CONCURRENCY,
} from '../constants';
import { buildSubmitPayload, getRetryDelayMs } from '../helpers';
import {
  clearPersistedQueueItems,
  loadPersistedQueueItems,
  persistFailedQueueItems,
} from '../persistence';
import { createSubmitQueue, type FlushResult } from '../scheduler';
import type {
  MockSection,
  MockTestVariant,
  QueueItem,
  SubmitContext,
} from '../types';

export interface UseSubmitQueueResult {
  // Live snapshot of the queue. Re-rendered whenever any item changes
  // status, so the UI can render per-row progress / failure pills.
  items: ReadonlyArray<QueueItem>;
  // True while any item is still pending or in-flight. Use for global
  // "Submitting…" indicators in the footer / final-submit modal.
  isFlushing: boolean;
  // Submit an answer. Idempotent on `id` — re-enqueueing the same
  // question replaces the previous draft (the runner uses
  // `${mockId}-${questionId}` per `buildQueueItemId`).
  enqueue: (params: { id: string; context: SubmitContext }) => void;
  // Wait for every queued item to reach a terminal state and return
  // the breakdown. Safe to call multiple times.
  flush: () => Promise<FlushResult>;
  // Re-enqueues every currently-failed item with a fresh retry budget
  // and resolves with the flush result once all items reach terminal
  // state. Backs the "Retry Failed" CTA on the submission-failure
  // overlay. No-op when nothing is in failed status — returns a
  // satisfied flush result without contacting the network.
  retryFailed: () => Promise<FlushResult>;
  // Count of items restored from AsyncStorage on mount (Phase 2.2).
  // The runner surfaces this as a "N answers from your previous
  // session were restored — Retry" banner so the user knows the
  // crash recovery worked and can opt in to actually sending them.
  // Zero when there was nothing persisted for this mockId.
  restoredCount: number;
  // True until the hydrate-on-mount probe completes. Suppresses the
  // restored-items banner during this window so it doesn't flash for
  // a frame and then disappear when AsyncStorage returns nothing.
  isHydrating: boolean;
}

export interface UseSubmitQueueArgs {
  // The active mockId — used as the AsyncStorage partition key. When
  // null/undefined the hook becomes ephemeral (no hydrate, no persist)
  // — useful for tests and the brief render window before the runner
  // has resolved its session details from route params.
  mockId: number | string | null | undefined;
  // Mock metadata embedded into persisted records (Phase 2.3). Lets
  // the app-level recovery banner display friendly row labels like
  // "Full Mock #1" without needing to round-trip to MOCK_TEST_DETAIL
  // for every persisted mockId. All optional — when omitted the
  // banner falls back to "Mock #{mockId}".
  variant?: MockTestVariant;
  category?: MockSection | 'Full Mock';
  title?: string;
}

// React-side wrapper around the pure submit scheduler. Wires the
// SUBMIT_MOCK endpoint as the queue's `submitFn` and exposes a
// re-rendering snapshot of queue state for the runner UI.
//
// One queue per mounted runner instance — re-mounting the runner
// (e.g. resume after a crash) creates a fresh queue, which is what we
// want: failed items from a previous mount are surfaced by the
// resume API instead of being silently replayed.
//
// Phase 2.2 — Cross-restart persistence:
//   • On mount, the hook reads `persistence.loadPersistedQueueItems`
//     for the active mockId. Anything it finds is hydrated into the
//     queue as `failed`, surfaced via `restoredCount`.
//   • On every queue state change, failed items are persisted back
//     to AsyncStorage. Subsequent crashes recover them too.
//   • When the queue empties of failed items (either through a
//     successful retry or an explicit clear), the persisted record
//     is removed automatically.
export const useSubmitQueue = (
  {
    mockId,
    variant,
    category,
    title,
  }: UseSubmitQueueArgs = { mockId: undefined },
): UseSubmitQueueResult => {
  const [items, setItems] = useState<ReadonlyArray<QueueItem>>([]);
  // Hydration is async — start in the "still figuring out" state so
  // the banner doesn't appear empty-then-populated on the first
  // render frame.
  const [isHydrating, setIsHydrating] = useState(true);
  const [restoredCount, setRestoredCount] = useState(0);

  const queueRef = useRef(
    createSubmitQueue({
      submitFn: async (item: QueueItem) => {
        const formData = buildSubmitPayload(item.context);
        // Axios sets the multipart boundary automatically when fed a
        // FormData instance — no explicit Content-Type needed.
        await apiClient.post(API_ENDPOINTS.SUBMIT_MOCK, formData);
      },
      maxConcurrency: SUBMIT_QUEUE_CONCURRENCY,
      maxRetries: SUBMIT_MAX_RETRIES,
      getRetryDelayMs,
    }),
  );

  // Subscribe to queue updates. Single effect for the lifetime of the
  // hook — the queue ref never changes.
  useEffect(() => {
    return queueRef.current.subscribe(setItems);
  }, []);

  // ── Hydrate-on-mount ───────────────────────────────────────────
  //
  // Reads the previously-persisted failed items from AsyncStorage and
  // feeds them into the scheduler. Guarded against the (rare) case
  // where mockId becomes available later than the first render —
  // re-runs when mockId changes from null to a real value.
  //
  // The guard ref prevents a double-hydrate inside React Strict Mode
  // (effects fire twice in dev). Without it the queue would briefly
  // contain duplicate ids and the scheduler's no-clobber semantics
  // would silently drop the second batch — correct, but noisy.
  const didHydrateRef = useRef<string | number | null | undefined>(undefined);
  useEffect(() => {
    if (mockId == null) {
      setIsHydrating(false);
      return;
    }
    if (didHydrateRef.current === mockId) return;
    didHydrateRef.current = mockId;
    let cancelled = false;
    setIsHydrating(true);
    loadPersistedQueueItems(mockId)
      .then(restored => {
        if (cancelled) return;
        const inserted = queueRef.current.hydrate(restored);
        setRestoredCount(inserted);
      })
      .catch(() => {
        // Best-effort. The runner still works without recovered items.
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mockId]);

  // ── Persist-on-change ──────────────────────────────────────────
  //
  // Writes failed items back to AsyncStorage whenever the queue
  // state changes. `persistFailedQueueItems` removes the key when
  // the failed set is empty, so successful retries naturally clear
  // the persisted record. Fire-and-forget — storage failures don't
  // block UI updates (the in-memory queue is the source of truth).
  //
  // Skips writes while hydrating to avoid a write race: if the
  // hydrate completes after the first state change, the write
  // triggered by hydrate would land before the hydrate's items did,
  // briefly persisting an empty list.
  useEffect(() => {
    if (mockId == null || isHydrating) return;
    persistFailedQueueItems(mockId, items, {
      variant,
      category,
      title,
    }).catch(() => {});
  }, [items, mockId, isHydrating, variant, category, title]);

  const enqueue: UseSubmitQueueResult['enqueue'] = useCallback(params => {
    queueRef.current.enqueue(params);
  }, []);

  const flush: UseSubmitQueueResult['flush'] = useCallback(() => {
    return queueRef.current.flush();
  }, []);

  const retryFailed: UseSubmitQueueResult['retryFailed'] = useCallback(() => {
    return queueRef.current.retryFailed();
  }, []);

  const isFlushing = items.some(
    i => i.status === 'pending' || i.status === 'in-flight',
  );

  return {
    items,
    isFlushing,
    enqueue,
    flush,
    retryFailed,
    restoredCount,
    isHydrating,
  };
};

// Exported as a side-effect helper for the runner's finalize path —
// once the test is fully submitted the runner explicitly clears the
// persisted record so the user doesn't see ghost recovery banners on
// the next run. (`persistFailedQueueItems` would clear it on its own
// after the next state change, but finalize unmounts the hook before
// that effect can fire.)
export const clearPersistedQueueForMock = clearPersistedQueueItems;
