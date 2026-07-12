import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/apiConfig';
import apiClient from '../../services/apiClient';
import { logger } from '../../services/logger';
import type { DailyGoalSnapshot, DailyGoalTargets } from './types';

// Date formatter — wire format expected by the backend is the same
// `YYYY-MM-DD` Java uses elsewhere. Default to "today" when no input.
const toApiDate = (input?: Date | string | null): string => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return toApiDate(null);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toNullableNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Normalises the heterogeneous shape returned by `mock/daily-report`
// into the typed `DailyGoalSnapshot` the screen consumes. Defensive
// on missing fields — empty defaults rather than throws so a broken
// payload doesn't lock the user out of the screen.
const normalize = (rawData: unknown, date: string): DailyGoalSnapshot => {
  const r = (rawData && typeof rawData === 'object'
    ? (rawData as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const task = (r.task && typeof r.task === 'object'
    ? (r.task as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const data = (r.data && typeof r.data === 'object'
    ? (r.data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const adminTasks = Array.isArray(r.admin_task_arr)
    ? (r.admin_task_arr as unknown[])
    : [];

  return {
    date,
    targets: {
      speaking: toNullableNum(task.speaking),
      writing: toNullableNum(task.writing),
      reading: toNullableNum(task.reading),
      listening: toNullableNum(task.listening),
      mock: toNullableNum(task.mock),
    },
    progress: {
      speaking_done: toNum(data.speaking ?? data.speaking_done),
      writing_done: toNum(data.writing ?? data.writing_done),
      reading_done: toNum(data.reading ?? data.reading_done),
      listening_done: toNum(data.listening ?? data.listening_done),
      mock_done: toNum(data.mock ?? data.mock_done),
    },
    tutorNotes: adminTasks
      .map(t => {
        if (typeof t === 'string') return t;
        if (t && typeof t === 'object') {
          const o = t as Record<string, unknown>;
          return String(o.task ?? o.remark ?? o.note ?? '');
        }
        return '';
      })
      .filter(s => s.trim().length > 0),
  };
};

interface UseDailyGoalsResult {
  snapshot: DailyGoalSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveTargets: (next: Partial<DailyGoalTargets>) => Promise<boolean>;
  date: string;
  setDate: (d: Date | string) => void;
}

// Hook that wraps the 2 GET + 1 POST endpoints behind a single
// surface. Re-fetches when the active date changes. We deliberately
// don't pull React Query for this single-screen feature — the call
// pattern is "open screen → fetch once → user maybe saves once" so
// the extra cache infra isn't worth the bytes.
export const useDailyGoals = (initialDate?: Date | string): UseDailyGoalsResult => {
  const [date, setDateState] = useState<string>(() => toApiDate(initialDate));
  const [snapshot, setSnapshot] = useState<DailyGoalSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.DAILY_REPORT, {
        params: { date },
      });
      const payload = res.data?.data ?? res.data ?? {};
      setSnapshot(normalize(payload, date));
    } catch (err) {
      logger.warn('[useDailyGoals] reload failed', err);
      setError('Could not load your daily goals.');
      setSnapshot({
        date,
        targets: {
          speaking: null,
          writing: null,
          reading: null,
          listening: null,
          mock: null,
        },
        progress: {
          speaking_done: 0,
          writing_done: 0,
          reading_done: 0,
          listening_done: 0,
          mock_done: 0,
        },
        tutorNotes: [],
      });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setDate = useCallback((d: Date | string) => {
    setDateState(toApiDate(d));
  }, []);

  const saveTargets = useCallback(
    async (next: Partial<DailyGoalTargets>): Promise<boolean> => {
      setSaving(true);
      try {
        const merged = { ...(snapshot?.targets ?? {}), ...next };
        const fd = new FormData();
        fd.append('date', date);
        // Backend expects each skill field individually with a numeric
        // value. We coerce `null` to '0' to mean "no goal".
        fd.append('speaking', String(merged.speaking ?? 0));
        fd.append('writing', String(merged.writing ?? 0));
        fd.append('reading', String(merged.reading ?? 0));
        fd.append('listening', String(merged.listening ?? 0));
        fd.append('mock', String(merged.mock ?? 0));
        await apiClient.post(API_ENDPOINTS.SAVE_TASK, fd);
        await reload();
        return true;
      } catch (err) {
        logger.warn('[useDailyGoals] save failed', err);
        setError('Could not save your goals.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [date, reload, snapshot],
  );

  return {
    snapshot,
    loading,
    saving,
    error,
    reload,
    saveTargets,
    date,
    setDate,
  };
};

export default useDailyGoals;
