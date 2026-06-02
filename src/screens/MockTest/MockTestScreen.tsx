import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
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
import { useFocusEffect } from '@react-navigation/native';
import { usePendingMocks } from './MockTestRunner/hooks/usePendingMocks';
import type { PendingMock } from './MockTestRunner/types';
import { usePastMocks } from './MockTestResult/hooks/usePastMocks';
import type { PastMock } from './MockTestResult/types';
import { describeScoreBand } from './MockTestResult/helpers';
import { useRecoveryMocks } from './hooks/useRecoveryMocks';
import { RecoveryBanner } from './components/RecoveryBanner';

type ToggleKind = 'Mock Test' | 'Extensive Mock Test';
type CategoryKind = 'Speaking' | 'Writing' | 'Reading' | 'Listening' | 'Full Mock';
type FilterType = 'Test' | 'Pending Test' | 'Result';

const FilterIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#1C1F2A',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14H7M9 8H15M17 12H23"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('Test');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Pending tests (saved-and-exited attempts) — surfaced as an "In
  // Progress" rail above the toggle so the user has one obvious
  // place to resume from, regardless of which Mock/Extensive tab
  // they're currently filtered on.
  const pendingQuery = usePendingMocks();
  const pastQuery = usePastMocks();
  // Phase 2.3 — App-level cross-restart recovery surface. Lists
  // every mockId with persisted failed submissions from previous
  // sessions and offers a one-tap retry without re-opening the
  // runner. Empty when there's nothing to recover.
  const recovery = useRecoveryMocks();

  // Re-probe AsyncStorage whenever the screen comes into focus. The
  // user might have just finished a recovery in the runner (banner
  // there → tap Retry → success → storage cleared) and we want the
  // app-level banner to reflect that without forcing a pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      recovery.refetch();
    }, [recovery]),
  );

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



  const onRefresh = useCallback(() => {
    fetchMocks(isExtensive, true);
    // Pull-to-refresh should also re-check pending + past + recovery
    // state so newly saved / completed / recovered attempts surface
    // immediately, not after staleTime. All independent — kick them
    // in parallel.
    pendingQuery.refetch();
    pastQuery.refetch();
    recovery.refetch();
  }, [fetchMocks, isExtensive, pendingQuery, pastQuery, recovery]);

  // Resume tap → bypass the prereq carousel entirely. The user has
  // already cleared headset/mic/keyboard checks for this attempt, so
  // walking them through again would be friction. Jump straight into
  // the runner with the pending state populated.
  const handleResume = useCallback(
    (pending: PendingMock) => {
      navigation.navigate('MockTestRunner', {
        mockId: pending.mockId,
        variant: pending.variant,
        category: pending.category,
        title: pending.title,
        resume: {
          startQuestionIndex: pending.startQuestionIndex,
          remainingSecondsTotal: pending.remainingSecondsTotal,
        },
      });
    },
    [navigation],
  );

  // Past-result tap → MockTestResult. We deliberately re-hit the
  // detail endpoint instead of trying to thread the full payload
  // through route params: the rail entry only has a slim summary,
  // and the result screen's React Query cache makes the round-trip
  // free on second view (5min staleTime).
  const handleViewPast = useCallback(
    (past: PastMock) => {
      navigation.navigate('MockTestResult', {
        mockId: past.mockId,
        variant: past.variant,
        category: past.category,
        title: past.title,
      });
    },
    [navigation],
  );

  // Progress dashboard discovery — anchored to the Completed rail
  // header rather than its own tab so it stays a "secondary" surface
  // that doesn't compete with the main "take a mock" CTA flow.
  const handleViewProgress = useCallback(() => {
    navigation.navigate('MockTestProgress');
  }, [navigation]);

  // Phase 5.1 — paginated history. Same discovery surface as
  // Progress; they're complementary ("analytical view" vs
  // "searchable list"). Surfaced only when the rail's 12-card cap
  // hides at least one mock — otherwise the user can already see
  // everything they have.
  const handleViewAllHistory = useCallback(() => {
    navigation.navigate('MockTestHistory');
  }, [navigation]);

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

  const filteredPendingTests = useMemo(() => {
    const isExtensive = activeToggle === 'Extensive Mock Test';
    const targetVariant = isExtensive ? 'extensive' : 'full';
    return pendingQuery.pendingMocks.filter(
      (item) =>
        item.variant === targetVariant &&
        item.category === selectedCategory,
    );
  }, [pendingQuery.pendingMocks, activeToggle, selectedCategory]);

  const filteredPastTests = useMemo(() => {
    const isExtensive = activeToggle === 'Extensive Mock Test';
    const targetVariant = isExtensive ? 'extensive' : 'full';
    return pastQuery.pastMocks.filter(
      (item) =>
        item.variant === targetVariant &&
        item.category === selectedCategory,
    );
  }, [pastQuery.pastMocks, activeToggle, selectedCategory]);



  const handleStart = useCallback((item: MockTestItem) => {
    if (item.locked) {
      showToast('This mock is locked. Subscribe to unlock.', 'info');
      return;
    }
    if (item.id === undefined) {
      // Defensive — `locked` already covers this, but the runner needs
      // a real id to fetch questions, so we double-guard before nav.
      showToast('This mock is missing its id — please refresh.', 'error');
      return;
    }
    // Route through the pre-requisite carousel (headset / mic / module
    // intro) before mounting the runner. The prereq screen pre-fetches
    // the mock detail via `useMockSession` so the runner reads from
    // the React Query cache on mount and skips the round-trip.
    navigation.navigate('MockTestPrerequisite', {
      mockId: item.id,
      variant: isExtensive ? 'extensive' : 'full',
      category: selectedCategory,
      title: item.title,
    });
  }, [navigation, isExtensive, selectedCategory, showToast]);

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
        {/* --- Unsent Answers Recovery (Phase 2.3) ---
            Surfaced ABOVE the In Progress rail because data-loss
            recovery is higher-priority than session-resume: an
            unsent answer is invisible to the user until they retry.
            Self-hides when there's nothing persisted. */}
        <RecoveryBanner
          persistedMocks={recovery.persistedMocks}
          retryingMockId={recovery.retryingMockId}
          onRetryMock={recovery.retryMock}
        />

        {/* --- Toggle & Filter Row --- */}
        <View style={styles.toggleWrapper}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonShort,
                activeToggle === 'Mock Test' && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveToggle('Mock Test')}
            >
              <Text
                numberOfLines={1}
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
                styles.toggleButtonLong,
                activeToggle === 'Extensive Mock Test' && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveToggle('Extensive Mock Test')}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.toggleButtonText,
                  activeToggle === 'Extensive Mock Test' && styles.toggleButtonTextActive,
                ]}
              >
                Extensive Mock Test
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setFilterModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Filter mock tests"
          >
            <FilterIcon size={scale(20)} color="#1C1F2A" />
            {selectedFilter !== 'Test' && (
              <View style={styles.filterActiveDot} />
            )}
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

        {/* --- Sub-header for Results (Completed Mocks info) --- */}
        {selectedFilter === 'Result' && pastQuery.pastMocks.length > 0 && (
          <View style={styles.resultsListHeader}>
            <Text style={styles.resultsCountText}>
              Completed ({filteredPastTests.length})
            </Text>
            <View style={styles.resultsHeaderActions}>
              {pastQuery.pastMocks.length > 12 && (
                <TouchableOpacity
                  onPress={handleViewAllHistory}
                  style={styles.resultsHeaderBtn}
                  accessibilityRole="button"
                  accessibilityLabel="See all mock tests"
                >
                  <Text style={styles.resultsHeaderBtnText}>
                    All ({pastQuery.pastMocks.length}) ›
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleViewProgress}
                style={styles.resultsHeaderBtn}
                accessibilityRole="button"
                accessibilityLabel="View progress dashboard"
              >
                <Text style={styles.resultsHeaderBtnText}>
                  Progress ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- Results Cards List --- */}
        <View style={styles.cardList}>
          {(loading && !refreshing && !currentCache) ? (
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
          ) : (
            selectedFilter === 'Pending Test'
              ? filteredPendingTests.length === 0
              : selectedFilter === 'Result'
              ? filteredPastTests.length === 0
              : filteredTests.length === 0
          ) ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>
                {selectedFilter === 'Pending Test'
                  ? `No pending ${selectedCategory} ${activeToggle.toLowerCase()}s.`
                  : selectedFilter === 'Result'
                  ? `No results for ${selectedCategory} ${activeToggle.toLowerCase()}s.`
                  : `No ${selectedCategory} ${activeToggle.toLowerCase()}s available.`}
              </Text>
            </View>
          ) : selectedFilter === 'Pending Test' ? (
            filteredPendingTests.map((test) => (
              <PendingTestCard
                key={`${test.variant}-${test.mockId}`}
                test={test}
                handleResume={handleResume}
              />
            ))
          ) : selectedFilter === 'Result' ? (
            filteredPastTests.map((test) => (
              <PastResultCard
                key={`${test.variant}-${test.mockId}`}
                test={test}
                handleViewPast={handleViewPast}
              />
            ))
          ) : (
            filteredTests.map((test) => (
              <MockTestCard
                key={test.syntheticKey}
                test={test}
                handleStart={handleStart}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* --- Filter Bottom Sheet Modal --- */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {/* Modal Drag Handle indicator */}
            <View style={styles.modalDragHandle} />
            
            <Text style={styles.modalTitle}>Filter Mocks</Text>
            
            <View style={styles.modalOptionsContainer}>
              {[
                {
                  id: 'Test' as FilterType,
                  title: 'Available Tests',
                  subtitle: 'Take a new practice mock test',
                  iconColor: '#3B82F6',
                  icon: (color: string) => (
                    <Svg width={scale(20)} height={scale(20)} viewBox="0 0 24 24" fill="none">
                      <Path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </Svg>
                  )
                },
                {
                  id: 'Pending Test' as FilterType,
                  title: 'In Progress',
                  subtitle: 'Resume your incomplete test attempts',
                  iconColor: '#F59E0B',
                  icon: (color: string) => (
                    <Svg width={scale(20)} height={scale(20)} viewBox="0 0 24 24" fill="none">
                      <Path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </Svg>
                  )
                },
                {
                  id: 'Result' as FilterType,
                  title: 'Completed Results',
                  subtitle: 'Check scores, analysis, and feedback',
                  iconColor: '#10B981',
                  icon: (color: string) => (
                    <Svg width={scale(20)} height={scale(20)} viewBox="0 0 24 24" fill="none">
                      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </Svg>
                  )
                }
              ].map((opt) => {
                const isSelected = selectedFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedFilter(opt.id);
                      setFilterModalVisible(false);
                    }}
                  >
                    <View style={[styles.modalOptionIconBg, { backgroundColor: isSelected ? opt.iconColor : '#F3F4F6' }]}>
                      {opt.icon(isSelected ? '#FFFFFF' : '#4B5563')}
                    </View>
                    <View style={styles.modalOptionTextContainer}>
                      <Text style={[styles.modalOptionTitle, isSelected && styles.modalOptionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.modalOptionSubtitle}>
                        {opt.subtitle}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedCheckCircle, { backgroundColor: opt.iconColor }]}>
                        <Svg width={scale(10)} height={scale(10)} viewBox="0 0 24 24" fill="none">
                          <Path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ── Optimized & Memoized Card Components ───────────────────────────

interface MockTestCardProps {
  test: MockTestItem;
  handleStart: (item: MockTestItem) => void;
}

// "Available Tests" card — purely for *starting* a fresh attempt. Result
// actions (Feedback / Score / Analysis / View) belonged here previously
// but they applied to every card regardless of whether the user had
// actually attempted the mock, and their handler was a stub
// (`showToast('${action} loaded…')` with a TODO). The proper destinations
// for completed mocks live on the "Result" filter, which renders
// `PastResultCard` with a working "View Detailed Result" CTA into the
// MockTestResult screen. Keeping this card free of pseudo-actions
// removes the UX confusion and the dead code.
const MockTestCard = React.memo<MockTestCardProps>(({
  test,
  handleStart,
}) => {
  return (
    <View
      style={[styles.card, test.locked && styles.cardLocked]}
    >
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
    </View>
  );
});

interface PendingTestCardProps {
  test: PendingMock;
  handleResume: (pending: PendingMock) => void;
}

const PendingTestCard = React.memo<PendingTestCardProps>(({
  test,
  handleResume,
}) => {
  const minsLeft = Math.round(test.remainingSecondsTotal / 60);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {test.title}
        </Text>
        <View style={styles.inProgressTag}>
          <Text style={styles.inProgressTagText}>In Progress</Text>
        </View>
      </View>

      <View style={styles.cardMetaContainer}>
        <Text style={styles.cardMetaText}>
          {test.variant === 'extensive' ? 'Extensive' : 'Mock'} · {test.category}
        </Text>
        <Text style={styles.cardMetaTextSecondary}>
          {test.totalQuestions !== undefined
            ? `Q${test.startQuestionIndex + 1} of ${test.totalQuestions}`
            : `Q${test.startQuestionIndex + 1}`}
          {minsLeft > 0 ? ` · ${minsLeft} min left` : ''}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => handleResume(test)}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${test.title}`}
      >
        <Text style={styles.startButtonText}>Resume Test</Text>
      </TouchableOpacity>
    </View>
  );
});

interface PastResultCardProps {
  test: PastMock;
  handleViewPast: (past: PastMock) => void;
}

const PastResultCard = React.memo<PastResultCardProps>(({
  test,
  handleViewPast,
}) => {
  const variantTag = test.variant === 'extensive' ? 'Extensive' : 'Mock';
  const dateLabel = useMemo(() => {
    if (!test.submittedAtIso) return '';
    try {
      const d = new Date(test.submittedAtIso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [test.submittedAtIso]);
  const isPending = test.overall == null;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleViewPast(test)}
      accessibilityRole="button"
      accessibilityLabel={
        isPending
          ? `View ${test.title} — result pending`
          : `View ${test.title} — score ${test.overall} out of 90`
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {test.title}
        </Text>
        <View style={[styles.pastResultsTag, { backgroundColor: isPending ? '#EEF2FF' : '#ECFDF5' }]}>
          <Text style={[styles.pastResultsTagText, { color: isPending ? '#1A2151' : '#065F46' }]}>
            {isPending ? 'Pending' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.resultScoreContainer}>
        <View style={styles.pastResultsScoreRow}>
          <Text
            style={[
              styles.pastResultsScoreValue,
              isPending && styles.pastResultsScorePending,
            ]}
          >
            {isPending ? 'Pending' : test.overall}
          </Text>
          {!isPending && (
            <Text style={styles.pastResultsScoreMax}> /90</Text>
          )}
        </View>
        
        <View style={styles.resultMetaColumn}>
          <Text style={styles.resultMetaText}>
            {variantTag} · {test.category}
          </Text>
          <Text style={styles.cardMeta}>
            {[describeScoreBand(test.overall), dateLabel]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      <View style={[styles.startButton, { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 0 }]}>
        <Text style={[styles.startButtonText, { color: '#1A2151' }]}>
          View Detailed Result
        </Text>
      </View>
    </TouchableOpacity>
  );
});

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
  // ── In Progress rail (resumable saved attempts) ──────────────────
  inProgressSection: {
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  inProgressHeader: {
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
  },
  inProgressTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  inProgressSubtitle: {
    marginTop: scale(2),
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  inProgressScroll: {
    paddingHorizontal: scale(16),
    gap: scale(10),
  },
  // Compact horizontal card — narrower than the main mock cards so a
  // few fit in the rail without the user having to scroll forever.
  // 240–260 dp range matches PTE's "continue your attempt" cards in
  // the reference iOS app.
  inProgressCard: {
    width: scale(240),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  inProgressTagRow: {
    flexDirection: 'row',
    marginBottom: scale(8),
  },
  inProgressTag: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    backgroundColor: '#EEF2FF',
  },
  inProgressTagText: {
    fontSize: scale(10),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  inProgressCardTitle: {
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  inProgressCardMeta: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(10),
  },
  inProgressResumeBtn: {
    backgroundColor: '#1A2151',
    borderRadius: scale(10),
    paddingVertical: scale(8),
    alignItems: 'center',
  },
  inProgressResumeBtnText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Completed Tests rail (Phase 5.0) ─────────────────────────────
  // Parallel structure to the In Progress rail above. Slightly
  // tighter top margin since it usually sits between In Progress
  // and the toggle — keeps the vertical rhythm balanced when both
  // rails are visible.
  pastResultsSection: {
    marginTop: scale(8),
    marginBottom: scale(8),
  },
  pastResultsHeader: {
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pastResultsHeaderTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  pastResultsTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  // Subtle CTA — looks like a tappable label, not a primary button.
  // We don't want it stealing emphasis from the "take a new mock"
  // tiles which remain the screen's primary action.
  pastResultsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastResultsProgressBtn: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    backgroundColor: '#EEF2FF',
    marginLeft: scale(8),
  },
  pastResultsProgressBtnText: {
    fontSize: scale(11),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  pastResultsSubtitle: {
    marginTop: scale(2),
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  pastResultsScroll: {
    paddingHorizontal: scale(16),
    gap: scale(10),
  },
  // Same footprint as the In Progress card — keeps the rails
  // visually consistent so they read as a paired UI rather than
  // two competing surfaces. Distinctive enough via the score
  // number (which In Progress lacks) to avoid confusion.
  pastResultsCard: {
    width: scale(240),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  pastResultsTagRow: {
    flexDirection: 'row',
    marginBottom: scale(8),
  },
  pastResultsTag: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    // Slightly different tint from In Progress so the rails are
    // distinguishable at a glance (mint-green for results,
    // indigo for in-progress).
    backgroundColor: '#ECFDF5',
  },
  pastResultsTagText: {
    fontSize: scale(10),
    color: '#065F46',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  pastResultsCardTitle: {
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  // The big score number is the rail's signature element — anchors
  // the user's eye and gives the card its emotional payload (good
  // band → big green-ish number).
  pastResultsScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: scale(2),
  },
  pastResultsScoreValue: {
    fontSize: scale(24),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  pastResultsScoreMax: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  pastResultsScorePending: {
    fontSize: scale(16),
    color: '#9CA3AF',
  },
  pastResultsCardMeta: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  toggleContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: scale(22),
    padding: scale(4),
  },
  filterIconButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(12),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterActiveDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#EF4444',
  },
  resultsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
  },
  resultsCountText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  resultsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsHeaderBtn: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    backgroundColor: '#EEF2FF',
    marginLeft: scale(8),
  },
  resultsHeaderBtnText: {
    fontSize: scale(11),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  cardMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cardMetaText: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  cardMetaTextSecondary: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  resultScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  resultMetaColumn: {
    marginLeft: scale(16),
    flex: 1,
  },
  resultMetaText: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Medium',
    marginBottom: scale(2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: scale(36),
    paddingTop: scale(8),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalDragHandle: {
    width: scale(36),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(16),
  },
  modalOptionsContainer: {
    gap: scale(12),
    marginBottom: scale(20),
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(16),
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalOptionSelected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  modalOptionIconBg: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
  },
  modalOptionTitleSelected: {
    color: '#111827',
  },
  modalOptionSubtitle: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  selectedCheckCircle: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButton: {
    paddingVertical: scale(14),
    borderRadius: scale(16),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#4B5563',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  toggleButton: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(18),
  },
  // Weighted widths so both labels render at the same font size
  // without the longer "Extensive Mock Test" string getting cramped
  // or shrunk. Ratio is roughly the visual width of the two strings
  // at fontSize 13 with semibold weight.
  toggleButtonShort: {
    flex: 1,
  },
  toggleButtonLong: {
    flex: 1.7,
  },
  toggleButtonActive: {
    backgroundColor: '#1C1F2A',
  },
  toggleButtonText: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
    textAlign: 'center',
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
  // Half-opacity overlay applied while the action is mid-flight.
  // Lives in the stylesheet (not inline) so the linter's
  // no-inline-styles rule stays satisfied and the dimmed state
  // gets the same scale-aware treatment as the rest of the file.
  actionLinkTextLoading: {
    opacity: 0.5,
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
