/**
 * useSubscriptionPackages.ts
 * Fetch backend subscription packages from /getPackages?countryId=XX
 *
 * Backend response shape (example for IN):
 *   {
 *     message: "Success",
 *     country: "IN",
 *     data: [
 *       { id, title, is_gold, duration, price, razorpay_price, currency, discount?, new, is_video, is_que_str },
 *       ...
 *     ]
 *   }
 *
 * This hook hydrates against AsyncStorage for instant render, then refreshes
 * silently in the background.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';
import {
  decodeHtmlEntities,
  findPackageById,
  resolveCountryIso,
  type PackageMeta,
} from '../utils/subscriptionMapping';
import { useUser } from '../context/UserContext';
import { getItem } from '../utils/secureStorage';

const CACHE_KEY = 'subscription_packages_cache';

export interface BackendPackage {
  id: number;
  title: string;
  is_gold: number;
  is_que_str?: number;
  is_video?: number;
  duration: number;
  price: number;
  razorpay_price?: number;
  currency: string;
  /** Decoded currency symbol (e.g. ₹, $) — computed locally */
  currencySymbol: string;
  discount?: number;
  new?: string;
  /** Local catalog metadata (SKUs, tier) joined from `subscriptionMapping` */
  meta?: PackageMeta;
}

export interface UseSubscriptionPackagesReturn {
  packages: BackendPackage[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  country: string;
  refresh: () => Promise<void>;
}

const normalizePackage = (raw: any): BackendPackage => {
  const id = Number(raw?.id ?? 0);
  return {
    id,
    title: String(raw?.title ?? ''),
    is_gold: Number(raw?.is_gold ?? 0),
    is_que_str: raw?.is_que_str !== undefined ? Number(raw.is_que_str) : undefined,
    is_video: raw?.is_video !== undefined ? Number(raw.is_video) : undefined,
    duration: Number(raw?.duration ?? 1),
    price: Number(raw?.price ?? 0),
    razorpay_price: raw?.razorpay_price !== undefined ? Number(raw.razorpay_price) : undefined,
    currency: String(raw?.currency ?? ''),
    currencySymbol: decodeHtmlEntities(raw?.currency) || '$',
    discount: raw?.discount !== undefined ? Number(raw.discount) : 0,
    new: raw?.new,
    meta: findPackageById(id),
  };
};

export const useSubscriptionPackages = (
  countryOverride?: string,
): UseSubscriptionPackagesReturn => {
  const { user } = useUser();
  const [packages, setPackages] = useState<BackendPackage[]>([]);
  const [country, setCountry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveCountryParam = useCallback((): string => {
    if (countryOverride) return resolveCountryIso(countryOverride);
    return resolveCountryIso(
      user?.country_residence || user?.country_citizenship || user?.country,
      'IN',
    );
  }, [countryOverride, user?.country_residence, user?.country_citizenship, user?.country]);

  const hydrateFromCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data)) {
        setPackages(parsed.data.map(normalizePackage));
        if (parsed?.country) setCountry(parsed.country);
      }
    } catch {
      // Ignore cache errors silently
    }
  }, []);

  const fetchPackages = useCallback(
    async (isRefresh = false) => {
      // Skip silently if user isn't authenticated yet — same reasoning as
      // DashboardDataContext.loadDashboardData.
      const token = await getItem('user_token');
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const countryId = resolveCountryParam();

      try {
        const url = `${API_ENDPOINTS.GET_PACKAGES}?countryId=${encodeURIComponent(countryId)}`;
        const response = await apiClient.get(url, { timeout: 15000 });
        const data = response.data?.data ?? [];
        const resolvedCountry = response.data?.country ?? countryId;

        if (Array.isArray(data)) {
          const normalized: BackendPackage[] = data.map(normalizePackage);
          setPackages(normalized);
          setCountry(resolvedCountry);
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ country: resolvedCountry, data, ts: Date.now() }),
          );
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load packages';
        // Auth-transient noise — handled by login flow elsewhere.
        if (!msg.includes('API blocked due to session expiration')) {
          setError(msg);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolveCountryParam],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateFromCache();
      if (!mounted) return;
      await fetchPackages(false);
    })();
    return () => {
      mounted = false;
    };
  }, [hydrateFromCache, fetchPackages]);

  return {
    packages,
    loading,
    refreshing,
    error,
    country,
    refresh: () => fetchPackages(true),
  };
};
