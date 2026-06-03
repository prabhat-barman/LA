import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../context/ToastContext';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import type {
  MockSection,
  MockTestVariant,
} from '../MockTestRunner/types';
import type { PastMock } from '../MockTestResult/types';
import { usePastMocks } from '../MockTestResult/hooks/usePastMocks';
import { GoalProgressCard } from './components/GoalProgressCard';
import { RecentMocksList } from './components/RecentMocksList';
import { SectionTrendCard } from './components/SectionTrendCard';
import { SetGoalModal } from './components/SetGoalModal';
import { StatsCard } from './components/StatsCard';
import { StreakCard } from './components/StreakCard';
import { TrendLineChart } from './components/TrendLineChart';
import { WeakestSkillCard } from './components/WeakestSkillCard';
import {
  applyProgressFilter,
  computeGoalProgress,
  computeProgressStats,
  computeSectionStats,
  computeStreakSummary,
  identifyWeakestSection,
  SECTIONS_IN_ORDER,
} from './helpers';
import {
  useClearMockGoal,
  useMockGoal,
  useSetMockGoal,
} from './hooks/useMockGoal';
import { styles } from './styles';
import type { ProgressFilter } from './types';

// How many mocks to include in the trend chart. Anything more pushes
// the dots too close together to be readable on phone screens. The
// recent list below shows up to 10 separately for full text detail.
const MAX_CHART_POINTS = 10;

// Variant chips. `null` = "All".
const VARIANT_OPTIONS: Array<{ id: MockTestVariant | null; label: string }> = [
  { id: null, label: 'All' },
  { id: 'full', label: 'Full' },
  { id: 'extensive', label: 'Extensive' },
];

// Category chips. `null` = "All". Surfacing all five so the user
// can drill into per-section trends without bouncing through the
// detail screen.
const CATEGORY_OPTIONS: Array<{
  id: MockSection | 'Full Mock' | null;
  label: string;
}> = [
  { id: null, label: 'All' },
  { id: 'Full Mock', label: 'Full Mock' },
  { id: 'Speaking', label: 'Speaking' },
  { id: 'Writing', label: 'Writing' },
  { id: 'Reading', label: 'Reading' },
  { id: 'Listening', label: 'Listening' },
];

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MockTestProgress'
>;

