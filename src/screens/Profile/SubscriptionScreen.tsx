import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { CheckIcon, CloseIcon } from '../../components/atoms/Icon';
import { SubscriptionSkeleton } from '../../components/atoms/Skeleton';
import { useIap, type PlanInfo, type PlanTier } from '../../hooks/useIap';
import { useSubscriptionPackages, type BackendPackage } from '../../hooks/useSubscriptionPackages';
import { useDashboardData } from '../../context/DashboardDataContext';
import {
  deriveBadge,
  getDaysRemaining,
  getTierFromBackendSub,
  type PlanBadge,
} from '../../utils/subscriptionMapping';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Plan card display model — merges backend package + store SKU price ───────

interface DisplayPlan {
  /** Stable key (store SKU on mobile, falls back to packageId) */
  key: string;
  packageId: number;
  tier: PlanTier;
  duration: number;
  title: string;
  /** Localized store price (e.g. "$4.99") — preferred CTA price */
  storePrice: string | null;
  /** Backend list price (e.g. "₹4799") — shown as secondary info */
  backendPriceLabel: string | null;
  discount: number;
  badge: PlanBadge;
  /** PlanInfo from useIap — needed for requestPurchase() */
  iapPlan: PlanInfo | null;
}

const buildDisplayPlans = (
  iapPlans: PlanInfo[],
  backendPackages: BackendPackage[],
  activeTier: PlanTier,
): DisplayPlan[] => {
  if (backendPackages.length === 0) {
    // Fallback — use IAP-only data (no backend hydrate yet)
    return iapPlans
      .filter((p) => p.tier === activeTier)
      .map((p) => ({
        key: p.sku,
        packageId: 0,
        tier: p.tier,
        duration: p.duration,
        title: `${p.tier} ${p.duration}-Month`,
        storePrice: p.localizedPrice,
        backendPriceLabel: null,
        discount: 0,
        badge: p.tag,
        iapPlan: p,
      }));
  }

  return backendPackages
    .filter((pkg) => (activeTier === 'Gold' ? pkg.is_gold === 1 : pkg.is_gold === 0))
    .sort((a, b) => a.duration - b.duration)
    .map<DisplayPlan>((pkg) => {
      const sku =
        Platform.OS === 'ios' ? pkg.meta?.iosSku : pkg.meta?.androidSku;
      const iapPlan = sku ? iapPlans.find((p) => p.sku === sku) : undefined;

      return {
        key: sku ?? `pkg-${pkg.id}`,
        packageId: pkg.id,
        tier: pkg.is_gold === 1 ? 'Gold' : 'Silver',
        duration: pkg.duration,
        title: pkg.title,
        storePrice: iapPlan?.localizedPrice ?? null,
        backendPriceLabel: `${pkg.currencySymbol}${pkg.price}`,
        discount: pkg.discount ?? 0,
        badge: deriveBadge(pkg.discount, pkg.new === 'YES'),
        iapPlan: iapPlan ?? null,
      };
    });
};

// ── Feature comparison — driven from backend plan flags ──────────────────────

interface FeatureRow {
  label: string;
  silver: boolean;
  gold: boolean;
}

