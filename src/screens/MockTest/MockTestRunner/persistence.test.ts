import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPersistKey,
  clearPersistedQueueItems,
  listPersistedMocks,
  loadPersistedQueueItems,
  parsePersistKey,
  persistFailedQueueItems,
  QUEUE_STORAGE_MAX_AGE_MS,
  QUEUE_STORAGE_PREFIX,
  QUEUE_STORAGE_VERSION,
} from './persistence';
import type { QueueItem, SubmitContext } from './types';

// Minimal SubmitContext factory — only fields the persistence layer
// reads are real; everything else is a stub since we round-trip it
// opaquely through JSON.
const makeCtx = (questionId: number | string): SubmitContext => ({
  answer: {
    mockId: 'mock-1',
    questionId,
    subcategoryId: 1,
    draft: { kind: 'speaking', audioFilePath: '/tmp/a.m4a', durationSec: 10 },
    submittedAt: 1700000000000,
  },
  questionNumber: 1,
  totalQuestions: 10,
  secondsSpentOnQuestion: 30,
  remainingTotalSeconds: 1500,
  audioScript: null,
  questionText: null,
  correctAnswer: null,
  htmlAnswer: null,
  isPending: false,
  isComplete: false,
  platform: 'ios',
});

const makeItem = (overrides: Partial<QueueItem>): QueueItem => ({
  id: overrides.id ?? 'item-1',
  context: overrides.context ?? makeCtx(1),
  status: overrides.status ?? 'failed',
  attempts: overrides.attempts ?? 1,
  ...(overrides.lastError != null ? { lastError: overrides.lastError } : {}),
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('persistence key helpers', () => {
  it('buildPersistKey embeds the mockId after the prefix', () => {
    expect(buildPersistKey(42)).toBe(`${QUEUE_STORAGE_PREFIX}/42`);
    expect(buildPersistKey('abc-123')).toBe(`${QUEUE_STORAGE_PREFIX}/abc-123`);
  });

  it('parsePersistKey round-trips a built key back to the mockId', () => {
    expect(parsePersistKey(buildPersistKey('xyz'))).toBe('xyz');
  });

  it('parsePersistKey returns null for unrelated keys', () => {
    expect(parsePersistKey('some/other/key')).toBeNull();
    expect(parsePersistKey(`${QUEUE_STORAGE_PREFIX}/`)).toBeNull();
  });
});

describe('persistFailedQueueItems', () => {
  it('writes only failed items, stripping the status field', async () => {
    await persistFailedQueueItems('mock-1', [
      makeItem({ id: 'a', status: 'failed' }),
      makeItem({ id: 'b', status: 'succeeded' }),
      makeItem({ id: 'c', status: 'pending' }),
      makeItem({ id: 'd', status: 'in-flight' }),
    ]);
    const raw = await AsyncStorage.getItem(buildPersistKey('mock-1'));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.version).toBe(QUEUE_STORAGE_VERSION);
    expect(parsed.mockId).toBe('mock-1');
    expect(parsed.items.map((i: { id: string }) => i.id)).toEqual(['a']);
    expect(parsed.items[0]).not.toHaveProperty('status');
  });

  it('removes the storage key when no items are in failed status', async () => {
    // Prime with something first so we can assert deletion.
    await AsyncStorage.setItem(buildPersistKey('mock-1'), 'stale');
    await persistFailedQueueItems('mock-1', [
      makeItem({ id: 'a', status: 'succeeded' }),
    ]);
    expect(await AsyncStorage.getItem(buildPersistKey('mock-1'))).toBeNull();
  });

  it('preserves lastError when present and omits it when absent', async () => {
    await persistFailedQueueItems('mock-1', [
      makeItem({ id: 'a', status: 'failed', lastError: 'network 500' }),
      makeItem({ id: 'b', status: 'failed' /* no lastError */ }),
    ]);
    const raw = (await AsyncStorage.getItem(buildPersistKey('mock-1'))) as string;
    const parsed = JSON.parse(raw);
    const a = parsed.items.find((i: { id: string }) => i.id === 'a');
    const b = parsed.items.find((i: { id: string }) => i.id === 'b');
    expect(a.lastError).toBe('network 500');
    expect(b).not.toHaveProperty('lastError');
  });

  it('survives AsyncStorage failures without throwing', async () => {
    // `mockRejectedValueOnce` is one-shot — the default in-memory
    // implementation from jest.setup.js takes over for subsequent
    // calls in this and later tests, so no manual restore is needed.
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );
    await expect(
      persistFailedQueueItems('mock-1', [makeItem({ id: 'a', status: 'failed' })]),
    ).resolves.toBeUndefined();
  });

  it('partitions per mockId so different mocks do not collide', async () => {
    await persistFailedQueueItems('mock-1', [
      makeItem({ id: 'a', status: 'failed' }),
    ]);
    await persistFailedQueueItems('mock-2', [
      makeItem({ id: 'b', status: 'failed' }),
    ]);
    const raw1 = (await AsyncStorage.getItem(buildPersistKey('mock-1'))) as string;
    const raw2 = (await AsyncStorage.getItem(buildPersistKey('mock-2'))) as string;
    expect(JSON.parse(raw1).items.map((i: { id: string }) => i.id)).toEqual(['a']);
    expect(JSON.parse(raw2).items.map((i: { id: string }) => i.id)).toEqual(['b']);
  });

  it('embeds mock metadata (variant/category/title) in the persisted record', async () => {
    await persistFailedQueueItems(
      'mock-1',
      [makeItem({ id: 'a', status: 'failed' })],
      { variant: 'full', category: 'Full Mock', title: 'Practice Test #5' },
    );
    const raw = (await AsyncStorage.getItem(buildPersistKey('mock-1'))) as string;
    const parsed = JSON.parse(raw);
    expect(parsed.variant).toBe('full');
    expect(parsed.category).toBe('Full Mock');
    expect(parsed.title).toBe('Practice Test #5');
  });

  it('omits metadata fields that the caller did not provide', async () => {
    await persistFailedQueueItems(
      'mock-1',
      [makeItem({ id: 'a', status: 'failed' })],
      { variant: 'extensive' /* no category / title */ },
    );
    const raw = (await AsyncStorage.getItem(buildPersistKey('mock-1'))) as string;
    const parsed = JSON.parse(raw);
    expect(parsed.variant).toBe('extensive');
    expect(parsed).not.toHaveProperty('category');
    expect(parsed).not.toHaveProperty('title');
  });

  it('treats missing meta arg as fully-anonymous (back-compat)', async () => {
    // Phase 2.2 callers passed no meta — make sure the v2 schema
    // still produces a valid record in that case.
    await persistFailedQueueItems('mock-1', [
      makeItem({ id: 'a', status: 'failed' }),
    ]);
    const raw = (await AsyncStorage.getItem(buildPersistKey('mock-1'))) as string;
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(QUEUE_STORAGE_VERSION);
    expect(parsed).not.toHaveProperty('variant');
    expect(parsed).not.toHaveProperty('category');
    expect(parsed).not.toHaveProperty('title');
  });
});

