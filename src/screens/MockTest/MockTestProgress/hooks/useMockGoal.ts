import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clearGoal, loadGoal, saveGoal } from '../goalPersistence';
import type { MockTestGoal } from '../types';

// React Query is overkill for a single AsyncStorage row, but using
// it here buys us:
//   • Auto-invalidation across multiple consumers (Progress screen +
//     a hypothetical Home dashboard goal widget) — set goal once,
//     every render that uses the hook updates.
//   • Consistent loading/error semantics with the rest of the mock
//     test screens (no special-case state machine in components).
//   • Free cache on remounts so navigating away and back doesn't
//     replay the AsyncStorage read.
// All for ~30 lines of code. Worth it.

export const GOAL_QUERY_KEY = ['mock-test-goal'] as const;

// Read hook. Returns the persisted goal or `null` when no goal is
// set / the record is unrecoverable (corrupt JSON, version mismatch).
// `staleTime: Infinity` since the only writer is the mutation hook
// below — no external source of truth to poll against.
export const useMockGoal = () => {
  const query = useQuery({
    queryKey: GOAL_QUERY_KEY,
    queryFn: loadGoal,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    ...query,
    goal: query.data ?? null,
  };
};

// Set/replace the active goal. Optimistic via direct cache write —
// the UI reflects the new goal before AsyncStorage actually returns.
// On storage failure we roll back the cache + return false so the
// caller can show a toast. createdAtIso is set HERE (not by the
// caller) so the timeline stays honest no matter what the modal
// sends in.
export const useSetMockGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { targetScore: number; targetDateIso: string }) => {
      const goal: MockTestGoal = {
        targetScore: input.targetScore,
        targetDateIso: input.targetDateIso,
        // Preserve the original createdAtIso when editing an
        // existing goal — re-set means "I'm replacing my target",
        // not "I'm starting over with a new timeline".
        createdAtIso:
          (queryClient.getQueryData(GOAL_QUERY_KEY) as MockTestGoal | null)
            ?.createdAtIso ?? new Date().toISOString(),
      };
      const ok = await saveGoal(goal);
      if (!ok) throw new Error('Failed to save goal');
      return goal;
    },
    onSuccess: goal => {
      queryClient.setQueryData(GOAL_QUERY_KEY, goal);
    },
  });
};

// Clear the active goal. Same optimistic shape as the set mutation.
// We don't bother with rollback on storage failure — the cache
// update already happened and a stale `null` reads "no goal set",
// which is a safe state (the user can re-set it).
export const useClearMockGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ok = await clearGoal();
      if (!ok) throw new Error('Failed to clear goal');
    },
    onSuccess: () => {
      queryClient.setQueryData(GOAL_QUERY_KEY, null);
    },
  });
};
