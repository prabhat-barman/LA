import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import type {
  MockSection,
  MockTestVariant,
} from '../../MockTestRunner/types';
import { normalizeMockResult } from '../helpers';
import type { MockResult } from '../types';

export interface UseMockResultArgs {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Optional pass-through so the screen header can render a stable
  // title while the network request settles. The normalizer prefers
  // a backend-provided title over this when available.
  fallbackTitle?: string;
}

// Cache key. Tied to `mockId` only — the same result payload should
// resolve regardless of how the user arrived (post-finalize vs a
// future "view past results" entry point).
export const MOCK_RESULT_QUERY_KEY = (mockId: number | string) =>
  ['mock-result', String(mockId)] as const;

// Fetcher. Hits MOCK_SCORE/{mockId} which is the per-test detailed
// score endpoint. We deliberately don't probe MOCK_RESULT (list of
// all results) here — that endpoint is for the results-history
// surface, not the post-finalize reveal.
//
// On error we surface a friendly message via the thrown Error so
// React Query's `error` field renders cleanly in the UI. Raw error
// details still go to logger for diagnostics.
const fetchMockResult = async (
  args: UseMockResultArgs,
): Promise<MockResult> => {
  // MOCK_SCORE in URLS.ts ends with a trailing slash; the endpoint
  // expects the mockId appended verbatim.
  const url = `${API_ENDPOINTS.MOCK_SCORE}${args.mockId}`;
  try {
    const response = await apiClient.get(url);
    return normalizeMockResult(response.data, {
      mockId: args.mockId,
      variant: args.variant,
      category: args.category,
      fallbackTitle: args.fallbackTitle,
    });
  } catch (err) {
    logger.warn('[useMockResult] fetch failed', { mockId: args.mockId, err });
    throw new Error(
      'We could not load your result yet. Please try again in a moment.',
    );
  }
};

// React Query wrapper. `staleTime` is generous (5 min) because mock
// scores are immutable once graded — refetching pulls the same
// numbers. `gcTime` (15 min) keeps the result cached for the
// duration of a typical results browsing session so going back &
// forward doesn't re-fetch. `retry: 2` covers transient network
// blips without dragging out the user-facing loading state.
export const useMockResult = (args: UseMockResultArgs) => {
  return useQuery({
    queryKey: MOCK_RESULT_QUERY_KEY(args.mockId),
    queryFn: () => fetchMockResult(args),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
};
