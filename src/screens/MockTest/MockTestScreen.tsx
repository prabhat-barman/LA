import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { Header } from '../../components/organisms/Header';
import { colors } from '../../theme/colors';
import { useDashboardData } from '../../context/DashboardDataContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { MockTestSkeleton } from '../../components/atoms/Skeleton';
import { hasActiveSubscriptionFromData } from '../../utils/subscriptionMapping';

type ToggleKind = 'Mock Test' | 'Extensive Mock Test';
type CategoryKind = 'Speaking' | 'Writing' | 'Reading' | 'Listening' | 'Full Mock';

// Backend uses numeric category codes; this mirrors Data.QUESTION_TYPE_MAPPING in practiceData.ts.
const CATEGORY_TO_NUM: Record<CategoryKind, number> = {
  Speaking: 1,
  Writing: 2,
  Reading: 3,
  Listening: 4,
  'Full Mock': 5,
};

interface MockTestItem {
  id?: number | string;     // present only when test is unlocked / takeable
  syntheticKey: string;     // always unique, used as React key
  title: string;
  description?: string;
  duration?: number;        // in minutes (from `time`)
  categoryNum?: number;     // 1-5
  locked: boolean;          // type === 1 OR no real id returned
  raw: any;
}

const normalizeItem = (
  raw: any,
  index: number,
  hasActiveSub: boolean,
): MockTestItem => {
  const hasRealId = raw?.id !== undefined && raw?.id !== null;
  const categoryNum =
    typeof raw?.category === 'number'
      ? raw.category
      : Number(raw?.category) || undefined;
  const durationNum = Number(raw?.time);
  // A backend `type === 1` traditionally indicates "requires subscription".
  // If the user already has an active sub locally, trust that and unlock.
  // We still hard-lock when the backend didn't return a real id, because we
  // simply can't navigate into the test without one.
  const backendLocked = raw?.type === 1;
  const locked = !hasRealId || (backendLocked && !hasActiveSub);

  return {
    id: hasRealId ? raw.id : undefined,
    syntheticKey: hasRealId
      ? `id-${raw.id}`
      : `${categoryNum ?? 'x'}-${raw?.title ?? `idx${index}`}-${index}`,
    title: raw?.title ?? raw?.name ?? raw?.mock_name ?? 'Untitled',
    description: raw?.description ?? undefined,
    duration: Number.isFinite(durationNum) ? durationNum : undefined,
    categoryNum,
    locked,
    raw,
  };
};

const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;          // primary shape
  if (Array.isArray(data?.original?.result)) return data.original.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.mocks)) return data.mocks;
  if (Array.isArray(data?.tests)) return data.tests;
  return [];
};

