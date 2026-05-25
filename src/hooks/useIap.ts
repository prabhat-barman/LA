/**
 * useIap.ts
 * Core In-App Purchase hook — Android + iOS
 * Handles: init, price fetch, purchase, restore, backend verify, finish
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import apiClient from '../services/apiClient';
import { logger } from '../services/logger';
import { API_ENDPOINTS } from '../config/apiConfig';
import { isPteCore } from '../config/appVariantConfig';

// ── AsyncStorage Key ──────────────────────────────────────────────────────────
export const SUBSCRIPTION_STORAGE_KEY = 'active_subscription';

// ── SKU Definitions ──────────────────────────────────────────────────────────

const BASE_SKUS = {
  Gold: {
    android: [
      'com.languageacademy.gold1month',
      'com.languageacademy.gold2month',
      'com.languageacademy.gold3month',
    ],
    ios: [
      'com.languageacademy.gold1monthplan',
      'com.languageacademy.gold2monthplan',
      'com.languageacademy.gold3monthplan',
    ],
  },
  Silver: {
    android: [
      'com.languageacademy.silver1month',
      'com.languageacademy.silver2month',
      'com.languageacademy.silver3month',
    ],
    ios: [
      'com.languageacademy.silver1monthplann', // ⚠️ intentional extra 'n' — matches App Store Connect
      'com.languageacademy.silver2monthplan',
      'com.languageacademy.silver3monthplan',
    ],
  },
};

// PTE Core variant adds '_core' suffix to all Android SKUs
const buildSkus = () => {
  const isCore = isPteCore();
  const addCoreSuffix = (sku: string) => (isCore ? `${sku}_core` : sku);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const goldSkus = BASE_SKUS.Gold[platform].map(addCoreSuffix);
  const silverSkus = BASE_SKUS.Silver[platform].map(addCoreSuffix);

  return {
    Gold: goldSkus,
    Silver: silverSkus,
    all: [...goldSkus, ...silverSkus],
  };
};

// ── Plan Metadata ─────────────────────────────────────────────────────────────

export type PlanTier = 'Gold' | 'Silver';
export type PlanDuration = 1 | 2 | 3; // months

export interface PlanInfo {
  tier: PlanTier;
  duration: PlanDuration;
  sku: string;
  /** Store price string (e.g. "$4.99") — null while loading */
  price: string | null;
  localizedPrice: string | null;
  tag: 'BEST SELLER' | 'MOST SAVINGS' | null;
  androidOfferToken?: string;
}

// ── Stored Subscription ───────────────────────────────────────────────────────

export interface StoredSubscription {
  plan: {
    android_plan_id: string;
    ios_plan_id: string;
  };
  expiry_date: string;
  tier: PlanTier;
}

// ── Hook Return Type ──────────────────────────────────────────────────────────

export interface UseIapReturn {
  plans: PlanInfo[];
  isPurchasing: boolean;
  isRestoring: boolean;
  isLoadingPrices: boolean;
  connectionReady: boolean;
  requestProductSubscription: (plan: PlanInfo) => Promise<void>;
  restorePurchases: () => Promise<void>;
  getStoredSubscription: () => Promise<StoredSubscription[] | null>;
}

// ── Main Hook ─────────────────────────────────────────────────────────────────

