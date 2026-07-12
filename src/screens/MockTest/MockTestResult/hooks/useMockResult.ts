import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import type {
  MockSection,
  MockTestVariant,
} from '../../MockTestRunner/types';
import { normalizeMockResult } from '../helpers';
import type { MockResult, PastMock } from '../types';
import { usePastMocks } from './usePastMocks';

export interface UseMockResultArgs {
  mockId: number | string;
  variant: MockTestVariant;
  category: MockSection | 'Full Mock';
  // Result-row id (outer `id` from MOCK_RESULT list entry). When
  // provided, used directly in the MOCK_SCORE URL — preferred path
  // for "view past result" flows where the list already gave us the
  // row id. When omitted (post-finalize from runner), the hook
  // resolves it via the past mocks list.
  resultId?: number | string;
  // Optional pass-through so the screen header can render a stable
  // title while the network request settles. The normalizer prefers
  // a backend-provided title over this when available.
  fallbackTitle?: string;
}

// Cache key. Tied to `mockId` + `variant` because Normal/Full and
// Extensive hit different backend formats (`?new_format=1`) and
// return different payload shapes — caching them together would
// risk a Full-mock screen rendering Extensive payload (or vice
// versa) on a hot-cache hit.
//
// We key on `mockId` (not `resultId`) so post-finalize navigation
// (which passes mockId-only) shares the cache with subsequent
// past-results navigation (which passes resultId). The hook
// resolves mockId → resultId internally before the actual fetch.
export const MOCK_RESULT_QUERY_KEY = (
  mockId: number | string,
  variant: MockTestVariant,
) => ['mock-result', String(mockId), variant] as const;

// Custom error subclass so the React Query retry predicate can
// distinguish "backend isn't ready yet, please retry" from "real
// failure, don't pound the server". We tag 5xx responses with this
// because the PHP backend creates the score row asynchronously
// after the final submit (`complete=1`) — calling `mock/score/:id`
// immediately afterwards races the grading worker and throws
// `Attempt to read property "user_id" on null` from MockTrait.php.
export class MockScoreNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockScoreNotReadyError';
  }
}

// HTTP status codes that indicate the backend hasn't materialised
// the score row yet. 5xx covers the NPE case; 404 covers any future
// version of the backend that decides to return "not found" instead.
const isScoreNotReadyStatus = (status: number | undefined): boolean =>
  status === undefined || (status >= 500 && status < 600) || status === 404;

// Fetcher. Hits MOCK_SCORE/{resultId} which is the per-test
// detailed score endpoint. CRITICAL: `MOCK_SCORE` expects the
// **outer row id** from MOCK_RESULT list entries (legacy `item.id`),
// NOT the mock master id (`item.mock.id`). Passing the master id
// makes the PHP controller throw `Attempt to read property
// "user_id" on null` from MockTrait.php:93.
//
// When `resultId` isn't supplied (post-finalize), we resolve it
// from `pastMocks` here by matching `(variant, mockId)` to a
// PastMock row. If no match yet (backend grading still queueing
// the row), we throw MockScoreNotReadyError so React Query's
// retry-with-backoff gives the grader time to materialise it.
const fetchMockResult = async (
  args: UseMockResultArgs,
  pastMocks: PastMock[],
): Promise<MockResult> => {
  let { resultId } = args;
  if (resultId == null) {
    const match = pastMocks.find(
      m =>
        m.variant === args.variant &&
        String(m.mockId) === String(args.mockId),
    );
    if (match) {
      resultId = match.resultId;
    } else {
      // List doesn't have this mock yet — most likely the backend
      // hasn't finished grading the just-submitted attempt and the
      // user_mock row that drives the list query doesn't exist.
      // Throw the not-ready sentinel so we retry with backoff.
      logger.info('[useMockResult] resultId unresolved, awaiting grading', {
        mockId: args.mockId,
        variant: args.variant,
      });
      throw new MockScoreNotReadyError(
        'Your result is still being graded. We will keep checking…',
      );
    }
  }

  // Extensive mocks need `?new_format=1` — without it the PHP
  // backend tries to score the attempt as a Normal/Full mock and
  // 500s on the missing rows. Mirrors the legacy ScoreCardScreen.js
  // endpoint construction.
  const queryString = args.variant === 'extensive' ? '?new_format=1' : '';
  const url = `${API_ENDPOINTS.MOCK_SCORE}${resultId}${queryString}`;
  try {
    const response = await apiClient.get(url);
    return normalizeMockResult(response.data, {
      mockId: args.mockId,
      variant: args.variant,
      category: args.category,
      fallbackTitle: args.fallbackTitle,
    });
  } catch (err) {
    const status = (err as AxiosError | undefined)?.response?.status;
    logger.warn('[useMockResult] fetch failed', {
      mockId: args.mockId,
      resultId,
      status,
      err,
    });
    if (isScoreNotReadyStatus(status)) {
      // Throw the typed "not ready" error so React Query's retry
      // predicate kicks in with exponential backoff. The UI sees
      // it as a transient loading state, not a hard failure.
      throw new MockScoreNotReadyError(
        'Your result is still being graded. We will keep checking…',
      );
    }
    throw new Error(
      'We could not load your result yet. Please try again in a moment.',
    );
  }
};

// React Query wrapper. `staleTime` is generous (5 min) because mock
// scores are immutable once graded — refetching pulls the same
// numbers. `gcTime` (15 min) keeps the result cached for the
// duration of a typical results browsing session so going back &
// forward doesn't re-fetch.
//
// Retry policy splits in two:
//   • `MockScoreNotReadyError` (backend grading race) — retry up
//     to 6 times with exponential backoff capped at 8s. Total
//     worst-case wait ≈ 30s which fits within a reasonable post-
//     finalize loading screen.
//   • Everything else — 2 retries, default backoff (network blip).
export const useMockResult = (args: UseMockResultArgs) => {
  // We always want the past mocks list available so we can resolve
  // `resultId` from `mockId` when the caller didn't provide it
  // (post-finalize path). The list query is shared with the home
  // rail so this is usually a cache hit.
  const past = usePastMocks();
  return useQuery({
    queryKey: MOCK_RESULT_QUERY_KEY(args.mockId, args.variant),
    queryFn: () => fetchMockResult(args, past.pastMocks),
    // Don't try to fetch until we have either an explicit resultId
    // or the past-mocks list has settled. Prevents an immediate
    // "not ready" error before we've even checked the list.
    enabled: args.resultId != null || !past.isLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof MockScoreNotReadyError) {
        return failureCount < 6;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt, error) => {
      if (error instanceof MockScoreNotReadyError) {
        // 1s, 2s, 4s, 8s, 8s, 8s — gives the backend grader time
        // to materialise the score row without spamming requests.
        return Math.min(1000 * 2 ** attempt, 8000);
      }
      return 1000 * 2 ** attempt;
    },
  });
};
