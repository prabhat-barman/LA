import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GOAL_STORAGE_KEY,
  GOAL_STORAGE_VERSION,
  clearGoal,
  loadGoal,
  saveGoal,
} from './goalPersistence';
import type { MockTestGoal } from './types';

const goodGoal: MockTestGoal = {
  targetScore: 70,
  targetDateIso: '2026-12-31T00:00:00.000Z',
  createdAtIso: '2026-06-01T12:00:00.000Z',
};

describe('goalPersistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  describe('saveGoal + loadGoal', () => {
    it('round-trips a valid goal', async () => {
      const ok = await saveGoal(goodGoal);
      expect(ok).toBe(true);
      const loaded = await loadGoal();
      expect(loaded).toEqual(goodGoal);
    });

    it('returns null when no goal has been saved', async () => {
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('persists with the correct schema version envelope', async () => {
      await saveGoal(goodGoal);
      const raw = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string);
      expect(parsed).toEqual({
        version: GOAL_STORAGE_VERSION,
        goal: goodGoal,
      });
    });

    it('overwrites a previously saved goal', async () => {
      await saveGoal(goodGoal);
      const updated: MockTestGoal = { ...goodGoal, targetScore: 79 };
      await saveGoal(updated);
      const loaded = await loadGoal();
      expect(loaded?.targetScore).toBe(79);
    });

    it('returns false when targetScore is out of band', async () => {
      const ok = await saveGoal({ ...goodGoal, targetScore: 5 });
      expect(ok).toBe(false);
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('returns false when targetScore is NaN', async () => {
      const ok = await saveGoal({ ...goodGoal, targetScore: NaN });
      expect(ok).toBe(false);
    });

    it('returns false when targetDateIso is unparseable', async () => {
      const ok = await saveGoal({ ...goodGoal, targetDateIso: 'not a date' });
      expect(ok).toBe(false);
    });

    it('returns false when createdAtIso is unparseable', async () => {
      const ok = await saveGoal({ ...goodGoal, createdAtIso: '' });
      expect(ok).toBe(false);
    });
  });

  describe('loadGoal — defensive parsing', () => {
    it('returns null when stored JSON is malformed', async () => {
      await AsyncStorage.setItem(GOAL_STORAGE_KEY, '{ broken json');
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('returns null when version does not match', async () => {
      await AsyncStorage.setItem(
        GOAL_STORAGE_KEY,
        JSON.stringify({ version: 999, goal: goodGoal }),
      );
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('returns null when goal object fails validation', async () => {
      await AsyncStorage.setItem(
        GOAL_STORAGE_KEY,
        JSON.stringify({
          version: GOAL_STORAGE_VERSION,
          goal: { targetScore: 70 },
        }),
      );
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('returns null when storage read throws', async () => {
      jest
        .spyOn(AsyncStorage, 'getItem')
        .mockRejectedValueOnce(new Error('boom'));
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });
  });

  describe('clearGoal', () => {
    it('removes a previously saved goal', async () => {
      await saveGoal(goodGoal);
      const ok = await clearGoal();
      expect(ok).toBe(true);
      const loaded = await loadGoal();
      expect(loaded).toBeNull();
    });

    it('is idempotent when no goal exists', async () => {
      const ok = await clearGoal();
      expect(ok).toBe(true);
    });

    it('returns false when storage removeItem throws', async () => {
      jest
        .spyOn(AsyncStorage, 'removeItem')
        .mockRejectedValueOnce(new Error('boom'));
      const ok = await clearGoal();
      expect(ok).toBe(false);
    });
  });

  describe('saveGoal — storage failures', () => {
    it('returns false when setItem throws', async () => {
      jest
        .spyOn(AsyncStorage, 'setItem')
        .mockRejectedValueOnce(new Error('boom'));
      const ok = await saveGoal(goodGoal);
      expect(ok).toBe(false);
    });
  });
});
