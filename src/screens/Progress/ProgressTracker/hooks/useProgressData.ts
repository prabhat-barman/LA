import { useQueries, useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS } from '../../../../config/apiConfig';
import apiClient from '../../../../services/apiClient';
import { logger } from '../../../../services/logger';
import {
  mergeProgressData,
  normalizeCategoriesPayload,
  normalizeProgressPayload,
} from '../helpers';
import type {
  ProgressData,
  ProgressSkill,
  ProgressSubcategory,
} from '../types';
import { PROGRESS_MODE_PRACTICE, PROGRESS_SKILLS, SKILL_TO_ID } from '../types';

// ─── Query keys ─────────────────────────────────────────────────────────────
// Top-level constants so callers (e.g. pull-to-refresh handlers) can
// invalidate the exact cache slots without re-deriving the shape here.

export const CATEGORIES_QUERY_KEY = ['progressTracker', 'categories'] as const;

export const skillProgressQueryKey = (skill: ProgressSkill) =>
  ['progressTracker', 'skill', skill] as const;

// ─── Individual fetchers ────────────────────────────────────────────────────

const fetchCategories = async (): Promise<ProgressSubcategory[]> => {
  const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
  const raw =
    (res.data?.data as unknown) ?? (res.data as unknown) ?? {};
  return normalizeCategoriesPayload(raw);
};

const fetchSkillProgress = async (skill: ProgressSkill) => {
  // The endpoint is `/<base>/progress/{skill_id}?mock=0`. We compose it
  // off the base URL the proxy resolves rather than reaching into the
  // builder so we don't have to introduce a parametric URL form just for
  // this one screen.
  const base = API_ENDPOINTS.PROGRESS_TRACKER; // resolves to "<base>/progress"
  const url = `${base}/${SKILL_TO_ID[skill]}?mock=${PROGRESS_MODE_PRACTICE}`;
  try {
    const res = await apiClient.get(url);
    const raw = (res.data as unknown) ?? null;
    return normalizeProgressPayload(raw);
  } catch (err) {
    // Non-fatal — the screen still renders with attempted-from-categories
    // and accuracy="—" when this fails. We log it in __DEV__ so we
    // notice schema drift before users do.
    logger.warn(
      `[ProgressTracker] /progress/${SKILL_TO_ID[skill]} fetch failed (${skill}); rendering without accuracy.`,
      err,
    );
    return new Map();
  }
};

// ─── Public hooks ───────────────────────────────────────────────────────────

// Hook used by the screen — returns a merged `ProgressData` for ALL
// skills, populated lazily as each per-skill progress query resolves.
// We fetch the categories list once (shared cache) and one progress
// query per skill in parallel. Each progress query is cached
// independently so a tab-switch back to a previously-viewed tab is
// instant.
export const useProgressData = () => {
  const categoriesQuery = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    // The subcategory catalogue is fairly stable but cheap to refetch —
    // 60s of staleness is the same budget we use elsewhere.
    staleTime: 60 * 1000,
  });

  const skillQueries = useQueries({
    queries: PROGRESS_SKILLS.map(skill => ({
      queryKey: skillProgressQueryKey(skill),
      queryFn: () => fetchSkillProgress(skill),
      staleTime: 60 * 1000,
      // Only fire once we know which subcategories exist; reduces a
      // burst of 4 parallel calls on a fresh cold start to a clean
      // chain — categories first, then the 4 progress fetches.
      enabled: categoriesQuery.isSuccess,
    })),
  });

  const subcategories = categoriesQuery.data ?? [];
  // Merge every successfully resolved skill bucket. Skills still loading
  // simply contribute nothing — their subcategories appear with
  // categories-only fallback data until their query resolves.
  const merged = ((): ProgressData => {
    if (subcategories.length === 0) {
      return {
        bySkill: { Speaking: [], Writing: [], Reading: [], Listening: [] },
        populatedSkills: new Set<ProgressSkill>(),
      };
    }
    const combined = new Map<number, { attempted: number; accuracy: number | null }>();
    skillQueries.forEach(q => {
      if (q.data) {
        for (const [k, v] of q.data.entries()) combined.set(k, v);
      }
    });
    return mergeProgressData(subcategories, combined);
  })();

  return {
    data: merged,
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    refetch: () => {
      // Refetch categories + every skill bucket in parallel.
      categoriesQuery.refetch();
      skillQueries.forEach(q => q.refetch());
    },
    isRefetching:
      categoriesQuery.isRefetching ||
      skillQueries.some(q => q.isRefetching),
    // Per-skill loading flags so the screen can show a small spinner on
    // the current tab while its progress is still being fetched.
    isSkillLoading: (skill: ProgressSkill) => {
      const idx = PROGRESS_SKILLS.indexOf(skill);
      return idx === -1 ? false : skillQueries[idx]?.isLoading ?? false;
    },
  };
};
