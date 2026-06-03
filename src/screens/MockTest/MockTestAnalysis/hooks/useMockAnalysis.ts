import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import type { MockTestVariant } from '../../MockTestRunner/types';
import { usePastMocks } from '../../MockTestResult/hooks/usePastMocks';
import type { PastMock } from '../../MockTestResult/types';
import { normalizeMockAnalysis } from '../helpers';
import type { QuestionAnalysis } from '../types';

export interface UseMockAnalysisArgs {
  mockId: number | string;
  variant: MockTestVariant;
  // Result-row id (outer `id` from MOCK_RESULT list entry). Mirrors
  // the same field on `useMockResult` — see that hook for the why
  // (TL;DR: `MOCK_ANALYSIS/{id}` expects the user-attempt row id,
  // not the mock master id, otherwise PHP 500s).
  resultId?: number | string;
}

// We hold onto the raw payload too — the analysis screen exposes a
// long-press debug sheet that dumps the original response so the
// normalizer can be tightened against the real shape without an
// app rebuild.
export interface MockAnalysisData {
  questions: QuestionAnalysis[];
  raw: unknown;
}

// Same typed error / status predicate split as useMockResult. Keeps
// the grading-race retry policy aligned across the two screens that
// open right after submit.
export class MockAnalysisNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockAnalysisNotReadyError';
  }
}

const isAnalysisNotReadyStatus = (status: number | undefined): boolean =>
  status === undefined || (status >= 500 && status < 600) || status === 404;

export const MOCK_ANALYSIS_QUERY_KEY = (
  mockId: number | string,
  variant: MockTestVariant,
) => ['mock-analysis', String(mockId), variant] as const;

const fetchMockAnalysis = async (
  args: UseMockAnalysisArgs,
  pastMocks: PastMock[],
): Promise<MockAnalysisData> => {
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
      logger.info('[useMockAnalysis] resultId unresolved, awaiting grading', {
        mockId: args.mockId,
        variant: args.variant,
      });
      throw new MockAnalysisNotReadyError(
        'The breakdown is still being prepared. We will keep checking…',
      );
    }
  }

  const queryString = args.variant === 'extensive' ? '?new_format=1' : '';
  const url = `${API_ENDPOINTS.MOCK_ANALYSIS}${resultId}${queryString}`;
  try {
    const response = await apiClient.get(url);
    return {
      questions: normalizeMockAnalysis(response.data, { mockId: args.mockId }),
      raw: response.data,
    };
  } catch (err) {
    const status = (err as AxiosError | undefined)?.response?.status;
    logger.warn('[useMockAnalysis] fetch failed', {
      mockId: args.mockId,
      resultId,
      status,
      err,
    });
    if (isAnalysisNotReadyStatus(status)) {
      throw new MockAnalysisNotReadyError(
        'The breakdown is still being prepared. We will keep checking…',
      );
    }
    throw new Error(
      'We could not load the question breakdown. Please try again.',
    );
  }
};

// Same caching profile as useMockResult — per-question results are
// immutable once graded. 5 min stale / 15 min gc keeps the analysis
// screen instant on back-forward navigation while still picking up
// late-arriving grades on the next session.
export const useMockAnalysis = (args: UseMockAnalysisArgs) => {
  const past = usePastMocks();
  return useQuery({
    queryKey: MOCK_ANALYSIS_QUERY_KEY(args.mockId, args.variant),
    queryFn: () => fetchMockAnalysis(args, past.pastMocks),
    enabled: args.resultId != null || !past.isLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof MockAnalysisNotReadyError) {
        return failureCount < 6;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt, error) => {
      if (error instanceof MockAnalysisNotReadyError) {
        return Math.min(1000 * 2 ** attempt, 8000);
      }
      return 1000 * 2 ** attempt;
    },
  });
};