const matchesCategory = (item: MockTestItem, selected: CategoryKind): boolean => {
  if (item.categoryNum === undefined) return true; // fail-open if backend omits category
  return item.categoryNum === CATEGORY_TO_NUM[selected];
};

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface MockTestScreenProps {
  dashboardData: any;
  hasNotifications: boolean;
  profileImage: string;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MockTestScreen: React.FC<Partial<MockTestScreenProps>> = (props) => {
  const contextData = useDashboardData();
  const toastContext = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dashboardData = props.dashboardData !== undefined ? props.dashboardData : contextData.dashboardData;
  const hasNotifications = props.hasNotifications !== undefined ? props.hasNotifications : contextData.hasNotifications;
  const showToast = props.showToast !== undefined ? props.showToast : toastContext.showToast;
  
  const getProfileImage = () => {
    if (props.profileImage !== undefined) return props.profileImage;
    const photoPath = dashboardData?.image || dashboardData?.user?.image;
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    }
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    const baseUrl = getPdfPath();
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `${baseUrl}${separator}${cleanPath}`;
  };
  const profileImage = getProfileImage();

  const onNotificationPress = props.onNotificationPress || (() => navigation.navigate('NotificationsList'));
  const onProfilePress = props.onProfilePress || (() => navigation.navigate('Profile'));

  const [activeToggle, setActiveToggle] = useState<ToggleKind>('Mock Test');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKind>('Speaking');

  // "Full Mock" is only available in the normal Mock Test toggle, not in Extensive.
  const categories: CategoryKind[] = useMemo(
    () =>
      activeToggle === 'Extensive Mock Test'
        ? ['Speaking', 'Writing', 'Reading', 'Listening']
        : ['Speaking', 'Writing', 'Reading', 'Listening', 'Full Mock'],
    [activeToggle],
  );

  // If the user had "Full Mock" selected and switches to Extensive, reset to Speaking.
  useEffect(() => {
    if (
      activeToggle === 'Extensive Mock Test' &&
      selectedCategory === 'Full Mock'
    ) {
      setSelectedCategory('Speaking');
    }
  }, [activeToggle, selectedCategory]);

  // Two separate caches so toggling back and forth doesn't refetch unnecessarily.
  // null = not loaded yet; [] = loaded but empty.
  const [normalCache, setNormalCache] = useState<MockTestItem[] | null>(null);
  const [extensiveCache, setExtensiveCache] = useState<MockTestItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'action-id'

  const isExtensive = activeToggle === 'Extensive Mock Test';
  const currentCache = isExtensive ? extensiveCache : normalCache;

  // Local subscription flag derived synchronously from dashboard data.
  // Used to override the backend's "needs subscription" lock when we already
  // know the user has an active plan.
  const hasActiveSub = hasActiveSubscriptionFromData(dashboardData);

  const fetchMocks = useCallback(
    async (extensive: boolean, isPullToRefresh = false) => {
      const endpoint = extensive
        ? API_ENDPOINTS.EXTENSIVE_MOCK_TEST_LIST
        : API_ENDPOINTS.MOCK_TEST_LIST;

      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await apiClient.get(endpoint);
        const list = extractList(response.data).map((raw, idx) =>
          normalizeItem(raw, idx, hasActiveSub),
        );
        if (extensive) {
          setExtensiveCache(list);
        } else {
          setNormalCache(list);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load mock tests';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, hasActiveSub],
  );

  useEffect(() => {
    // Lazy-load each toggle on first activation
    if (isExtensive && extensiveCache === null) {
      fetchMocks(true);
    } else if (!isExtensive && normalCache === null) {
      fetchMocks(false);
    }
  }, [isExtensive, extensiveCache, normalCache, fetchMocks]);

  // Phased rendering state
  const [renderPhase, setRenderPhase] = useState<1 | 2 | 3>(1);

  // Trigger rendering phases on toggle / category switch
  useEffect(() => {
    setRenderPhase(1);
    const interaction = InteractionManager.runAfterInteractions(() => {
      setRenderPhase(2);
      requestAnimationFrame(() => {
        setRenderPhase(3);
      });
    });
    return () => interaction.cancel();
  }, [activeToggle, selectedCategory]);

  const onRefresh = useCallback(() => {
    fetchMocks(isExtensive, true);
  }, [fetchMocks, isExtensive]);

  const filteredTests = useMemo(() => {
    if (!currentCache) return [];
    return currentCache
      .filter((item) => matchesCategory(item, selectedCategory))
      .map((item) => {
        // Recompute the lock at render time so a subscription update made
        // elsewhere (e.g. successful IAP or admin assignment) takes effect
        // without forcing a full re-fetch of the mocks list.
        const hasRealId = item.id !== undefined && item.id !== null;
        const backendLocked = item.raw?.type === 1;
        return {
          ...item,
          locked: !hasRealId || (backendLocked && !hasActiveSub),
        };
      });
  }, [currentCache, selectedCategory, hasActiveSub]);

  // Phase-based subset of visible tests to optimize load times
  const visibleTests = useMemo(() => {
    if (renderPhase >= 3) return filteredTests;
    return filteredTests.slice(0, 3);
  }, [filteredTests, renderPhase]);

  const handleStart = (item: MockTestItem) => {
    if (item.locked) {
      showToast('This mock is locked. Subscribe to unlock.', 'info');
      return;
    }
    // TODO: navigate to actual mock test runner once that screen exists.
    showToast(`Starting ${item.title} (id: ${item.id})`, 'success');
  };

  const handleAction = async (action: string, item: MockTestItem) => {
    if (item.locked) {
      showToast('Locked — subscribe to unlock results.', 'info');
      return;
    }
    const key = `${action}-${item.id}`;
    if (actionLoading === key) return;
    setActionLoading(key);
    try {
      let endpoint = '';
      if (action === 'Score') {
        endpoint = `${API_ENDPOINTS.MOCK_SCORE}${item.id}`;
      } else if (action === 'Analysis') {
        endpoint = `${API_ENDPOINTS.MOCK_ANALYSIS}${item.id}`;
      } else if (action === 'Feedback' || action === 'View') {
        endpoint = isExtensive
          ? `${API_ENDPOINTS.EXTENSIVE_MOCK_RESULT}`
          : `${API_ENDPOINTS.MOCK_RESULT}`;
      }
      if (endpoint) {
        const res = await apiClient.get(endpoint, {
          params: { mock_id: item.id },
        });
        // TODO: navigate to result detail screen once it exists
        showToast(`${action} loaded for ${item.title}`, 'info');
        console.log(`[MockTest] ${action} result for ${item.id}:`, res.data);
      } else {
        showToast(`${action} for ${item.title}`, 'info');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to load ${action}`;
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        hasNotifications={hasNotifications}
        profileImage={profileImage}
        onNotificationPress={onNotificationPress}
        onProfilePress={onProfilePress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* --- Mock Test Toggle Switch --- */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeToggle === 'Mock Test' && styles.toggleButtonActive,
            ]}
            onPress={() => setActiveToggle('Mock Test')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeToggle === 'Mock Test' && styles.toggleButtonTextActive,
              ]}
            >
              Mock Test
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeToggle === 'Extensive Mock Test' && styles.toggleButtonActive,
            ]}
            onPress={() => setActiveToggle('Extensive Mock Test')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeToggle === 'Extensive Mock Test' && styles.toggleButtonTextActive,
              ]}
            >
              Extensive Mock Test
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- Category Horizontal Filter Pills --- */}
        <View style={styles.categoryContainer}>
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  isActive ? styles.categoryPillActive : styles.categoryPillInactive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive ? styles.categoryPillTextActive : styles.categoryPillTextInactive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --- Results Cards List --- */}
        <View style={styles.cardList}>
          {((loading && !refreshing) || renderPhase < 2) ? (
            <MockTestSkeleton />
          ) : error ? (
            <View style={styles.stateContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchMocks(isExtensive)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTests.length === 0 ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>
                No {selectedCategory} {activeToggle.toLowerCase()}s available.
              </Text>
            </View>
          ) : (
            visibleTests.map((test) => (
              <View
                key={test.syntheticKey}
                style={[styles.card, test.locked && styles.cardLocked]}
              >
                {/* Title row with optional lock badge */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {test.title}
                  </Text>
                  {test.locked && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>Locked</Text>
                    </View>
                  )}
                </View>

                {!!test.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {test.description}
                  </Text>
                )}

                {test.duration !== undefined && (
                  <Text style={styles.cardMeta}>{test.duration} min</Text>
                )}

                {/* Primary CTA */}
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    test.locked && styles.startButtonLocked,
                  ]}
                  onPress={() => handleStart(test)}
                >
                  <Text
                    style={[
                      styles.startButtonText,
                      test.locked && styles.startButtonTextLocked,
                    ]}
                  >
                    {test.locked ? 'Unlock' : 'Start Test'}
                  </Text>
                </TouchableOpacity>

                {/* Actions Footer row — only meaningful for unlocked / attempted tests */}
                {!test.locked && renderPhase >= 3 && (
                  <View style={styles.actionsContainer}>
                    {['Feedback', 'Score', 'Analysis', 'View'].map((action) => {
                      const key = `${action}-${test.id}`;
                      const isLoading = actionLoading === key;
                      return (
                        <TouchableOpacity
                          key={action}
                          style={styles.actionLink}
                          onPress={() => handleAction(action, test)}
                          disabled={isLoading}
                        >
                          <Text style={[styles.actionLinkText, isLoading && { opacity: 0.5 }]}>
                            {isLoading ? '...' : action}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(20),
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: scale(22),
    padding: scale(4),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    borderRadius: scale(18),
  },
  toggleButtonActive: {
    backgroundColor: '#1C1F2A',
  },
  toggleButtonText: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(4),
  },
  categoryPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(2),
    borderRadius: scale(20),
    borderWidth: 1,
  },
  categoryPillActive: {
    borderColor: '#1C1F2A',
    backgroundColor: '#EAEFF8',
  },
  categoryPillInactive: {
    borderColor: '#E5E5EA',
    backgroundColor: colors.white,
  },
  categoryPillText: {
    fontSize: scale(10.5),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  categoryPillTextActive: {
    color: '#1C1F2A',
    fontWeight: 'bold',
  },
  categoryPillTextInactive: {
    color: '#8E8E93',
  },
  cardList: {
    paddingHorizontal: scale(16),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardLocked: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  cardTitle: {
    flex: 1,
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  lockBadge: {
    marginLeft: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
    backgroundColor: '#FEF3C7',
  },
  lockBadgeText: {
    fontSize: scale(10),
    color: '#92400E',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  cardDescription: {
    fontSize: scale(12),
    color: '#6B7280',
    marginBottom: scale(8),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  cardMeta: {
    fontSize: scale(12),
    color: '#8E8E93',
    marginBottom: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  startButton: {
    backgroundColor: '#1C1F2A',
    paddingVertical: scale(10),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(12),
  },
  startButtonLocked: {
    backgroundColor: '#E5E7EB',
  },
  startButtonText: {
    color: colors.white,
    fontSize: scale(13),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  startButtonTextLocked: {
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: scale(12),
  },
  actionLink: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
  },
  actionLinkText: {
    color: '#7F56D9',
    fontSize: scale(13),
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(48),
    paddingHorizontal: scale(24),
  },
  stateText: {
    marginTop: scale(12),
    fontSize: scale(13),
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  errorText: {
    fontSize: scale(13),
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: scale(16),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  retryButton: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(24),
    borderRadius: scale(20),
    backgroundColor: '#1C1F2A',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: scale(13),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
});