export const MockTestProgressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const pastQuery = usePastMocks();
  const { goal } = useMockGoal();
  const setGoalMutation = useSetMockGoal();
  const clearGoalMutation = useClearMockGoal();

  const [filter, setFilter] = useState<ProgressFilter>({
    variant: null,
    category: null,
  });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh — same pattern as MockTestScreen. We toggle a
  // local `isRefreshing` flag so RefreshControl shows its spinner
  // while the past-mocks query refetches, then clear it once the
  // query settles. Goal state isn't refetched (it's local
  // AsyncStorage — the user is the only writer) so we don't need
  // to invalidate `useMockGoal` here.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await pastQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [pastQuery]);

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor="#1A2151"
    />
  );

  // Filtered + derived data. `usePastMocks` already sorts newest-first,
  // which matches the recent list contract. For the chart we re-sort
  // OLDEST-first since trend lines read left-to-right chronologically.
  const filteredMocks = useMemo(
    () => applyProgressFilter(pastQuery.pastMocks, filter),
    [pastQuery.pastMocks, filter],
  );

  const stats = useMemo(
    () => computeProgressStats(filteredMocks),
    [filteredMocks],
  );

  // Phase 6.2 — Goal-progress snapshot. Recomputed whenever the
  // user takes a new mock (stats change) or edits their goal. The
  // overall stats — NOT the filtered stats — drive the goal,
  // because a goal is a global ambition, not something the user
  // filters away by toggling "Speaking only" chips. Using
  // filteredMocks here would make the goal card jump erratically
  // every time a filter chip is tapped.
  const overallStats = useMemo(
    () => computeProgressStats(pastQuery.pastMocks),
    [pastQuery.pastMocks],
  );
  const goalProgress = useMemo(
    () => computeGoalProgress(goal, overallStats),
    [goal, overallStats],
  );

  // Phase 8.0 — Streak summary. Same "global, not filtered" stance
  // as the goal card: a streak counts across every mock variant /
  // category, since the user's commitment is "take SOMETHING every
  // day", not "take a Speaking mock every day". Derived from the
  // overall dataset for that reason.
  const streakSummary = useMemo(
    () => computeStreakSummary(pastQuery.pastMocks),
    [pastQuery.pastMocks],
  );

  // Chart data: oldest-first, capped at MAX_CHART_POINTS. Since the
  // source is already newest-first, take the FIRST N then reverse —
  // that gives us "the N most recent, in chronological order".
  const chartMocks = useMemo(
    () => [...filteredMocks.slice(0, MAX_CHART_POINTS)].reverse(),
    [filteredMocks],
  );

  // Phase 6.1 — Per-section stats for the 2×2 mini-grid + the
  // weakest-skill callout. Both derived from the same `filteredMocks`
  // dataset so all three surfaces stay synced when the user toggles
  // a filter chip.
  const sectionStatsList = useMemo(
    () => SECTIONS_IN_ORDER.map(s => computeSectionStats(filteredMocks, s)),
    [filteredMocks],
  );
  const weakestSkill = useMemo(
    () => identifyWeakestSection(filteredMocks),
    [filteredMocks],
  );
  // Show the per-section grid only when at least one section has a
  // graded score. Otherwise the grid would be four "Waiting for
  // data" placeholders which adds clutter without conveying
  // anything useful.
  const hasAnySectionData = useMemo(
    () => sectionStatsList.some(s => s.gradedCount > 0),
    [sectionStatsList],
  );

  // Reuse the result screen for drill-in (no new screen needed).
  // React Query cache means the round-trip is free if the user has
  // already viewed this mock's result in the current session.
  const handleViewMock = (mock: PastMock) => {
    navigation.navigate('MockTestResult', {
      mockId: mock.mockId,
      variant: mock.variant,
      category: mock.category,
      resultId: mock.resultId,
      title: mock.title,
    });
  };

  // Phase 7.0 — Deep-link the weakest-skill callout's CTA into the
  // Practice tab with the weak section pre-selected. Uses the
  // nested-navigator API since Progress lives in the root stack but
  // Practice is a tab inside Dashboard. PracticeScreen already
  // consumes `initialCategory` and self-clears it so subsequent
  // tab-bar taps don't keep forcing the same section.
  const handleStartPracticing = (
    section: 'Speaking' | 'Writing' | 'Reading' | 'Listening',
  ) => {
    navigation.navigate('Dashboard', {
      screen: 'Practice',
      params: { initialCategory: section },
    });
  };

  // Phase 6.2 — Goal-modal callbacks. The mutation hook handles
  // persistence + React Query cache update; we only own the modal
  // visibility + toast feedback. Toasts use the existing app-wide
  // toast so the user sees confirmation without us building a
  // bespoke notification surface.
  const handleConfirmGoal = (input: {
    targetScore: number;
    targetDateIso: string;
  }) => {
    setGoalMutation.mutate(input, {
      onSuccess: () => {
        setIsGoalModalOpen(false);
        showToast(
          goal ? 'Goal updated' : 'Goal set — good luck!',
          'success',
        );
      },
      onError: () => {
        showToast('Could not save goal. Please try again.', 'error');
      },
    });
  };

  const handleClearGoal = () => {
    clearGoalMutation.mutate(undefined, {
      onSuccess: () => {
        setIsGoalModalOpen(false);
        showToast('Goal cleared', 'info');
      },
      onError: () => {
        showToast('Could not clear goal. Please try again.', 'error');
      },
    });
  };

  // Header chip rendering. Pulled out into a single helper so both
  // variant + category rows reuse the same look without copy-pasting
  // 30 lines of JSX.
  const renderChip = (
    label: string,
    isActive: boolean,
    onPress: () => void,
    key: string | number,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2151" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.headerBackBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Progress
          </Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>
          Your mock-test trend at a glance
        </Text>
      </View>

      {pastQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1A2151" />
          <Text style={styles.centerStateTitle}>Loading your progress…</Text>
        </View>
      ) : pastQuery.isError ? (
        <View style={styles.centerState}>
          <Text style={styles.centerStateTitle}>
            We couldn&apos;t load your progress
          </Text>
          <Text style={styles.centerStateSubtitle}>
            {pastQuery.error instanceof Error
              ? pastQuery.error.message
              : 'Please try again in a moment.'}
          </Text>
        </View>
      ) : pastQuery.pastMocks.length === 0 ? (
        // Phase 6.2 polish — surface the goal card even with zero
        // mocks. New users benefit most from setting an upfront
        // target ("I want 70 by Aug"); blocking the goal flow
        // behind "take a mock first" loses that motivational
        // moment. The empty hero copy stays above so the user
        // still sees what the dashboard will eventually fill with.
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={styles.emptyHero}>
            <Text style={styles.emptyHeroTitle}>
              No mock tests completed yet
            </Text>
            <Text style={styles.emptyHeroSubtitle}>
              Take your first mock test and your trend will appear here.
              Set a target now to track progress from day one.
            </Text>
          </View>
          <GoalProgressCard
            progress={goalProgress}
            onSetGoal={() => setIsGoalModalOpen(true)}
            onEditGoal={() => setIsGoalModalOpen(true)}
          />
          {/* Phase 8.0 — Streak card. Shown even in the zero-mocks
              state (renders "0 days, take a mock to start one")
              so users discover the surface before they need it. */}
          <StreakCard summary={streakSummary} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <StatsCard stats={stats} />

          {/* Phase 6.2 — Goal-progress card.
              Sits directly under the stats card so the user's "where
              I am" (stats) and "where I'm trying to get" (goal) read
              as a unit. Renders an empty-state CTA when no goal is
              set; otherwise shows progress + edit affordance.
              Always anchored to overall stats — see goalProgress
              memo for why. */}
          <GoalProgressCard
            progress={goalProgress}
            onSetGoal={() => setIsGoalModalOpen(true)}
            onEditGoal={() => setIsGoalModalOpen(true)}
          />

          {/* Phase 8.0 — Streak card. Anchored to overall stats
              (not the chip-filtered set) — see streakSummary memo
              comment for why. */}
          <StreakCard summary={streakSummary} />

          {/* Variant chips */}
          <View style={styles.filterRow}>
            {VARIANT_OPTIONS.map(opt =>
              renderChip(
                opt.label,
                filter.variant === opt.id,
                () => setFilter(f => ({ ...f, variant: opt.id })),
                `var-${opt.id ?? 'all'}`,
              ),
            )}
          </View>

          {/* Category chips */}
          <View style={styles.filterRow}>
            {CATEGORY_OPTIONS.map(opt =>
              renderChip(
                opt.label,
                filter.category === opt.id,
                () => setFilter(f => ({ ...f, category: opt.id })),
                `cat-${opt.id ?? 'all'}`,
              ),
            )}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartHeading}>Score Trend</Text>
            <Text style={styles.chartSubheading}>
              {chartMocks.length > 0
                ? `Last ${chartMocks.length} graded mock${
                    chartMocks.length === 1 ? '' : 's'
                  } · oldest to newest`
                : 'Waiting for your first graded score'}
            </Text>
            <TrendLineChart
              mocks={chartMocks}
              onPointPress={handleViewMock}
            />
          </View>

          {/* Phase 6.1 — Weakest skill callout.
              Surfaced ABOVE the per-section grid because it's the
              actionable summary; the grid below explains the data
              that backs the recommendation. Hidden when the helper
              decides there's not enough confidence to recommend a
              focus area (see identifyWeakestSection thresholds). */}
          {weakestSkill && (
            <WeakestSkillCard
              weakest={weakestSkill}
              onStartPracticing={handleStartPracticing}
            />
          )}

          {/* Phase 6.1 — Per-section trend mini-grid.
              2×2 of {Speaking, Writing, Reading, Listening}. Each
              card shows the section's latest score, a sparkline of
              its trend, and a trend chip vs the previous mock for
              that section. Hidden entirely when no section data
              exists (e.g. backend list endpoint doesn't ship
              section scores) — falls back gracefully to the
              overall-trend-only Phase 6.0 dashboard. */}
          {hasAnySectionData && (
            <View style={styles.sectionsSection}>
              <Text style={styles.sectionsHeading}>By Section</Text>
              <Text style={styles.sectionsSubheading}>
                Track progress in each PTE section
              </Text>
              <View style={styles.sectionsGrid}>
                {sectionStatsList.map(sectionStats => (
                  <SectionTrendCard
                    key={sectionStats.section}
                    stats={sectionStats}
                    onPress={handleViewMock}
                  />
                ))}
              </View>
            </View>
          )}

          <RecentMocksList
            mocks={filteredMocks}
            onPress={handleViewMock}
            onSeeAll={() =>
              navigation.navigate('MockTestHistory', {
                variant: filter.variant,
                category: filter.category,
              })
            }
          />
        </ScrollView>
      )}

      {/* Phase 6.2 — Set/edit goal modal.
          Rendered at the screen root (outside the loading switch)
          so it stays mounted across loading state transitions. The
          modal itself controls its visibility via the `visible`
          prop — keeping the React subtree stable avoids
          re-creating its internal state on every refetch. */}
      <SetGoalModal
        visible={isGoalModalOpen}
        existingGoal={goal}
        onConfirm={handleConfirmGoal}
        onClear={goal ? handleClearGoal : undefined}
        onClose={() => setIsGoalModalOpen(false)}
        isBusy={setGoalMutation.isPending || clearGoalMutation.isPending}
      />
    </View>
  );
};

export default MockTestProgressScreen;