export const useIap = (): UseIapReturn => {
  const [connectionReady, setConnectionReady] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [plans, setPlans] = useState<PlanInfo[]>([]);

  const purchaseListenerRef = useRef<any>(null);
  const errorListenerRef = useRef<any>(null);

  // ── Build initial plan list (no prices yet) ──────────────────────────────
  const buildInitialPlans = useCallback((): PlanInfo[] => {
    const skus = buildSkus();
    const result: PlanInfo[] = [];

    const tags: Record<number, PlanInfo['tag']> = {
      0: null,
      1: 'BEST SELLER',
      2: 'MOST SAVINGS',
    };

    (['Gold', 'Silver'] as PlanTier[]).forEach((tier) => {
      skus[tier].forEach((sku, i) => {
        result.push({
          tier,
          duration: ([1, 2, 3] as PlanDuration[])[i],
          sku,
          price: null,
          localizedPrice: null,
          tag: tags[i],
        });
      });
    });

    return result;
  }, []);

  // ── Load store prices ────────────────────────────────────────────────────
  const loadPrices = useCallback(async () => {
    const skus = buildSkus();
    setIsLoadingPrices(true);
    logger.log('[useIap] Fetching subscription products from store for SKUs:', skus.all);
    try {
      const storeProducts = await fetchProducts({ skus: skus.all, type: 'subs' });
      logger.log('[useIap] Fetched products response from store:', storeProducts);
      if (!storeProducts) {
        throw new Error('Failed to fetch products from store');
      }
      setPlans((prev) =>
        prev.map((plan) => {
          const found = storeProducts.find((p) => p.id === plan.sku);
          if (!found) {
            logger.log(`[useIap] SKU not found in store response: ${plan.sku}`);
            return plan;
          }

          // Android: extract offerToken from subscriptionOffers or subscriptionOfferDetailsAndroid
          const offerToken =
            Platform.OS === 'android'
              ? (found as any)?.subscriptionOffers?.[0]?.offerTokenAndroid ??
                (found as any)?.subscriptionOfferDetailsAndroid?.[0]?.offerToken ??
                undefined
              : undefined;

          return {
            ...plan,
            price: found.displayPrice ?? null,
            localizedPrice: found.displayPrice ?? null,
            androidOfferToken: offerToken,
          };
        }),
      );
    } catch (err) {
      logger.warn('[useIap] loadPrices error:', err);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  // ── Initialize IAP connection ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const ok = await initConnection();
        if (!mounted) return;
        if (ok) {
          setConnectionReady(true);
          setPlans(buildInitialPlans());
          await loadPrices();
        }
      } catch (err) {
        logger.warn('[useIap] initConnection error:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      endConnection();
    };
  }, [buildInitialPlans, loadPrices]);

  // ── Purchase listener ────────────────────────────────────────────────────
  useEffect(() => {
    purchaseListenerRef.current = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        try {
          const isValid = await verifyWithBackend(purchase);
          if (isValid) {
            await saveSubscriptionToStorage(purchase);
            await finishTransaction({ purchase, isConsumable: false });
            setIsPurchasing(false);
            Alert.alert(
              '🎉 Subscription Activated!',
              'Your plan has been activated successfully.',
              [{ text: 'Great!' }],
            );
          } else {
            await finishTransaction({ purchase, isConsumable: false });
            setIsPurchasing(false);
            Alert.alert('Verification Failed', 'Could not verify your purchase. Please try again or contact support.');
          }
        } catch (err) {
          setIsPurchasing(false);
          logger.warn('[useIap] purchaseUpdatedListener error:', err);
        }
      },
    );

    errorListenerRef.current = purchaseErrorListener((error: PurchaseError) => {
      setIsPurchasing(false);
      handlePurchaseError(error);
    });

    return () => {
      purchaseListenerRef.current?.remove();
      errorListenerRef.current?.remove();
    };
  }, []);

  // ── Request subscription ─────────────────────────────────────────────────
  const requestProductSubscription = useCallback(async (plan: PlanInfo) => {
    if (!connectionReady) {
      Alert.alert('Not Ready', 'Store connection not established. Please try again.');
      return;
    }

    setIsPurchasing(true);
    try {
      if (Platform.OS === 'android') {
        await requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [plan.sku],
              subscriptionOffers: plan.androidOfferToken
                ? [{ sku: plan.sku, offerToken: plan.androidOfferToken }]
                : [],
            },
          },
        });
      } else {
        await requestPurchase({
          type: 'subs',
          request: {
            apple: {
              sku: plan.sku,
            },
          },
        });
      }
      // purchaseUpdatedListener will handle the rest
    } catch (err: any) {
      setIsPurchasing(false);
      if (err?.code !== 'E_USER_CANCELLED') {
        handlePurchaseError(err);
      }
    }
  }, [connectionReady]);

  // ── Restore purchases ────────────────────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      if (!purchases || purchases.length === 0) {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
        return;
      }

      // Use the most recent purchase
      const latest = purchases[0];
      const isValid = await verifyWithBackend(latest, 'restore');

      if (isValid) {
        await saveSubscriptionToStorage(latest);
        Alert.alert('✅ Restored!', 'Your subscription has been restored successfully.');
      } else {
        Alert.alert('Verification Failed', 'Could not verify your previous purchase. Contact support if the issue persists.');
      }
    } catch (err) {
      logger.warn('[useIap] restorePurchases error:', err);
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  // ── Get stored subscription ──────────────────────────────────────────────
  const getStoredSubscription = useCallback(async (): Promise<StoredSubscription[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredSubscription[];
    } catch {
      return null;
    }
  }, []);

  return {
    plans,
    isPurchasing,
    isRestoring,
    isLoadingPrices,
    connectionReady,
    requestProductSubscription,
    restorePurchases,
    getStoredSubscription,
  };
};

