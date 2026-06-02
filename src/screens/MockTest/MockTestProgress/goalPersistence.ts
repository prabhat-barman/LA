// Goal-tracking persistence (Phase 6.2).
//
// One key, one record. We deliberately don't keep goal history in
// v1 — replacing a goal overwrites the old one. If a future phase
// wants "you set & hit 3 goals this year" we'll either bump the
// schema to a goals[] array OR archive replaced goals to a separate
// `:archived:v1` key. Today's call: keep it dead simple.
//
// Versioning + schema-tagging is the same pattern used by
// `MockTestRunner/persistence.ts` so any future migration is a
// localized change, not a hunt across the codebase.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MockTestGoal } from './types';

export const GOAL_STORAGE_KEY = '@LA:mockTestGoal:v1';
export const GOAL_STORAGE_VERSION = 1;

// Wrapper around the goal record so future migrations can detect
// stale schemas without ambiguity. `version` is required on read —
// records without a matching version are treated as missing (we'd
// rather drop a stale goal than misinterpret it as a current one).
interface PersistedGoalRecord {
  version: number;
  goal: MockTestGoal;
}

// Defensive shape-check. AsyncStorage round-tripped JSON could come
// from a previous app version OR a corrupted write, so we validate
// before handing it back to the rest of the app. Anything malformed
// returns null (caller treats as "no goal set"), matching how the
// runner-side persistence handles bad records.
const isValidGoal = (raw: unknown): raw is MockTestGoal => {
  if (!raw || typeof raw !== 'object') return false;
  const g = raw as Partial<MockTestGoal>;
  if (typeof g.targetScore !== 'number') return false;
  if (!Number.isFinite(g.targetScore)) return false;
  if (g.targetScore < 10 || g.targetScore > 90) return false;
  if (typeof g.targetDateIso !== 'string' || g.targetDateIso.length === 0) {
    return false;
  }
  if (Number.isNaN(Date.parse(g.targetDateIso))) return false;
  if (typeof g.createdAtIso !== 'string' || g.createdAtIso.length === 0) {
    return false;
  }
  if (Number.isNaN(Date.parse(g.createdAtIso))) return false;
  return true;
};

// Read the active goal. Returns null when:
//   • No record exists (first install, or after clearGoal)
//   • Record exists but version mismatches (future migration target)
//   • Record exists but failed shape validation (corrupted write)
// In every "null" case the UI shows the "Set a goal" empty state,
// so the user gracefully falls back to the no-goal flow.
export const loadGoal = async (): Promise<MockTestGoal | null> => {
  try {
    const raw = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGoalRecord | unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as PersistedGoalRecord).version !== GOAL_STORAGE_VERSION
    ) {
      return null;
    }
    const goal = (parsed as PersistedGoalRecord).goal;
    return isValidGoal(goal) ? goal : null;
  } catch {
    // Either a JSON parse error or AsyncStorage failure. Both are
    // non-fatal for the rest of the app — the user just sees the
    // empty state and can set a new goal.
    return null;
  }
};

// Save (or replace) the active goal. Returns true on success, false
// on storage failure. Caller decides whether to surface the failure
// — for the modal flow we show a toast on false, for the
// auto-cleanup case (e.g. clearing an expired goal) we ignore.
export const saveGoal = async (goal: MockTestGoal): Promise<boolean> => {
  if (!isValidGoal(goal)) return false;
  try {
    const record: PersistedGoalRecord = {
      version: GOAL_STORAGE_VERSION,
      goal,
    };
    await AsyncStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
};

// Remove the active goal. Idempotent — calling on a missing record
// is a no-op success. We swallow storage errors here for the same
// reason as `saveGoal` callers that ignore the result: the user
// already saw the "goal cleared" UI feedback by the time this runs.
export const clearGoal = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(GOAL_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};
