/**
 * subscriptionMapping.ts
 * Single source of truth for mapping between:
 *   • Backend `package_id` (from /getPackages and /get_dashboard_data)
 *   • Store SKU (from react-native-iap on Apple/Google)
 *   • Tier / Duration metadata
 *
 * Also provides:
 *   • HTML entity decoder for `currency` strings like "&#x20b9;" → "₹"
 *   • Country-name → ISO-code lookup for /getPackages?countryId=XX
 *   • Tag derivation from discount %
 */

import type { PlanTier, PlanDuration } from '../hooks/useIap';

// ─────────────────────────────────────────────────────────────────────────────
// Package ID ↔ SKU mapping
// Backend plan IDs are stable across environments (verified from
// /get_dashboard_data → plan.id and /getPackages → id).
// Android/iOS SKUs come from the backend plan.android_plan_id / ios_plan_id.
// ─────────────────────────────────────────────────────────────────────────────

export interface PackageMeta {
  packageId: number;
  tier: PlanTier;
  duration: PlanDuration;
  androidSku: string;
  iosSku: string;
}

export const PACKAGE_CATALOG: PackageMeta[] = [
  // GOLD
  {
    packageId: 37, // production GOLD 1-month (Stripe price_1O9TDmJkkRIRQvkEdugV7uO4)
    tier: 'Gold',
    duration: 1,
    androidSku: 'com.languageacademy.gold1month',
    iosSku: 'com.languageacademy.gold1monthplan',
  },
  {
    packageId: 32, // staging GOLD 1-month (alias)
    tier: 'Gold',
    duration: 1,
    androidSku: 'com.languageacademy.gold1month',
    iosSku: 'com.languageacademy.gold1monthplan',
  },
  {
    packageId: 45,
    tier: 'Gold',
    duration: 2,
    androidSku: 'com.languageacademy.gold2month',
    iosSku: 'com.languageacademy.gold2monthplan',
  },
  {
    packageId: 46,
    tier: 'Gold',
    duration: 3,
    androidSku: 'com.languageacademy.gold3month',
    iosSku: 'com.languageacademy.gold3monthplan',
  },

  // SILVER
  {
    packageId: 33,
    tier: 'Silver',
    duration: 1,
    androidSku: 'com.languageacademy.silver1month',
    // intentional extra 'n' — matches App Store Connect listing
    iosSku: 'com.languageacademy.silver1monthplann',
  },
  {
    packageId: 43,
    tier: 'Silver',
    duration: 2,
    androidSku: 'com.languageacademy.silver2month',
    iosSku: 'com.languageacademy.silver2monthplan',
  },
  {
    packageId: 44,
    tier: 'Silver',
    duration: 3,
    androidSku: 'com.languageacademy.silver3month',
    iosSku: 'com.languageacademy.silver3monthplan',
  },
];

const SKU_TO_PACKAGE: Record<string, PackageMeta> = (() => {
  const map: Record<string, PackageMeta> = {};
  for (const p of PACKAGE_CATALOG) {
    map[p.androidSku] = p;
    map[p.iosSku] = p;
    // PTE Core variant uses `_core` suffix on Android SKUs
    map[`${p.androidSku}_core`] = p;
  }
  return map;
})();

const PACKAGE_ID_TO_META: Record<number, PackageMeta> = (() => {
  const map: Record<number, PackageMeta> = {};
  for (const p of PACKAGE_CATALOG) {
    map[p.packageId] = p;
  }
  return map;
})();

export const findPackageBySku = (sku: string): PackageMeta | undefined =>
  SKU_TO_PACKAGE[sku];

export const findPackageById = (packageId: number): PackageMeta | undefined =>
  PACKAGE_ID_TO_META[packageId];

// ─────────────────────────────────────────────────────────────────────────────
// HTML entity decoder — backend returns currency as `&#x20b9;` (₹), `&#x24;` ($), etc.
// ─────────────────────────────────────────────────────────────────────────────

const NAMED_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export const decodeHtmlEntities = (input: string | null | undefined): string => {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (full, name) => NAMED_ENTITY_MAP[name.toLowerCase()] ?? full);
};

