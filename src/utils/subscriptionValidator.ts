/**
 * subscriptionValidator.ts
 * Access control utility — check if user has access to a content type.
 *
 * Sources of truth (merged, max-tier wins):
 *   1. Local IAP cache (`SUBSCRIPTION_STORAGE_KEY`) — set after successful in-app purchase
 *   2. Backend `active_subscription[]` cache (`BACKEND_SUBSCRIPTION_STORAGE_KEY`)
 *      — set by DashboardDataContext on every dashboard refresh; covers users
 *        who were assigned a plan by a tutor/admin or paid via web (Razorpay/Stripe)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { SUBSCRIPTION_STORAGE_KEY, type StoredSubscription, type PlanTier } from '../hooks/useIap';
import {
  type BackendActiveSubscription,
  isSubscriptionExpired,
  getTierFromBackendSub,
} from './subscriptionMapping';

// ── Storage Keys ──────────────────────────────────────────────────────────────
export const BACKEND_SUBSCRIPTION_STORAGE_KEY = 'backend_active_subscription';

// ── Content Types ─────────────────────────────────────────────────────────────

export const CONTENT_TYPES = {
  PRACTICE_MATERIAL: 'practice_material',
  MOCK_TEST: 'mock_test',
  PTE_VIDEO: 'pte_video',
  VIP_VIDEO: 'vip_video',
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

// ── Access Map ────────────────────────────────────────────────────────────────
// Which tier grants access to which content type

const ACCESS_MAP: Record<ContentType, PlanTier[]> = {
  practice_material: ['Silver', 'Gold'],
  mock_test:         ['Silver', 'Gold'],
  pte_video:         ['Silver', 'Gold'],
  vip_video:         ['Gold'],          // VIP only in Gold
};

// Pick max-rank tier when merging multiple sources
const tierRank: Record<PlanTier, number> = { Silver: 1, Gold: 2 };

const maxTier = (a: PlanTier | null, b: PlanTier | null): PlanTier | null => {
  if (!a) return b;
  if (!b) return a;
  return tierRank[a] >= tierRank[b] ? a : b;
};

// ── Read local IAP-cached tier (from useIap.saveSubscriptionToStorage) ───────

const readLocalIapTier = async (): Promise<PlanTier | null> => {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;

    const subs: StoredSubscription[] = JSON.parse(raw);
    if (!subs || subs.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = subs.find((s) => {
      if (!s.expiry_date) return false;
      const expiry = new Date(s.expiry_date);
      return expiry >= today;
    });

    return active?.tier ?? null;
  } catch {
    return null;
  }
};

// ── Read backend-cached tier (from DashboardDataContext) ──────────────────────

const readBackendTier = async (): Promise<PlanTier | null> => {
  try {
    const raw = await AsyncStorage.getItem(BACKEND_SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const subs: BackendActiveSubscription[] = JSON.parse(raw);
    if (!Array.isArray(subs) || subs.length === 0) return null;

    let best: PlanTier | null = null;
    for (const s of subs) {
      if (isSubscriptionExpired(s)) continue;
      const t = getTierFromBackendSub(s);
      best = maxTier(best, t);
    }
    return best;
  } catch {
    return null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve the user's currently-active tier, merging IAP + backend caches.
 * Returns `null` if no active subscription is found.
 */
export async function getActiveTier(): Promise<PlanTier | null> {
  const [iapTier, backendTier] = await Promise.all([
    readLocalIapTier(),
    readBackendTier(),
  ]);
  return maxTier(iapTier, backendTier);
}

/**
 * Return the live backend `active_subscription` row (first non-expired),
 * useful for rendering "Current Plan" UI without re-fetching dashboard.
 */
export async function getBackendActiveSubscription(): Promise<BackendActiveSubscription | null> {
  try {
    const raw = await AsyncStorage.getItem(BACKEND_SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const subs: BackendActiveSubscription[] = JSON.parse(raw);
    if (!Array.isArray(subs)) return null;
    return subs.find((s) => !isSubscriptionExpired(s)) ?? null;
  } catch {
    return null;
  }
}

/** Persist backend active_subscription[] so the validator can read it. */
export async function persistBackendActiveSubscription(
  subs: BackendActiveSubscription[] | null | undefined,
): Promise<void> {
  try {
    if (!subs || subs.length === 0) {
      await AsyncStorage.removeItem(BACKEND_SUBSCRIPTION_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(
      BACKEND_SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify(subs),
    );
  } catch {
    // Silent
  }
}

// ── Check if user has access ──────────────────────────────────────────────────

export async function hasAccessTo(contentType: ContentType): Promise<boolean> {
  const tier = await getActiveTier();
  if (!tier) return false;
  return ACCESS_MAP[contentType].includes(tier);
}

// ── Validate and prompt subscription if no access ────────────────────────────

export async function validateAndPromptSubscription(
  contentType: ContentType,
  navigation: any,
): Promise<boolean> {
  const access = await hasAccessTo(contentType);
  if (access) return true;

  const tier = await getActiveTier();
  const isUpgradeNeeded = tier !== null;

  Alert.alert(
    isUpgradeNeeded ? 'Upgrade Required' : 'Subscription Required',
    isUpgradeNeeded
      ? 'This content is available in the Gold plan. Upgrade to access VIP Videos and premium content.'
      : 'You need an active subscription to access this content. Choose a plan to get started.',
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: isUpgradeNeeded ? 'Upgrade to Gold' : 'View Plans',
        onPress: () => {
          navigation?.navigate?.('Subscription');
        },
      },
    ],
  );

  return false;
}

// ── Convenience: check subscription validity ──────────────────────────────────

export async function isSubscriptionActive(): Promise<boolean> {
  const tier = await getActiveTier();
  return tier !== null;
}

export async function isGoldSubscriber(): Promise<boolean> {
  const tier = await getActiveTier();
  return tier === 'Gold';
}

export async function isSilverSubscriber(): Promise<boolean> {
  const tier = await getActiveTier();
  return tier === 'Silver';
}
