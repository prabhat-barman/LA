import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
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
import { logger } from '../../services/logger';
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

  // Trigger rendering phases on toggle / category switch.
  // Double-rAF replaces the previously deprecated
  // InteractionManager.runAfterInteractions in RN 0.85+.
  useEffect(() => {
    setRenderPhase(1);
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        setRenderPhase(2);
        requestAnimationFrame(() => {
          if (cancelled) return;
          setRenderPhase(3);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeToggle, selectedCategory]);

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
        logger.log(`[MockTest] ${action} result for ${item.id}:`, res.data);
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

        {/* --- In Progress (resumable saved attempts) ---
            Hidden when there are no pending tests so the screen feels
            unchanged for users who haven't used Save & Exit yet. */}
        {pendingQuery.pendingMocks.length > 0 && (
          <View style={styles.inProgressSection}>
            <View style={styles.inProgressHeader}>
              <Text style={styles.inProgressTitle}>In Progress</Text>
              <Text style={styles.inProgressSubtitle}>
                Tap to pick up where you left off.
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.inProgressScroll}
            >
              {pendingQuery.pendingMocks.map((pending) => {
                const minsLeft = Math.round(pending.remainingSecondsTotal / 60);
                const subtitle =
                  pending.totalQuestions !== undefined
                    ? `Q${pending.startQuestionIndex + 1} of ${pending.totalQuestions}`
                    : `Q${pending.startQuestionIndex + 1}`;
                const variantTag =
                  pending.variant === 'extensive' ? 'Extensive' : 'Mock';
                return (
                  <TouchableOpacity
                    key={`${pending.variant}-${pending.mockId}`}
                    style={styles.inProgressCard}
                    onPress={() => handleResume(pending)}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume ${pending.title}`}
                  >
                    <View style={styles.inProgressTagRow}>
                      <View style={styles.inProgressTag}>
                        <Text style={styles.inProgressTagText}>
                          {variantTag} · {pending.category}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={styles.inProgressCardTitle}
                      numberOfLines={1}
                    >
                      {pending.title}
                    </Text>
                    <Text style={styles.inProgressCardMeta} numberOfLines={1}>
                      {subtitle}
                      {minsLeft > 0 ? ` · ${minsLeft} min left` : ''}
                    </Text>
                    <View style={styles.inProgressResumeBtn}>
                      <Text style={styles.inProgressResumeBtnText}>Resume</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* --- Completed Tests (results history) ---
            Mirrors the In Progress rail's shape: hidden when empty,
            horizontal scroll of compact cards, tap → MockTestResult.
            Sorted newest-first by the hook so the user's most recent
            mock is the leftmost card.
            Limited to 12 cards in the rail to keep paint snappy on
            users with deep mock histories — full history view is
            Phase 5.1. */}
        {pastQuery.pastMocks.length > 0 && (
          <View style={styles.pastResultsSection}>
            <View style={styles.pastResultsHeader}>
              <View style={styles.pastResultsHeaderTextGroup}>
                <Text style={styles.pastResultsTitle}>Completed</Text>
                <Text style={styles.pastResultsSubtitle}>
                  Your recent results. Tap to see the full breakdown.
                </Text>
              </View>
              <View style={styles.pastResultsHeaderActions}>
                {pastQuery.pastMocks.length > 12 && (
                  <TouchableOpacity
                    onPress={handleViewAllHistory}
                    style={styles.pastResultsProgressBtn}
                    accessibilityRole="button"
                    accessibilityLabel="See all mock tests"
                  >
                    <Text style={styles.pastResultsProgressBtnText}>
                      All ({pastQuery.pastMocks.length}) ›
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleViewProgress}
                  style={styles.pastResultsProgressBtn}
                  accessibilityRole="button"
                  accessibilityLabel="View progress dashboard"
                >
                  <Text style={styles.pastResultsProgressBtnText}>
                    Progress ›
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pastResultsScroll}
            >
              {pastQuery.pastMocks.slice(0, 12).map((past) => {
                const variantTag =
                  past.variant === 'extensive' ? 'Extensive' : 'Mock';
                const dateLabel = (() => {
                  if (!past.submittedAtIso) return '';
                  try {
                    const d = new Date(past.submittedAtIso);
                    return d.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });
                  } catch {
                    return '';
                  }
                })();
                const isPending = past.overall == null;
                return (
                  <TouchableOpacity
                    key={`${past.variant}-${past.mockId}`}
                    style={styles.pastResultsCard}
                    onPress={() => handleViewPast(past)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPending
                        ? `View ${past.title} — result pending`
                        : `View ${past.title} — score ${past.overall} out of 90`
                    }
                  >
                    <View style={styles.pastResultsTagRow}>
                      <View style={styles.pastResultsTag}>
                        <Text style={styles.pastResultsTagText}>
                          {variantTag} · {past.category}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={styles.pastResultsCardTitle}
                      numberOfLines={1}
                    >
                      {past.title}
                    </Text>
                    <View style={styles.pastResultsScoreRow}>
                      <Text
                        style={[
                          styles.pastResultsScoreValue,
                          isPending && styles.pastResultsScorePending,
                        ]}
                      >
                        {isPending ? 'Pending' : past.overall}
                      </Text>
                      {!isPending && (
                        <Text style={styles.pastResultsScoreMax}> /90</Text>
                      )}
                    </View>
                    <Text
                      style={styles.pastResultsCardMeta}
                      numberOfLines={1}
                    >
                      {[describeScoreBand(past.overall), dateLabel]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
                          <Text
                            style={[
                              styles.actionLinkText,
                              isLoading && styles.actionLinkTextLoading,
                            ]}
                          >
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