// ── Backend Verification ──────────────────────────────────────────────────────

async function verifyWithBackend(
  purchase: Purchase,
  type: 'purchase' | 'restore' = 'purchase',
): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await apiClient.post(API_ENDPOINTS.PAYMENT_STATUS, {
        subscriptionId: purchase.productId,
        purchaseToken: purchase.purchaseToken ?? '',
        device: 'ANDROID',
      });
    } else {
      await apiClient.post(API_ENDPOINTS.VERIFY_IOS_IAP, {
        receipt: (purchase as any).transactionReceipt ?? purchase.purchaseToken ?? '',
        device: 'IOS',
        transaction_id: (purchase as any).transactionId ?? purchase.id ?? '',
        type,
      });
    }
    return true;
  } catch (err: any) {
    const status = err?.response?.status;
    // 4xx = backend rejected; 5xx = server error; network error = fail
    if (status && status >= 200 && status < 300) return true;
    logger.warn('[useIap] verifyWithBackend failed:', err?.response?.data ?? err?.message);
    return false;
  }
}

// ── Save to AsyncStorage ──────────────────────────────────────────────────────

async function saveSubscriptionToStorage(
  purchase: Purchase,
): Promise<void> {
  const sku = purchase.productId;
  const isIos = Platform.OS === 'ios';

  // Determine tier from SKU
  const isGold =
    sku.includes('gold') || sku.includes('Gold');

  const tier: PlanTier = isGold ? 'Gold' : 'Silver';

  // Expiry: use transactionDate + 30/60/90 days based on duration from SKU
  const months = sku.includes('3month') ? 3 : sku.includes('2month') ? 2 : 1;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);

  const entry: StoredSubscription = {
    plan: {
      android_plan_id: isIos ? '' : sku,
      ios_plan_id: isIos ? sku : '',
    },
    expiry_date: expiryDate.toISOString().split('T')[0],
    tier,
  };

  try {
    const existing = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    const parsed: StoredSubscription[] = existing ? JSON.parse(existing) : [];
    // Remove old entries for same platform, add new one at front
    const filtered = parsed.filter((s) =>
      isIos ? !s.plan.ios_plan_id : !s.plan.android_plan_id,
    );
    await AsyncStorage.setItem(
      SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify([entry, ...filtered]),
    );
  } catch (err) {
    logger.warn('[useIap] saveSubscriptionToStorage error:', err);
  }
}

// ── Error Handler ─────────────────────────────────────────────────────────────

function handlePurchaseError(error: any) {
  const code = error?.code ?? '';

  if (code === 'E_USER_CANCELLED') {
    // Silently ignore — user backed out
    return;
  }

  if (code === 'E_ALREADY_OWNED') {
    Alert.alert(
      'Already Subscribed',
      'You already have an active subscription. Try restoring your purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => {} }, // caller can handle
      ],
    );
    return;
  }

  if (code === 'E_NETWORK_ERROR') {
    Alert.alert(
      'No Internet',
      'Please check your internet connection and try again.',
    );
    return;
  }

  if (code === 'E_SERVICE_ERROR') {
    Alert.alert(
      'Billing Service Error',
      'There was an issue with the billing service. Please try again later.',
    );
    return;
  }

  // Generic fallback
  Alert.alert(
    'Purchase Failed',
    error?.message ?? 'An unexpected error occurred. Please try again.',
  );
}
