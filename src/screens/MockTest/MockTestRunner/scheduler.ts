import type { QueueItem, QueueStatus, SubmitContext } from './types';

// React-free submit scheduler. Lives outside the hook layer so we can
// unit-test the queueing / retry behaviour without spinning up a
// renderer or mocking `react-query`.
//
// Contract:
//   • `enqueue` is idempotent on `id` — re-enqueueing the same
//     question replaces the previous draft instead of duplicating
//     the row in the queue (matches the user mental model: "the last
//     answer I submitted for this Q wins").
//   • Submissions run with at most `maxConcurrency` in flight at any
//     time. New work is picked up immediately when a slot frees.
//   • Failures retry with `getRetryDelayMs(attempt)` ms of backoff
//     until either the item succeeds or `maxRetries` is exhausted —
//     after that it transitions to `failed` and the final-submit
//     flow surfaces a manual retry CTA.
//   • `flush()` waits until every item has reached a terminal state
//     (`succeeded` or `failed`) and resolves with the breakdown.

export type QueueListener = (items: ReadonlyArray<QueueItem>) => void;

export interface FlushResult {
  allSucceeded: boolean;
  failedItems: QueueItem[];
  totalItems: number;
}

export interface SubmitQueueOptions {
  submitFn: (item: QueueItem) => Promise<void>;
  maxConcurrency: number;
  maxRetries: number;
  // Returns the delay in ms for the Nth retry (1-indexed). Returning
  // null signals "no more retries" so the queue marks the item failed.
  getRetryDelayMs: (attempt: number) => number | null;
  // Injectable for tests — production uses the global `setTimeout`.
  setTimeoutImpl?: (cb: () => void, ms: number) => unknown;
}

export interface SubmitQueue {
  enqueue: (params: { id: string; context: SubmitContext }) => void;
  flush: () => Promise<FlushResult>;
  // Flips every item currently in `failed` status back to `pending`,
  // resets its attempts counter (so the retry gets a fresh `maxRetries`
  // budget), and pumps. Returns a flush promise that resolves once
  // every item reaches terminal state again. Items already terminal
  // in `succeeded` are left untouched. Items still pending/in-flight
  // are no-ops here — they'll be reflected in the returned flush
  // result alongside the retried ones.
  //
  // Why reset attempts? Real-world failure clusters are usually
  // network-correlated — when N items fail together it's almost
  // always a connectivity blip. By the time the user taps "Retry"
  // the network is back; giving each retried item a fresh budget
  // matches the user mental model ("I'm trying again, not continuing
  // a failed attempt"). The alternative (carrying attempts forward)
  // would have a single retry immediately re-mark the item as failed
  // if it had already used its budget.
  retryFailed: () => Promise<FlushResult>;
  // Inserts pre-existing items directly into the queue with status
  // `failed`. Used to restore cross-restart persistence (Phase 2.2):
  // on app launch, the hook layer reads persisted items from
  // AsyncStorage and feeds them here so the runner picks up exactly
  // where the previous session died. Items keep their `attempts` /
  // `lastError` so the user sees realistic context ("failed after 3
  // attempts: network error") instead of fresh-looking pending rows.
  //
  // Idempotent on `id`: if the queue already holds the same id (rare
  // — the new session is mid-flight and the hydrate just landed),
  // the hydrate is a no-op for that row so we don't clobber live
  // state. Returns the number of items actually inserted so the hook
  // can surface "N answers restored" to the UI.
  hydrate: (items: ReadonlyArray<HydrateItem>) => number;
  getItems: () => ReadonlyArray<QueueItem>;
  subscribe: (listener: QueueListener) => () => void;
  // Test helper — surfaces the in-flight count for assertion. Cheap
  // to expose since the value is already tracked internally.
  inFlightCount: () => number;
}

// Subset of QueueItem we accept from the persistence layer. We omit
// `status` because every hydrated row enters as `failed` by design —
// the caller doesn't get to opt out of that, otherwise an `in-flight`
// row from before a crash could get auto-resubmitted before the user
// even knows the runner re-opened.
export interface HydrateItem {
  id: string;
  context: SubmitContext;
  attempts: number;
  lastError?: string;
}

