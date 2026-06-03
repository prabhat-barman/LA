import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  MockSection,
  MockTestVariant,
  QueueItem,
  SubmitContext,
} from './types';

// ── Schema ─────────────────────────────────────────────────────────
//
// Per-mock AsyncStorage adapter for the submit queue's `failed` items.
// Survives app kill / OS-eviction / crash so the user can retry the
// next time they open the runner instead of silently losing answers.
//
// Why only `failed` items? Items in `pending` / `in-flight` belong to
// an active session; if the app dies mid-flush we can't know whether
// the backend got them (`in-flight`) or not. Treating in-flight items
// as failed on the next launch lets the backend's idempotency layer
// (key: `${mockId}-${questionId}`) collapse any duplicates. Items
// already `succeeded` are pure waste to persist — they need no
// further work.
//
// Why per-mock keys? Mock A's failed items shouldn't show up on the
// runner for Mock B. We surface all-mocks recovery as a separate
// concern (`listPersistedMocks` enumerates keys for an app-level
// recovery banner — out of scope for the runner itself).
//
// Schema versioning: bumped whenever the persisted shape changes in a
// non-backwards-compatible way. On version mismatch we silently drop
// the record — the user will see the same partial-success overlay
// they would have seen mid-session, and the next flush will rebuild
// the persisted state in the new schema.

export const QUEUE_STORAGE_PREFIX = '@mock-submit-queue';
// Schema version. Bumped from 1 → 2 in Phase 2.3 to carry mock
// metadata (variant / category / title) inside the record so the
// app-level recovery banner can render meaningful row labels
// without forcing a separate API lookup keyed on bare mockId.
// V1 records are silently dropped on load — Phase 2.2 hadn't
// shipped to users yet, so there's no migration concern.
export const QUEUE_STORAGE_VERSION = 2;
// Drop persisted records older than this. Keeps stale data from
// accumulating forever in users who installed but never retry. Seven
// days is a tradeoff: long enough to survive a vacation / phone-reset
// gap, short enough to avoid replaying ancient drafts after the user
// has clearly moved on.
export const QUEUE_STORAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// What gets serialized per row. Status is intentionally omitted —
// every restored row enters the queue as `failed` (see `hydrate` on
// the scheduler). Keeping `status` out of the payload also avoids a
// migration headache if the QueueStatus enum ever changes.
export interface PersistedQueueItem {
  id: string;
  context: SubmitContext;
  attempts: number;
  lastError?: string;
}

interface PersistedQueueRecord {
  version: number;
  mockId: number | string;
  // Mock metadata — all optional so the persistence layer keeps
  // working in tests / call sites that don't have full context.
  // The recovery banner falls back to sensible defaults when any
  // of these are missing.
  variant?: MockTestVariant;
  category?: MockSection | 'Full Mock';
  title?: string;
  persistedAt: number;
  items: PersistedQueueItem[];
}

export interface PersistedMockSummary {
  mockId: number | string;
  itemCount: number;
  persistedAt: number;
  // Same fields as the record — passed through so the recovery
  // banner / future MockTestRunner deep-link can navigate properly
  // without re-loading the underlying record.
  variant?: MockTestVariant;
  category?: MockSection | 'Full Mock';
  title?: string;
}

// Optional metadata passed to `persistFailedQueueItems`. Pulled out
// into its own arg-bag (rather than expanded into positional params)
// so future fields don't break every call site.
export interface PersistMockMeta {
  variant?: MockTestVariant;
  category?: MockSection | 'Full Mock';
  title?: string;
}

// ── Key helpers ────────────────────────────────────────────────────

export const buildPersistKey = (mockId: number | string): string =>
  `${QUEUE_STORAGE_PREFIX}/${mockId}`;

// Parses a key string back into a `mockId`. Returns null if the key
// doesn't match our prefix — defensive against AsyncStorage holding
// keys from other parts of the app when we enumerate via getAllKeys.
export const parsePersistKey = (key: string): string | null => {
  const prefix = `${QUEUE_STORAGE_PREFIX}/`;
  if (!key.startsWith(prefix)) return null;
  return key.slice(prefix.length) || null;
};

// ── Read / write / clear ───────────────────────────────────────────

// Persists ONLY items in `failed` status. Called on every queue state
// change from the hook layer — debouncing is the caller's job
// (writes are cheap enough that 1-per-state-change is fine in
// practice, but a heavy retry loop could thrash AsyncStorage).
//
// When there are no failed items, the key is removed entirely so a
// recovered session doesn't have to filter "0 items" records on
// hydrate. This keeps `listPersistedMocks` honest — every key it
// returns has at least one item to retry.
export const persistFailedQueueItems = async (
  mockId: number | string,
  items: ReadonlyArray<QueueItem>,
  meta?: PersistMockMeta,
): Promise<void> => {
  const failed = items.filter(i => i.status === 'failed');
  const key = buildPersistKey(mockId);
  if (failed.length === 0) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Swallow — clearing storage that doesn't exist is benign.
      // We don't surface storage errors at all; the queue still
      // works correctly in-memory, persistence is best-effort.
    }
    return;
  }
  const record: PersistedQueueRecord = {
    version: QUEUE_STORAGE_VERSION,
    mockId,
    persistedAt: Date.now(),
    // Embed metadata so the app-level recovery banner can render
    // friendly labels without round-tripping a separate API call
    // for each persisted mockId. Each is omitted when missing so
    // the on-disk payload stays compact.
    ...(meta?.variant != null ? { variant: meta.variant } : {}),
    ...(meta?.category != null ? { category: meta.category } : {}),
    ...(meta?.title != null ? { title: meta.title } : {}),
    items: failed.map(i => ({
      id: i.id,
      context: i.context,
      attempts: i.attempts,
      ...(i.lastError != null ? { lastError: i.lastError } : {}),
    })),
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Storage failures shouldn't break the runtime queue. The user
    // would still see failed items via the in-session retry overlay
    // — they'd just be lost if the app dies. That's the same
    // behaviour as before Phase 2.2 so we're no worse off.
  }
};

