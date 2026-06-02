import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/apiConfig';
import apiClient from '../services/apiClient';
import { logger } from '../services/logger';

// One option in the branch dropdown. `id` is the backend branch id
// (sent as `center` form field on trial-class submit). `label` is
// what the user sees in the dropdown. The first option is always a
// pseudo-entry with an empty id — it acts as the placeholder /
// "no selection" state. The legacy app handled this the same way
// (see `useCenters.js` in la-app-merge-dev-extensive).
export interface BranchOption {
  id: string;
  label: string;
}

const FALLBACK: BranchOption[] = [
  { id: '', label: 'Select Center' },
  { id: 'online', label: 'Online' },
];

interface ApiBranch {
  id?: number | string | null;
  name?: string | null;
}

interface ApiResponse {
  branches?: ApiBranch[];
}

interface UseBranchesResult {
  branches: BranchOption[];
  loading: boolean;
  error: Error | null;
}

// Fetches the live branch list from `GET_ALL_BRANCHES` and falls
// back to a {Select / Online} pair if the request fails — same
// behaviour the legacy `useCenters` hook had so the form stays
// submittable when the user is offline / the endpoint is down.
export const useBranches = (): UseBranchesResult => {
  const [branches, setBranches] = useState<BranchOption[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const controller = new AbortController();
    setLoading(true);

    apiClient
      .get<ApiResponse>(API_ENDPOINTS.GET_ALL_BRANCHES, {
        signal: controller.signal,
      })
      .then(res => {
        if (cancelledRef.current) return;
        const rawList = Array.isArray(res.data?.branches) ? res.data.branches : [];
        const parsed: BranchOption[] = rawList
          .filter((b): b is ApiBranch =>
            Boolean(b && b.name && b.id !== null && b.id !== undefined),
          )
          .map(b => ({
            id: String(b.id),
            label: String(b.name),
          }));
        if (parsed.length === 0) {
          setBranches(FALLBACK);
        } else {
          setBranches([{ id: '', label: 'Select Center' }, ...parsed]);
        }
      })
      .catch(err => {
        if (cancelledRef.current || controller.signal.aborted) return;
        logger.warn('[useBranches] fetch failed, falling back', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setBranches(FALLBACK);
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
      controller.abort();
    };
  }, []);

  return { branches, loading, error };
};
