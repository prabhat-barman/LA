import { createSubmitQueue } from './scheduler';
import type { SubmitContext } from './types';

// Minimal SubmitContext factory — scheduler only treats this as opaque
// payload, so we can hand it a stub without exercising buildSubmitPayload.
const makeContext = (questionId: string | number): SubmitContext => ({
  answer: {
    mockId: 'mock-1',
    questionId,
    subcategoryId: 1,
    draft: { kind: 'empty' },
    submittedAt: Date.now(),
  },
  questionNumber: 1,
  totalQuestions: 1,
  secondsSpentOnQuestion: 10,
  remainingTotalSeconds: 1000,
  audioScript: null,
  questionText: null,
  correctAnswer: null,
  rawAnswer: null,
  htmlAnswer: null,
  isPending: false,
  isComplete: false,
  platform: 'android',
  variant: 'full',
  category: 'Speaking',
  currentSectionIndex: 0,
});

// Tiny "controlled deferred" helper for asserting concurrency and ordering.
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Mock setTimeout that captures pending callbacks so the test can
// advance "time" deterministically — real setTimeout in jest's fake
// timers would also work, but a hand-rolled stub keeps each test's
// schedule fully introspectable.
const makeTimerStub = () => {
  const queue: { cb: () => void; ms: number }[] = [];
  const setTimeoutImpl = (cb: () => void, ms: number) => {
    queue.push({ cb, ms });
    return 0;
  };
  const flushAll = () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      entry?.cb();
    }
  };
  return { setTimeoutImpl, flushAll, pending: () => queue.length };
};

const noBackoff = () => 0;