// Reads back persisted items for the given mock. Returns an empty
// array for: missing key, JSON parse errors, schema version mismatch,
// expired records. Never throws — the runner treats this as a "is
// there anything to retry?" probe and an empty result means "no".
//
// As a side-effect, expired / corrupt records are cleared from
// storage so they don't keep being read and re-skipped on every
// runner mount. Self-healing storage.
export const loadPersistedQueueItems = async (
  mockId: number | string,
): Promise<PersistedQueueItem[]> => {
  const key = buildPersistKey(mockId);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return [];
  }
  if (raw == null) return [];

  let parsed: PersistedQueueRecord;
  try {
    parsed = JSON.parse(raw) as PersistedQueueRecord;
  } catch {
    // Corrupt JSON — purge.
    AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }

  if (parsed.version !== QUEUE_STORAGE_VERSION) {
    // Old schema — purge.
    AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }

  if (
    typeof parsed.persistedAt !== 'number' ||
    Date.now() - parsed.persistedAt > QUEUE_STORAGE_MAX_AGE_MS
  ) {
    AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }

  return Array.isArray(parsed.items) ? parsed.items : [];
};

export const clearPersistedQueueItems = async (
  mockId: number | string,
): Promise<void> => {
  try {
    await AsyncStorage.removeItem(buildPersistKey(mockId));
  } catch {
    // Best-effort.
  }
};

// Wipes every persisted unsent-answer record across all mocks.
// Called on `MockTestScreen` mount so users don't see the legacy
// "unsent answers from previous session" banner — once they land
// on the mock list the slate is considered clean. Best-effort: any
// AsyncStorage failure is swallowed since the recovery UI already
// handles an empty list as the steady state.
export const clearAllPersistedMocks = async (): Promise<void> => {
  let keys: readonly string[];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return;
  }
  const queueKeys = keys.filter(k =>
    k.startsWith(`${QUEUE_STORAGE_PREFIX}/`),
  );
  if (queueKeys.length === 0) return;
  try {
    await AsyncStorage.removeMany(queueKeys as string[]);
  } catch {
    // Best-effort — the next mount will try again anyway.
  }
};

// Enumerates every mock with persisted failed items. Used by the
// (future) app-level recovery banner to surface "you have N unsent
// answers from previous mocks" without forcing the user to re-open
// each one. Skips expired / corrupt records and self-heals along the
// way.
export const listPersistedMocks = async (): Promise<PersistedMockSummary[]> => {
  let keys: readonly string[];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return [];
  }
  const queueKeys = keys.filter(k => k.startsWith(`${QUEUE_STORAGE_PREFIX}/`));
  if (queueKeys.length === 0) return [];

  // v3 of async-storage replaced the v2 tuple-returning `multiGet`
  // with `getMany` returning a `Record<key, value | null>`. Iterating
  // via `Object.entries` keeps the call-site shape the same.
  let entries: Record<string, string | null>;
  try {
    entries = await AsyncStorage.getMany(queueKeys as string[]);
  } catch {
    return [];
  }

  const summaries: PersistedMockSummary[] = [];
  const toClear: string[] = [];
  for (const [key, value] of Object.entries(entries)) {
    if (value == null) continue;
    try {
      const parsed = JSON.parse(value) as PersistedQueueRecord;
      if (parsed.version !== QUEUE_STORAGE_VERSION) {
        toClear.push(key);
        continue;
      }
      if (
        typeof parsed.persistedAt !== 'number' ||
        Date.now() - parsed.persistedAt > QUEUE_STORAGE_MAX_AGE_MS
      ) {
        toClear.push(key);
        continue;
      }
      const itemCount = Array.isArray(parsed.items) ? parsed.items.length : 0;
      if (itemCount === 0) {
        toClear.push(key);
        continue;
      }
      summaries.push({
        mockId: parsed.mockId,
        itemCount,
        persistedAt: parsed.persistedAt,
        // Pass-through optionals — explicitly omit when missing so
        // downstream UI can `??` with fallbacks cleanly.
        ...(parsed.variant != null ? { variant: parsed.variant } : {}),
        ...(parsed.category != null ? { category: parsed.category } : {}),
        ...(parsed.title != null ? { title: parsed.title } : {}),
      });
    } catch {
      toClear.push(key);
    }
  }
  if (toClear.length > 0) {
    AsyncStorage.removeMany(toClear).catch(() => {});
  }
  // Newest first so the recovery UI surfaces the user's most recent
  // session at the top.
  summaries.sort((a, b) => b.persistedAt - a.persistedAt);
  return summaries;
};