describe('loadPersistedQueueItems', () => {
  it('returns an empty array when nothing is stored', async () => {
    expect(await loadPersistedQueueItems('mock-1')).toEqual([]);
  });

  it('round-trips items written by persistFailedQueueItems', async () => {
    const written = [
      makeItem({ id: 'a', status: 'failed', attempts: 2, lastError: 'err' }),
    ];
    await persistFailedQueueItems('mock-1', written);
    const loaded = await loadPersistedQueueItems('mock-1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('a');
    expect(loaded[0].attempts).toBe(2);
    expect(loaded[0].lastError).toBe('err');
    // Persisted items deliberately do NOT carry status — the scheduler
    // restores them as `failed` on hydrate.
    expect(loaded[0]).not.toHaveProperty('status');
  });

  it('drops and purges records older than the max-age window', async () => {
    const expiredRecord = {
      version: QUEUE_STORAGE_VERSION,
      mockId: 'mock-1',
      persistedAt: Date.now() - QUEUE_STORAGE_MAX_AGE_MS - 60_000,
      items: [{ id: 'a', context: makeCtx(1), attempts: 1 }],
    };
    await AsyncStorage.setItem(
      buildPersistKey('mock-1'),
      JSON.stringify(expiredRecord),
    );
    expect(await loadPersistedQueueItems('mock-1')).toEqual([]);
    // Self-heal — the expired record should be cleared so we don't
    // re-skip it every mount. The cleanup is fire-and-forget inside
    // the loader so we drain a microtask before asserting.
    await new Promise<void>(resolve => setImmediate(() => resolve()));
    expect(await AsyncStorage.getItem(buildPersistKey('mock-1'))).toBeNull();
  });

  it('drops records whose schema version does not match', async () => {
    await AsyncStorage.setItem(
      buildPersistKey('mock-1'),
      JSON.stringify({
        version: QUEUE_STORAGE_VERSION + 999,
        mockId: 'mock-1',
        persistedAt: Date.now(),
        items: [{ id: 'a', context: makeCtx(1), attempts: 1 }],
      }),
    );
    expect(await loadPersistedQueueItems('mock-1')).toEqual([]);
  });

  it('drops records with corrupt JSON', async () => {
    await AsyncStorage.setItem(buildPersistKey('mock-1'), '{not valid json');
    expect(await loadPersistedQueueItems('mock-1')).toEqual([]);
    await new Promise<void>(resolve => setImmediate(() => resolve()));
    expect(await AsyncStorage.getItem(buildPersistKey('mock-1'))).toBeNull();
  });

  it('returns an empty array when AsyncStorage.getItem rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    expect(await loadPersistedQueueItems('mock-1')).toEqual([]);
  });
});