// ─────────────────────────────────────────────────────────────────────────────
// Country resolution — backend /getPackages requires ?countryId=<ISO-2>
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  india: 'IN',
  australia: 'AU',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  canada: 'CA',
  newzealand: 'NZ',
  'new zealand': 'NZ',
  pakistan: 'PK',
  bangladesh: 'BD',
  nepal: 'NP',
  srilanka: 'LK',
  'sri lanka': 'LK',
  philippines: 'PH',
  uae: 'AE',
  'united arab emirates': 'AE',
  saudiarabia: 'SA',
  'saudi arabia': 'SA',
  afghanistan: 'AF',
  malaysia: 'MY',
  singapore: 'SG',
  indonesia: 'ID',
  vietnam: 'VN',
  thailand: 'TH',
  southafrica: 'ZA',
  'south africa': 'ZA',
  nigeria: 'NG',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
};

export const resolveCountryIso = (
  countryName: string | null | undefined,
  fallback: string = 'IN',
): string => {
  if (!countryName || countryName === 'null') return fallback;
  // Already a 2-letter ISO code?
  if (/^[A-Z]{2}$/.test(countryName)) return countryName;
  const key = countryName.trim().toLowerCase();
  return COUNTRY_NAME_TO_ISO[key] ?? fallback;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tag derivation — backend gives `discount` %, we map to UI badge labels
// ─────────────────────────────────────────────────────────────────────────────

export type PlanBadge = 'BEST SELLER' | 'MOST SAVINGS' | 'NEW' | null;

export const deriveBadge = (
  discount: number | undefined | null,
  isNew?: boolean,
): PlanBadge => {
  const d = Number(discount ?? 0);
  if (d >= 30) return 'MOST SAVINGS';
  if (d >= 15) return 'BEST SELLER';
  if (isNew) return 'NEW';
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Backend `active_subscription` row → simple shape
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendActiveSubscription {
  id: number;
  user_id: number;
  package_id: number;
  status: number;
  expiry_date: string;
  video_expiry?: string | null;
  amount?: string | number;
  is_recurring_plan?: number;
  is_canceled?: number;
  assigned_by?: string | null;
  mock_count?: number;
  last_question_attempt?: string | null;
  plan?: {
    id: number;
    title: string;
    price: number;
    is_gold?: number;
    android_plan_id?: string;
    ios_plan_id?: string;
    [k: string]: any;
  };
  [k: string]: any;
}

export const isSubscriptionExpired = (s: BackendActiveSubscription): boolean => {
  if (!s.expiry_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(s.expiry_date);
  return expiry < today;
};

export const getTierFromBackendSub = (
  s: BackendActiveSubscription,
): PlanTier | null => {
  // 1. Trust backend plan flag if present
  if (s.plan?.is_gold === 1) return 'Gold';
  if (s.plan?.is_gold === 0) return 'Silver';

  // 2. Derive from title
  const title = (s.plan?.title || '').toUpperCase();
  if (title.includes('GOLD')) return 'Gold';
  if (title.includes('SILVER')) return 'Silver';

  // 3. Derive from catalog lookup
  const meta = findPackageById(s.package_id);
  if (meta) return meta.tier;

  return null;
};

export const getDaysRemaining = (expiryDate: string | undefined): number => {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ─────────────────────────────────────────────────────────────────────────────
// Synchronous subscription check from a dashboard payload.
// Use this when you already have `dashboardData` in scope (via context) and
// want to gate UI without doing an async AsyncStorage read.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pulls `active_subscription[]` out of either the dashboard root or its
 * nested `user` object (both shapes occur in the API), and returns the first
 * non-expired entry — or null when none is active.
 */
export const getActiveSubFromDashboard = (
  dashboardData: any,
): BackendActiveSubscription | null => {
  const subs: BackendActiveSubscription[] =
    dashboardData?.active_subscription
    ?? dashboardData?.user?.active_subscription
    ?? [];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  return subs.find((s) => !isSubscriptionExpired(s)) ?? null;
};

/** True when the dashboard payload contains any active, non-expired subscription. */
export const hasActiveSubscriptionFromData = (dashboardData: any): boolean => {
  return getActiveSubFromDashboard(dashboardData) !== null;
};

/** Same as above but also returns the tier (Gold / Silver) when present. */
export const getActiveTierFromDashboard = (
  dashboardData: any,
): PlanTier | null => {
  const sub = getActiveSubFromDashboard(dashboardData);
  return sub ? getTierFromBackendSub(sub) : null;
};
