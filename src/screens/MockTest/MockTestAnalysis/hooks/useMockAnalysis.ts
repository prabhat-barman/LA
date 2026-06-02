import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import { normalizeMockAnalysis } from '../helpers';
import type { QuestionAnalysis } from '../types';

export interface UseMockAnalysisArgs {
  mockId: number | string;
}

// We hold onto the raw payload too — the analysis screen exposes a
// long-press debug sheet that dumps the original response so the
// normalizer can be tightened against the real shape without an
// app rebuild.
export interface MockAnalysisData {
  questions: QuestionAnalysis[];
  raw: unknown;
}

export const MOCK_ANALYSIS_QUERY_KEY = (mockId: number | string) =>
  ['mock-analysis', String(mockId)] as const;

const fetchMockAnalysis = async (
  args: UseMockAnalysisArgs,
): Promise<MockAnalysisData> => {
  // MOCK_ANALYSIS in URLS.ts ends with a trailing slash; the endpoint
  // expects the mockId appended verbatim. Same trick as MOCK_SCORE.
  const url = `${API_ENDPOINTS.MOCK_ANALYSIS}${args.mockId}`;
  try {
    const response = await apiClient.get(url);
    return {
      questions: normalizeMockAnalysis(response.data, { mockId: args.mockId }),
      raw: response.data,
    };
  } catch (err) {
    logger.warn('[useMockAnalysis] fetch failed', { mockId: args.mockId, err });
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
  return useQuery({
    queryKey: MOCK_ANALYSIS_QUERY_KEY(args.mockId),
    queryFn: () => fetchMockAnalysis(args),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
};