export const createSubmitQueue = (opts: SubmitQueueOptions): SubmitQueue => {
  const items: QueueItem[] = [];
  const listeners = new Set<QueueListener>();
  let inFlight = 0;
  const flushResolvers: ((r: FlushResult) => void)[] = [];

  const scheduleTimer = opts.setTimeoutImpl ?? setTimeout;

  const notify = () => {
    if (listeners.size === 0) return;
    const snapshot = items.map(item => ({ ...item }));
    listeners.forEach(l => l(snapshot));
  };

  const setStatus = (item: QueueItem, status: QueueStatus) => {
    item.status = status;
  };

  const isTerminal = (status: QueueStatus) =>
    status === 'succeeded' || status === 'failed';

  const checkFlush = () => {
    if (flushResolvers.length === 0) return;
    const stillWorking = items.some(i => !isTerminal(i.status));
    if (stillWorking) return;
    const failedItems = items.filter(i => i.status === 'failed');
    const result: FlushResult = {
      allSucceeded: failedItems.length === 0,
      failedItems: failedItems.map(i => ({ ...i })),
      totalItems: items.length,
    };
    // Drain all pending resolvers — multiple flush() callers all get
    // the same terminal result.
    while (flushResolvers.length > 0) {
      flushResolvers.shift()?.(result);
    }
  };

  const submit = async (item: QueueItem) => {
    setStatus(item, 'in-flight');
    item.attempts += 1;
    inFlight += 1;
    notify();

    try {
      await opts.submitFn(item);
      setStatus(item, 'succeeded');
      delete item.lastError;
    } catch (err) {
      item.lastError = err instanceof Error ? err.message : String(err);
      const delayMs = opts.getRetryDelayMs(item.attempts);
      if (delayMs === null || item.attempts >= opts.maxRetries) {
        setStatus(item, 'failed');
      } else {
        // Keep the item flagged 'in-flight' for the duration of the
        // backoff window. If we flipped to 'pending' here the pump()
        // in `finally` would immediately re-pick the item and bypass
        // the backoff entirely. The scheduled timer flips status to
        // 'pending' + pumps when the wait elapses.
        scheduleTimer(() => {
          setStatus(item, 'pending');
          notify();
          pump();
        }, delayMs);
      }
    } finally {
      inFlight -= 1;
      notify();
      checkFlush();
      pump();
    }
  };

  const pump = () => {
    while (inFlight < opts.maxConcurrency) {
      const next = items.find(i => i.status === 'pending');
      if (!next) break;
      // Fire-and-forget — submit() owns its own lifecycle including
      // the recursive pump() in `finally`. The `.catch` is defensive:
      // submit() already wraps everything in try/catch so this branch
      // can't actually fire, but it satisfies the no-floating-promises
      // contract without resorting to a `void` operator.
      submit(next).catch(() => {});
    }
  };

  const enqueue: SubmitQueue['enqueue'] = ({ id, context }) => {
    const existing = items.find(i => i.id === id);
    if (existing) {
      // Idempotent replace. If the previous attempt was already
      // succeeded we still allow overwrite — the user has answered
      // again and the new answer should win on the wire. Reset attempts
      // so the retry budget is per-answer not per-question.
      existing.context = context;
      existing.status = 'pending';
      existing.attempts = 0;
      delete existing.lastError;
    } else {
      items.push({
        id,
        context,
        status: 'pending',
        attempts: 0,
      });
    }
    notify();
    pump();
  };

  const flush: SubmitQueue['flush'] = () => {
    const stillWorking = items.some(i => !isTerminal(i.status));
    if (!stillWorking) {
      const failedItems = items.filter(i => i.status === 'failed');
      return Promise.resolve({
        allSucceeded: failedItems.length === 0,
        failedItems: failedItems.map(i => ({ ...i })),
        totalItems: items.length,
      });
    }
    return new Promise<FlushResult>(resolve => {
      flushResolvers.push(resolve);
    });
  };

  const retryFailed: SubmitQueue['retryFailed'] = () => {
    // Snap the set of items we're actively retrying. Flipping in-place
    // keeps the queue order stable so the UI doesn't reshuffle rows.
    let touched = 0;
    for (const item of items) {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.attempts = 0;
        delete item.lastError;
        touched += 1;
      }
    }
    if (touched === 0) {
      // Nothing to do — return the current flush result immediately.
      // Caller still gets a meaningful breakdown (likely
      // `allSucceeded: true` since no failed items remain).
      return flush();
    }
    notify();
    pump();
    return flush();
  };

  const hydrate: SubmitQueue['hydrate'] = (toHydrate) => {
    let inserted = 0;
    for (const h of toHydrate) {
      const existing = items.find(i => i.id === h.id);
      if (existing) {
        // Don't clobber live state — the new session has already
        // started enqueueing this id (most likely the user replayed
        // the same question before hydration finished). Persisted
        // version loses to the live one.
        continue;
      }
      items.push({
        id: h.id,
        context: h.context,
        status: 'failed',
        attempts: h.attempts,
        ...(h.lastError != null ? { lastError: h.lastError } : {}),
      });
      inserted += 1;
    }
    if (inserted > 0) {
      notify();
      // Deliberately NOT calling `pump()` here. Hydrated items enter
      // as `failed` and the user must explicitly opt in via
      // `retryFailed()` (or the runner's auto-retry on banner tap).
      // Auto-pumping would flood the network the moment the app
      // reopened on a flaky connection, which is exactly the
      // scenario that caused the persistence in the first place.
    }
    return inserted;
  };

  const subscribe: SubmitQueue['subscribe'] = listener => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    enqueue,
    flush,
    retryFailed,
    hydrate,
    getItems: () => items.map(item => ({ ...item })),
    subscribe,
    inFlightCount: () => inFlight,
  };
};