describe('createSubmitQueue', () => {
  it('runs a single submission to success', async () => {
    const submitFn = jest.fn().mockResolvedValue(undefined);
    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 2,
      maxRetries: 3,
      getRetryDelayMs: noBackoff,
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });
    const result = await queue.flush();

    expect(submitFn).toHaveBeenCalledTimes(1);
    expect(result.allSucceeded).toBe(true);
    expect(result.failedItems).toEqual([]);
    expect(result.totalItems).toBe(1);
    expect(queue.getItems()[0].status).toBe('succeeded');
  });

  it('honours maxConcurrency — never more than N in flight at once', async () => {
    const slots: ReturnType<typeof deferred<void>>[] = [];
    const submitFn = jest.fn(() => {
      const d = deferred<void>();
      slots.push(d);
      return d.promise;
    });

    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 2,
      maxRetries: 3,
      getRetryDelayMs: noBackoff,
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });
    queue.enqueue({ id: 'q2', context: makeContext('q2') });
    queue.enqueue({ id: 'q3', context: makeContext('q3') });
    queue.enqueue({ id: 'q4', context: makeContext('q4') });

    // Yield so the queue can dispatch up to concurrency.
    await Promise.resolve();
    expect(submitFn).toHaveBeenCalledTimes(2);
    expect(queue.inFlightCount()).toBe(2);

    // Resolve the first slot — should immediately start q3.
    slots[0].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(submitFn).toHaveBeenCalledTimes(3);

    // Resolve remaining and let the queue drain.
    slots[1].resolve();
    await Promise.resolve();
    await Promise.resolve();
    slots[2].resolve();
    slots[3].resolve();

    const result = await queue.flush();
    expect(result.allSucceeded).toBe(true);
    expect(submitFn).toHaveBeenCalledTimes(4);
  });

  it('retries failed submissions with backoff and eventually succeeds', async () => {
    const timer = makeTimerStub();
    let attempts = 0;
    const submitFn = jest.fn(() => {
      attempts += 1;
      // Fail twice, succeed on third attempt.
      return attempts < 3
        ? Promise.reject(new Error(`attempt ${attempts} failed`))
        : Promise.resolve();
    });

    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 1,
      maxRetries: 3,
      getRetryDelayMs: attempt => attempt * 10,
      setTimeoutImpl: timer.setTimeoutImpl,
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });

    // Let attempt 1 complete (rejects) → schedules retry.
    await Promise.resolve();
    await Promise.resolve();
    expect(timer.pending()).toBe(1);

    // Fire the retry timer → triggers attempt 2 → also rejects.
    timer.flushAll();
    await Promise.resolve();
    await Promise.resolve();
    expect(timer.pending()).toBe(1);

    // Final retry → succeeds.
    timer.flushAll();
    const result = await queue.flush();

    expect(submitFn).toHaveBeenCalledTimes(3);
    expect(result.allSucceeded).toBe(true);
    expect(queue.getItems()[0].attempts).toBe(3);
  });

  it('marks an item failed after exhausting maxRetries', async () => {
    const timer = makeTimerStub();
    const submitFn = jest.fn().mockRejectedValue(new Error('permanent'));

    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 1,
      maxRetries: 3,
      getRetryDelayMs: () => 10,
      setTimeoutImpl: timer.setTimeoutImpl,
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });

    // Drain initial attempt + 2 retries (3 attempts total = maxRetries).
    await Promise.resolve();
    await Promise.resolve();
    timer.flushAll();
    await Promise.resolve();
    await Promise.resolve();
    timer.flushAll();
    await Promise.resolve();
    await Promise.resolve();

    const result = await queue.flush();
    expect(submitFn).toHaveBeenCalledTimes(3);
    expect(result.allSucceeded).toBe(false);
    expect(result.failedItems).toHaveLength(1);
    expect(result.failedItems[0].lastError).toBe('permanent');
    expect(queue.getItems()[0].status).toBe('failed');
  });

  it('dedupes re-enqueued ids and resets the retry budget', async () => {
    const submitFn = jest.fn().mockResolvedValue(undefined);
    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 1,
      maxRetries: 3,
      getRetryDelayMs: noBackoff,
    });

    const first = makeContext('q1');
    queue.enqueue({ id: 'q1', context: first });
    await queue.flush();
    expect(queue.getItems()).toHaveLength(1);
    expect(queue.getItems()[0].status).toBe('succeeded');

    // User re-answered the same Q → replace, re-run.
    const second = {
      ...makeContext('q1'),
      remainingTotalSeconds: 500,
    };
    queue.enqueue({ id: 'q1', context: second });
    await queue.flush();

    expect(queue.getItems()).toHaveLength(1);
    expect(queue.getItems()[0].context.remainingTotalSeconds).toBe(500);
    expect(submitFn).toHaveBeenCalledTimes(2);
  });

  it('mixed success/failure reports both in the flush result', async () => {
    const submitFn = jest.fn(item =>
      item.id === 'q2' ? Promise.reject(new Error('boom')) : Promise.resolve(),
    );

    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 2,
      maxRetries: 1,
      getRetryDelayMs: () => null, // no retries — fail immediately
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });
    queue.enqueue({ id: 'q2', context: makeContext('q2') });
    queue.enqueue({ id: 'q3', context: makeContext('q3') });

    const result = await queue.flush();
    expect(result.allSucceeded).toBe(false);
    expect(result.failedItems).toHaveLength(1);
    expect(result.failedItems[0].id).toBe('q2');
    expect(result.totalItems).toBe(3);
  });

  it('subscribers receive snapshots on every state change', async () => {
    const submitFn = jest.fn().mockResolvedValue(undefined);
    const queue = createSubmitQueue({
      submitFn,
      maxConcurrency: 1,
      maxRetries: 1,
      getRetryDelayMs: noBackoff,
    });

    const seenStatuses: string[][] = [];
    const unsub = queue.subscribe(items => {
      seenStatuses.push(items.map(i => i.status));
    });

    queue.enqueue({ id: 'q1', context: makeContext('q1') });
    await queue.flush();
    unsub();

    // Should have seen: [pending], [in-flight], [succeeded].
    expect(seenStatuses[0]).toEqual(['pending']);
    expect(seenStatuses).toEqual(
      expect.arrayContaining([
        ['pending'],
        ['in-flight'],
        ['succeeded'],
      ]),
    );
  });

  it('flush() resolves immediately when the queue is empty', async () => {
    const queue = createSubmitQueue({
      submitFn: jest.fn(),
      maxConcurrency: 1,
      maxRetries: 1,
      getRetryDelayMs: noBackoff,
    });
    const result = await queue.flush();
    expect(result).toEqual({
      allSucceeded: true,
      failedItems: [],
      totalItems: 0,
    });
  });

  describe('retryFailed', () => {
    it('flips failed items back to pending, resets attempts, and runs them again', async () => {
      // First call fails, second call (the retry) succeeds. This mirrors
      // the real-world failure mode the retry CTA exists for: a transient
      // network blip clears between the user's two attempts.
      let callCount = 0;
      const submitFn = jest.fn(() => {
        callCount += 1;
        return callCount === 1
          ? Promise.reject(new Error('transient'))
          : Promise.resolve();
      });

      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 1,
        maxRetries: 1, // no auto-retry; first failure is terminal
        getRetryDelayMs: () => null,
      });

      queue.enqueue({ id: 'q1', context: makeContext('q1') });
      const firstResult = await queue.flush();
      expect(firstResult.allSucceeded).toBe(false);
      expect(firstResult.failedItems).toHaveLength(1);
      expect(queue.getItems()[0].attempts).toBe(1);
      expect(queue.getItems()[0].lastError).toBe('transient');

      // Now retry — the item should go pending → in-flight → succeeded,
      // and attempts should be reset to a clean 1 (one fresh attempt
      // post-retry, not 2 carrying over).
      const retryResult = await queue.retryFailed();
      expect(retryResult.allSucceeded).toBe(true);
      expect(retryResult.failedItems).toEqual([]);
      expect(submitFn).toHaveBeenCalledTimes(2);
      expect(queue.getItems()[0].status).toBe('succeeded');
      expect(queue.getItems()[0].attempts).toBe(1);
      expect(queue.getItems()[0].lastError).toBeUndefined();
    });

    it('retries every failed item independently — partial success is reported', async () => {
      // q1 was failing forever, q2 was failing forever. After retry,
      // q1 starts succeeding but q2 still fails. The flush result
      // should show q2 (and only q2) as failed.
      const succeeding = new Set<string>();
      const submitFn = jest.fn(item =>
        succeeding.has(String(item.id))
          ? Promise.resolve()
          : Promise.reject(new Error('still-broken')),
      );

      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 2,
        maxRetries: 1,
        getRetryDelayMs: () => null,
      });

      queue.enqueue({ id: 'q1', context: makeContext('q1') });
      queue.enqueue({ id: 'q2', context: makeContext('q2') });
      const first = await queue.flush();
      expect(first.failedItems.map(i => i.id).sort()).toEqual(['q1', 'q2']);

      // Backend "heals" for q1 only.
      succeeding.add('q1');
      const second = await queue.retryFailed();
      expect(second.allSucceeded).toBe(false);
      expect(second.failedItems.map(i => i.id)).toEqual(['q2']);
      expect(queue.getItems().find(i => i.id === 'q1')?.status).toBe(
        'succeeded',
      );
      expect(queue.getItems().find(i => i.id === 'q2')?.status).toBe('failed');
    });

    it('is a no-op (returns the existing flush result) when no items are in failed status', async () => {
      const submitFn = jest.fn().mockResolvedValue(undefined);
      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 1,
        maxRetries: 1,
        getRetryDelayMs: noBackoff,
      });

      queue.enqueue({ id: 'q1', context: makeContext('q1') });
      await queue.flush();
      expect(queue.getItems()[0].status).toBe('succeeded');

      // No failed items → retryFailed shouldn't touch the succeeded
      // item or call submitFn again.
      const result = await queue.retryFailed();
      expect(result.allSucceeded).toBe(true);
      expect(result.totalItems).toBe(1);
      expect(submitFn).toHaveBeenCalledTimes(1);
      expect(queue.getItems()[0].status).toBe('succeeded');
    });

    it('leaves already-succeeded items alone when retrying alongside failed items', async () => {
      const submitFn = jest.fn(item =>
        item.id === 'q2' ? Promise.reject(new Error('boom')) : Promise.resolve(),
      );
      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 2,
        maxRetries: 1,
        getRetryDelayMs: () => null,
      });

      queue.enqueue({ id: 'q1', context: makeContext('q1') });
      queue.enqueue({ id: 'q2', context: makeContext('q2') });
      await queue.flush();
      const succeededAttempts = queue.getItems().find(i => i.id === 'q1')!.attempts;

      await queue.retryFailed();

      // q1's attempts counter should NOT have been reset — retry only
      // touches failed items.
      expect(queue.getItems().find(i => i.id === 'q1')?.attempts).toBe(
        succeededAttempts,
      );
      // q2 should have been retried (one fresh attempt after reset).
      expect(queue.getItems().find(i => i.id === 'q2')?.attempts).toBe(1);
    });
  });

  describe('hydrate', () => {
    it('inserts pre-existing items in failed status without auto-pumping', async () => {
      // Network must NOT be hit on hydrate — the whole point is that
      // we restore failed state and wait for explicit user retry.
      const submitFn = jest.fn().mockResolvedValue(undefined);
      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 2,
        maxRetries: 3,
        getRetryDelayMs: noBackoff,
      });

      const inserted = queue.hydrate([
        {
          id: 'q-restored',
          context: makeContext('q-restored'),
          attempts: 2,
          lastError: 'network 500',
        },
      ]);

      expect(inserted).toBe(1);
      // No submission attempts triggered.
      expect(submitFn).not.toHaveBeenCalled();
      const item = queue.getItems()[0];
      expect(item.id).toBe('q-restored');
      expect(item.status).toBe('failed');
      expect(item.attempts).toBe(2);
      expect(item.lastError).toBe('network 500');
    });

    it('flips back to succeeded when retryFailed lands on a hydrated row', async () => {
      const submitFn = jest.fn().mockResolvedValue(undefined);
      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 1,
        maxRetries: 3,
        getRetryDelayMs: noBackoff,
      });

      queue.hydrate([
        { id: 'q1', context: makeContext('q1'), attempts: 1 },
      ]);

      const result = await queue.retryFailed();
      expect(result.allSucceeded).toBe(true);
      expect(submitFn).toHaveBeenCalledTimes(1);
      expect(queue.getItems()[0].status).toBe('succeeded');
    });

    it('is a no-op for ids that already exist in the queue', async () => {
      // Edge case: the user resumed mid-flight (live enqueue) and a
      // late-arriving hydrate tries to add the same id. The live row
      // must win — otherwise we could clobber an in-flight retry with
      // a stale persisted snapshot.
      const submitFn = jest.fn(() => Promise.reject(new Error('still failing')));
      const queue = createSubmitQueue({
        submitFn,
        maxConcurrency: 1,
        maxRetries: 1,
        getRetryDelayMs: () => null,
      });

      queue.enqueue({ id: 'q1', context: makeContext('q1') });
      await queue.flush(); // q1 now in failed, attempts=1

      const inserted = queue.hydrate([
        {
          id: 'q1',
          context: makeContext('q1'),
          attempts: 99,
          lastError: 'stale',
        },
      ]);

      expect(inserted).toBe(0);
      // Live row preserved — attempts is the real 1, not the stale 99.
      expect(queue.getItems()[0].attempts).toBe(1);
    });

    it('notifies subscribers exactly once even when multiple items hydrate', () => {
      const queue = createSubmitQueue({
        submitFn: jest.fn().mockResolvedValue(undefined),
        maxConcurrency: 1,
        maxRetries: 1,
        getRetryDelayMs: noBackoff,
      });

      const listener = jest.fn();
      queue.subscribe(listener);

      queue.hydrate([
        { id: 'q1', context: makeContext('q1'), attempts: 1 },
        { id: 'q2', context: makeContext('q2'), attempts: 2 },
        { id: 'q3', context: makeContext('q3'), attempts: 1 },
      ]);

      // One batched notify — listeners shouldn't be hammered with a
      // separate event per item, which would cause unnecessary
      // re-renders on the UI side.
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toHaveLength(3);
    });

    it('returns 0 and does not notify when given an empty array', () => {
      const queue = createSubmitQueue({
        submitFn: jest.fn().mockResolvedValue(undefined),
        maxConcurrency: 1,
        maxRetries: 1,
        getRetryDelayMs: noBackoff,
      });
      const listener = jest.fn();
      queue.subscribe(listener);
      expect(queue.hydrate([])).toBe(0);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
