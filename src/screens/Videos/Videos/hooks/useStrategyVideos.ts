import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/apiClient';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import { parseVideosResponse } from '../helpers';
import type { ParsedVideosResponse } from '../types';

// Query key for the strategy-videos catalog. Centralized so any future
// invalidations (e.g. after subscription changes) hit the same cache.
export const STRATEGY_VIDEOS_QUERY_KEY = ['strategy-videos'] as const;

const fetchStrategyVideos = async (): Promise<ParsedVideosResponse> => {
  const response = await apiClient.get(API_ENDPOINTS.PTE_VIDEOS);
  return parseVideosResponse(response.data);
};

// TanStack Query wrapper for the strategy-videos endpoint. Replaces the
// hand-rolled loading/error/refresh state previously held in
// VideosScreen with stale-while-revalidate caching.
export const useStrategyVideos = () => {
  return useQuery({
    queryKey: STRATEGY_VIDEOS_QUERY_KEY,
    queryFn: fetchStrategyVideos,
    // Strategy videos rarely change session-to-session — keep them
    // fresh-feeling for 10 minutes after a successful fetch.
    staleTime: 10 * 60 * 1000,
  });
};
