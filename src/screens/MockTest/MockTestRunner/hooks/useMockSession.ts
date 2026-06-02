import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import { normalizeMockTestDetail } from '../helpers';
import type {
  MockSection,
  MockSession,
  MockTestVariant,
} from '../types';

// Bulk-fetches every question for a mock test in one round-trip. The
// backend's `MOCK_TEST_DETAIL` endpoint expects `/{mockId}/{isPendingTest}`
// path suffix — `isPendingTest=1` resumes a saved-and-exited attempt
// (the response then carries `curr_q` so we can skip to the right Q).
export interface UseMockSessionArgs {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // When the user reached the runner via the resume CTA, set this so
  // the request hits the pending branch on the server.
  isResume: boolean;
}

export const MOCK_SESSION_QUERY_KEY = (
  mockId: number | string,
  isResume: boolean,
) => ['mock-session', String(mockId), isResume] as const;

const fetchMockSession = async (
  args: UseMockSessionArgs,
): Promise<MockSession> => {
  // `API_ENDPOINTS.MOCK_TEST_DETAIL` resolves to the full URL via the
  // Proxy in apiConfig; we append the path segments backend wants.
  const url = `${API_ENDPOINTS.MOCK_TEST_DETAIL}/${args.mockId}/${args.isResume ? 1 : 0}`;
  const response = await apiClient.get(url);

  const session = normalizeMockTestDetail(response.data, {
    mockId: args.mockId,
    variant: args.variant,
    category: args.category,
  });
  if (!session) {
    // Surface a helpful message — the runner will fall through to its
    // error state and the user gets a retry CTA.
    logger.warn(
      '[useMockSession] normalizer returned null for',
      args.mockId,
      response.data,
    );
    throw new Error('Could not load this mock test. Please try again.');
  }
  return session;
};

// Mock session is per-attempt — we cache for 2 minutes so the
// MockTestPrerequisite → MockTestRunner handoff reuses the prereq's
// initial fetch instead of round-tripping again. Two minutes comfortably
// covers the prereq carousel interaction without leaking stale data
// into a fresh attempt started later.
export const useMockSession = (args: UseMockSessionArgs) => {
  return useQuery({
    queryKey: MOCK_SESSION_QUERY_KEY(args.mockId, args.isResume),
    queryFn: () => fetchMockSession(args),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};