describe('clearPersistedQueueItems', () => {
  it('removes the persisted record for the given mockId', async () => {
    await persistFailedQueueItems('mock-1', [makeItem({ status: 'failed' })]);
    await clearPersistedQueueItems('mock-1');
    expect(await AsyncStorage.getItem(buildPersistKey('mock-1'))).toBeNull();
  });

  it('is a no-op when no record exists', async () => {
    await expect(clearPersistedQueueItems('never-stored')).resolves.toBeUndefined();
  });
});

describe('listPersistedMocks', () => {
  it('returns an empty array when no queue records exist', async () => {
    // Even with unrelated keys in storage, the listing should ignore them.
    await AsyncStorage.setItem('@some-other-app-key', 'unrelated');
    expect(await listPersistedMocks()).toEqual([]);
  });

  it('summarises every valid persisted mock, newest-first', async () => {
    // Timestamps must fall inside the max-age window or the loader
    // (correctly) filters them out — base them on `Date.now()` rather
    // than hardcoded constants that drift relative to the test run.
    const now = Date.now();
    await AsyncStorage.setItem(
      buildPersistKey('mock-old'),
      JSON.stringify({
        version: QUEUE_STORAGE_VERSION,
        mockId: 'mock-old',
        persistedAt: now - 60_000,
        items: [{ id: 'a', context: makeCtx(1), attempts: 1 }],
      }),
    );
    await AsyncStorage.setItem(
      buildPersistKey('mock-new'),
      JSON.stringify({
        version: QUEUE_STORAGE_VERSION,
        mockId: 'mock-new',
        persistedAt: now - 1_000,
        items: [
          { id: 'a', context: makeCtx(1), attempts: 1 },
          { id: 'b', context: makeCtx(2), attempts: 2 },
        ],
      }),
    );
    const summaries = await listPersistedMocks();
    expect(summaries.map(s => s.mockId)).toEqual(['mock-new', 'mock-old']);
    expect(summaries.find(s => s.mockId === 'mock-new')?.itemCount).toBe(2);
    expect(summaries.find(s => s.mockId === 'mock-old')?.itemCount).toBe(1);
  });

  it('ignores keys outside the queue prefix', async () => {
    await AsyncStorage.setItem('@completely-different/key', 'x');
    await persistFailedQueueItems('mock-1', [makeItem({ status: 'failed' })]);
    const summaries = await listPersistedMocks();
    expect(summaries.map(s => s.mockId)).toEqual(['mock-1']);
  });

  it('purges expired records along the way', async () => {
    await AsyncStorage.setItem(
      buildPersistKey('mock-expired'),
      JSON.stringify({
        version: QUEUE_STORAGE_VERSION,
        mockId: 'mock-expired',
        persistedAt: Date.now() - QUEUE_STORAGE_MAX_AGE_MS - 60_000,
        items: [{ id: 'a', context: makeCtx(1), attempts: 1 }],
      }),
    );
    await persistFailedQueueItems('mock-fresh', [makeItem({ status: 'failed' })]);
    const summaries = await listPersistedMocks();
    expect(summaries.map(s => s.mockId)).toEqual(['mock-fresh']);
    await new Promise<void>(resolve => setImmediate(() => resolve()));
    expect(
      await AsyncStorage.getItem(buildPersistKey('mock-expired')),
    ).toBeNull();
  });

  it('skips records with zero items even if the key still exists', async () => {
    // Manually-crafted edge case — persistFailedQueueItems already
    // removes empty records, but a half-written legacy record could
    // theoretically slip through.
    await AsyncStorage.setItem(
      buildPersistKey('mock-empty'),
      JSON.stringify({
        version: QUEUE_STORAGE_VERSION,
        mockId: 'mock-empty',
        persistedAt: Date.now(),
        items: [],
      }),
    );
    expect(await listPersistedMocks()).toEqual([]);
  });

  it('surfaces embedded mock metadata when present', async () => {
    await persistFailedQueueItems(
      'mock-1',
      [makeItem({ status: 'failed' })],
      { variant: 'full', category: 'Full Mock', title: 'Marathon Test' },
    );
    const summaries = await listPersistedMocks();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].variant).toBe('full');
    expect(summaries[0].category).toBe('Full Mock');
    expect(summaries[0].title).toBe('Marathon Test');
    expect(summaries[0].itemCount).toBe(1);
  });

  it('omits metadata fields from the summary when not present in storage', async () => {
    await persistFailedQueueItems('mock-1', [makeItem({ status: 'failed' })]);
    const summaries = await listPersistedMocks();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).not.toHaveProperty('variant');
    expect(summaries[0]).not.toHaveProperty('category');
    expect(summaries[0]).not.toHaveProperty('title');
  });
});