const buildFeatureMatrix = (packages: BackendPackage[]): FeatureRow[] => {
  // Pick a representative plan per tier (any duration works; flags don't vary by duration).
  const silver = packages.find((p) => p.is_gold === 0);
  const gold = packages.find((p) => p.is_gold === 1);

  // Conservative fallback if either tier is missing in the response
  const has = (pkg: BackendPackage | undefined, key: keyof BackendPackage): boolean => {
    if (!pkg) return false;
    return Number(pkg[key] ?? 0) === 1;
  };

  return [
    { label: 'Unlimited AI scoring for all question types', silver: true, gold: true },
    { label: 'Full access to exam questions', silver: true, gold: true },
    { label: 'Latest templates & prediction files', silver: true, gold: true },
    { label: 'Unlimited sectional mock tests with scoring', silver: true, gold: true },
    { label: 'Unlimited full mock tests with scoring', silver: true, gold: true },
    { label: 'Question strategy library', silver: has(silver, 'is_que_str'), gold: has(gold, 'is_que_str') },
    { label: 'Full access to detailed video course', silver: has(silver, 'is_video'), gold: has(gold, 'is_video') },
    { label: 'VIP Videos — exclusive advanced content', silver: false, gold: true },
  ];
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    plans: iapPlans,
    isPurchasing,
    isRestoring,
    isLoadingPrices,
    connectionReady,
    requestProductSubscription,
    restorePurchases,
  } = useIap();
  const {
    packages: backendPackages,
    loading: loadingPackages,
    refreshing: refreshingPackages,
    refresh: refreshPackages,
    country,
  } = useSubscriptionPackages();
  const { dashboardData, loadDashboardData } = useDashboardData();

  const [activeTier, setActiveTier] = useState<PlanTier>('Gold');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Current backend subscription (assigned by tutor / Stripe / Razorpay / store) ──
  const activeBackendSub = useMemo(() => {
    const subs =
      dashboardData?.active_subscription
      ?? dashboardData?.user?.active_subscription
      ?? [];
    return Array.isArray(subs) && subs.length > 0 ? subs[0] : null;
  }, [dashboardData]);

  const currentTier = activeBackendSub ? getTierFromBackendSub(activeBackendSub) : null;
  const currentPlanTitle: string = activeBackendSub?.plan?.title?.toString() || '';
  const daysRemaining = activeBackendSub ? getDaysRemaining(activeBackendSub.expiry_date) : 0;
  const isAssignedByAdmin = Boolean(activeBackendSub?.assigned_by) && activeBackendSub?.stripe_subscription_id === 'backend_subscription';

  // ── Plan list for the active tier ──
  const displayPlans = useMemo(
    () => buildDisplayPlans(iapPlans, backendPackages, activeTier),
    [iapPlans, backendPackages, activeTier],
  );

  const featureMatrix = useMemo(
    () => buildFeatureMatrix(backendPackages),
    [backendPackages],
  );

  // Auto-select best seller when tier or list changes
  useEffect(() => {
    if (displayPlans.length === 0) return;
    if (selectedKey && displayPlans.some((p) => p.key === selectedKey)) return;
    const bestSeller =
      displayPlans.find((p) => p.badge === 'BEST SELLER') ?? displayPlans[0];
    setSelectedKey(bestSeller?.key ?? null);
  }, [displayPlans, selectedKey]);

  const selectedPlan = displayPlans.find((p) => p.key === selectedKey) ?? null;

  const handleTierChange = (tier: PlanTier) => {
    setActiveTier(tier);
    setSelectedKey(null); // Force reselection of best seller in the new tier
  };

  const handleBuyNow = () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
      return;
    }
    if (!selectedPlan.iapPlan) {
      Alert.alert(
        'Unavailable in App',
        'This plan is only available on the web. Please visit languageacademy.com.au to subscribe.',
      );
      return;
    }
    if (!connectionReady) {
      Alert.alert('Not Ready', 'Store connection not established. Please wait a moment and try again.');
      return;
    }

    const priceLabel = selectedPlan.storePrice ?? selectedPlan.backendPriceLabel ?? '';
    Alert.alert(
      `Subscribe to ${selectedPlan.tier}`,
      `You are about to subscribe to the ${selectedPlan.tier} ${selectedPlan.duration}-Month plan${priceLabel ? ` for ${priceLabel}` : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => requestProductSubscription(selectedPlan.iapPlan!),
        },
      ],
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'This will restore your previous subscription if it is still active.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: restorePurchases },
      ],
    );
  };

  const handleManageSubscription = () => {
    // Deep-link to the platform subscription management page
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open', 'Please open the store app manually to manage your subscription.');
    });
  };

  const handleRefresh = async () => {
    await Promise.all([
      refreshPackages(),
      loadDashboardData(true),
    ]);
  };

  const isLoading = isPurchasing || isRestoring;
  const showSkeleton = loadingPackages || (isLoadingPrices && displayPlans.length === 0);

  return (
    <View style={styles.container}>
      <SubHeader title="Subscription" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingPackages}
            onRefresh={handleRefresh}
            tintColor="#94C23C"
          />
        }
      >

        {/* ── Current Plan Hero (only when a backend subscription is active) ── */}
        {activeBackendSub && currentTier && (
          <View
            style={[
              styles.currentPlanCard,
              currentTier === 'Gold' ? styles.currentPlanGold : styles.currentPlanSilver,
            ]}
          >
            <View style={styles.currentPlanHeader}>
              <Text style={styles.currentPlanEmoji}>{currentTier === 'Gold' ? '🥇' : '🥈'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentPlanLabel}>YOUR CURRENT PLAN</Text>
                <Text style={styles.currentPlanTitle}>{currentPlanTitle || `${currentTier} Member`}</Text>
              </View>
              {activeBackendSub.is_canceled === 1 && (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                </View>
              )}
            </View>

            <View style={styles.currentPlanStats}>
              <View style={styles.currentPlanStat}>
                <Text style={styles.currentPlanStatLabel}>Expires in</Text>
                <Text style={styles.currentPlanStatValue}>
                  {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : 'Expired'}
                </Text>
              </View>
              <View style={styles.currentPlanDivider} />
              <View style={styles.currentPlanStat}>
                <Text style={styles.currentPlanStatLabel}>Renews</Text>
                <Text style={styles.currentPlanStatValue}>
                  {activeBackendSub.is_recurring_plan === 1 ? 'Auto' : 'Manual'}
                </Text>
              </View>
              <View style={styles.currentPlanDivider} />
              <View style={styles.currentPlanStat}>
                <Text style={styles.currentPlanStatLabel}>{Platform.OS === 'ios' ? 'Apple ID' : 'Source'}</Text>
                <Text style={styles.currentPlanStatValue}>
                  {isAssignedByAdmin ? 'Tutor' : activeBackendSub.is_recurring_plan === 1 ? 'Store' : 'Web'}
                </Text>
              </View>
            </View>

            {activeBackendSub.expiry_date && (
              <Text style={styles.currentPlanExpiryText}>
                Access until {activeBackendSub.expiry_date}
              </Text>
            )}

            {!isAssignedByAdmin && activeBackendSub.is_recurring_plan === 1 && (
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={handleManageSubscription}
                activeOpacity={0.8}
              >
                <Text style={styles.manageBtnText}>Manage / Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Hero Banner ── */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>
            {activeBackendSub ? 'Explore Other Plans' : 'Unlock Your Full Potential'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {activeBackendSub
              ? 'Switch tier or duration anytime. Your current access stays until expiry.'
              : 'Get unlimited access to all practice tools, mock tests, and premium content'}
          </Text>
          {country ? (
            <Text style={styles.heroCountryText}>Pricing shown for {country}</Text>
          ) : null}
        </View>

        {/* ── Gold vs Silver Switch ── */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[styles.switchOption, activeTier === 'Gold' && styles.switchOptionActiveGold]}
            onPress={() => handleTierChange('Gold')}
            activeOpacity={0.8}
          >
            <Text style={styles.switchEmoji}>🥇</Text>
            <Text style={[styles.switchText, activeTier === 'Gold' && styles.switchTextActive]}>
              Gold
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchOption, activeTier === 'Silver' && styles.switchOptionActiveSilver]}
            onPress={() => handleTierChange('Silver')}
            activeOpacity={0.8}
          >
            <Text style={styles.switchEmoji}>🥈</Text>
            <Text style={[styles.switchText, activeTier === 'Silver' && styles.switchTextActive]}>
              Silver
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Plan Cards ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plansContainer}
        >
          {showSkeleton
            ? <SubscriptionSkeleton count={3} />
            : displayPlans.map((plan) => {
                const isSelected = selectedKey === plan.key;
                const isCurrentPlan =
                  activeBackendSub?.package_id === plan.packageId
                  || (currentTier === plan.tier
                      && Number(activeBackendSub?.plan?.duration ?? -1) === plan.duration);
                return (
                  <TouchableOpacity
                    key={plan.key}
                    style={[
                      styles.planCard,
                      isSelected && (activeTier === 'Gold' ? styles.goldSelected : styles.silverSelected),
                    ]}
                    onPress={() => setSelectedKey(plan.key)}
                    activeOpacity={0.8}
                  >
                    {plan.badge && (
                      <View
                        style={[
                          styles.tagBadge,
                          plan.badge === 'MOST SAVINGS' ? styles.savingsTag :
                          plan.badge === 'BEST SELLER' ? styles.bestSellerTag : styles.newTag,
                        ]}
                      >
                        <Text style={styles.tagText}>
                          {plan.badge}{plan.discount > 0 ? ` · ${plan.discount}% OFF` : ''}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.planDuration}>
                      {plan.duration} {plan.duration === 1 ? 'Month' : 'Months'}
                    </Text>
                    <Text style={styles.planPrice}>
                      {plan.storePrice ?? plan.backendPriceLabel ?? '—'}
                    </Text>
                    {plan.storePrice && plan.backendPriceLabel && (
                      <Text style={styles.planSecondaryPrice}>Web: {plan.backendPriceLabel}</Text>
                    )}
                    <Text style={styles.planRenew}>
                      {plan.duration === 1 ? 'Auto-renews monthly' : `One-time, ${plan.duration} months`}
                    </Text>
                    {isCurrentPlan && (
                      <View style={styles.currentPlanChip}>
                        <Text style={styles.currentPlanChipText}>CURRENT</Text>
                      </View>
                    )}
                    {isSelected && !isCurrentPlan && (
                      <View style={styles.selectedDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
        </ScrollView>

        {/* ── Feature Comparison ── */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's Included</Text>

          <View style={styles.featureHeaderRow}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.featureColHeader, { color: '#8E8E93' }]}>🥈 Silver</Text>
            <Text style={[styles.featureColHeader, { color: '#1C1F2A' }]}>🥇 Gold</Text>
          </View>

          {featureMatrix.map((feature, idx) => (
            <View key={idx} style={[styles.featureRow, idx % 2 === 0 && styles.featureRowAlt]}>
              <Text style={styles.featureLabel} numberOfLines={2}>{feature.label}</Text>
              <View style={styles.featureCheck}>
                {feature.silver ? <CheckIcon size={scale(14)} /> : <CloseIcon size={scale(14)} color="#C7C7CC" />}
              </View>
              <View style={styles.featureCheck}>
                {feature.gold ? <CheckIcon size={scale(14)} /> : <CloseIcon size={scale(14)} color="#C7C7CC" />}
              </View>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.buyNowBtn, isLoading && styles.buyNowBtnDisabled]}
            onPress={handleBuyNow}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buyNowText}>
                {selectedPlan
                  ? `Buy ${selectedPlan.tier} — ${selectedPlan.storePrice ?? selectedPlan.backendPriceLabel ?? '...'}`
                  : 'Select a Plan'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#8E8E93" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Subscription renews automatically. Cancel anytime from your device's store settings.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: scale(40),
  },
  // ── Current Plan Hero ──
  currentPlanCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1.5,
  },
  currentPlanGold: {
    backgroundColor: '#FFF9EC',
    borderColor: '#FFB300',
  },
  currentPlanSilver: {
    backgroundColor: '#F3FBF0',
    borderColor: '#94C23C',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  currentPlanEmoji: {
    fontSize: scale(28),
    marginRight: scale(12),
  },
  currentPlanLabel: {
    fontSize: scale(9),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginBottom: scale(2),
  },
  currentPlanTitle: {
    fontSize: scale(16),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  cancelledBadge: {
    backgroundColor: '#FFE5E5',
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  cancelledBadgeText: {
    fontSize: scale(9),
    color: '#FF3B30',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  currentPlanStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(8),
  },
  currentPlanStat: {
    flex: 1,
    alignItems: 'center',
  },
  currentPlanStatLabel: {
    fontSize: scale(9.5),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(2),
  },
  currentPlanStatValue: {
    fontSize: scale(12),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  currentPlanDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#EAECEF',
  },
  currentPlanExpiryText: {
    marginTop: scale(8),
    fontSize: scale(10),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
  },
  manageBtn: {
    marginTop: scale(12),
    backgroundColor: '#1C1F2A',
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: 'center',
  },
  manageBtnText: {
    fontSize: scale(12),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  // ── Hero ──
  heroBanner: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(8),
  },
  heroTitle: {
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(6),
  },
  heroSubtitle: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    lineHeight: scale(18),
  },
  heroCountryText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#94C23C',
    marginTop: scale(4),
  },
  // ── Tier Switch ──
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAECEF',
    borderRadius: scale(25),
    padding: scale(4),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(4),
  },
  switchOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(21),
    gap: scale(6),
  },
  switchOptionActiveGold: { backgroundColor: '#1C1F2A' },
  switchOptionActiveSilver: { backgroundColor: '#94C23C' },
  switchEmoji: { fontSize: scale(14) },
  switchText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  switchTextActive: { color: '#FFFFFF' },
  // ── Plan Cards ──
  plansContainer: {
    paddingLeft: scale(16),
    paddingRight: scale(8),
    paddingVertical: scale(16),
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginRight: scale(10),
    width: scale(150),
    borderWidth: 1.5,
    borderColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: scale(140),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  goldSelected: {
    borderColor: '#1C1F2A',
    borderWidth: 2,
    backgroundColor: '#FAFBFC',
  },
  silverSelected: {
    borderColor: '#94C23C',
    borderWidth: 2,
    backgroundColor: '#FAFBFC',
  },
  selectedDot: {
    position: 'absolute',
    bottom: scale(8),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#94C23C',
  },
  currentPlanChip: {
    position: 'absolute',
    bottom: scale(6),
    backgroundColor: '#34C759',
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
  },
  currentPlanChipText: {
    fontSize: scale(8),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  tagBadge: {
    position: 'absolute',
    top: scale(-10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(12),
    zIndex: 1,
  },
  bestSellerTag: {
    backgroundColor: '#FFF0E5',
    borderColor: '#FF9500',
    borderWidth: 0.5,
  },
  savingsTag: {
    backgroundColor: '#E5F1FF',
    borderColor: '#007AFF',
    borderWidth: 0.5,
  },
  newTag: {
    backgroundColor: '#F3FBF0',
    borderColor: '#94C23C',
    borderWidth: 0.5,
  },
  tagText: {
    fontSize: scale(7.5),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  planDuration: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
    textAlign: 'center',
  },
  planPrice: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
    textAlign: 'center',
  },
  planSecondaryPrice: {
    fontSize: scale(9),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(2),
    textAlign: 'center',
  },
  planRenew: {
    fontSize: scale(8.5),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
  },
  // ── Features ──
  featuresSection: {
    paddingHorizontal: scale(16),
    marginTop: scale(8),
  },
  featuresTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(12),
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    marginBottom: scale(4),
  },
  featureColHeader: {
    width: scale(56),
    textAlign: 'center',
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  featureRowAlt: {
    backgroundColor: '#F8F9FC',
  },
  featureLabel: {
    flex: 1,
    fontSize: scale(11.5),
    color: '#4F5E7B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(16),
    marginRight: scale(4),
  },
  featureCheck: {
    width: scale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Actions ──
  actionContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(24),
  },
  buyNowBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(14),
    paddingVertical: scale(15),
    alignItems: 'center',
    shadowColor: '#94C23C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowBtnDisabled: {
    opacity: 0.6,
  },
  buyNowText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  restoreBtn: {
    marginTop: scale(14),
    alignItems: 'center',
    paddingVertical: scale(6),
  },
  restoreText: {
    fontSize: scale(12),
    color: '#8E8E93',
    textDecorationLine: 'underline',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  legalText: {
    fontSize: scale(10),
    color: '#C7C7CC',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginTop: scale(16),
    lineHeight: scale(14),
  },
});
