import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import type {
  MockSection,
  MockTestVariant,
} from '../MockTestRunner/types';
import type { PastMock } from '../MockTestResult/types';
import { usePastMocks } from '../MockTestResult/hooks/usePastMocks';
import { applyProgressFilter } from '../MockTestProgress/helpers';
import type { ProgressFilter } from '../MockTestProgress/types';
import { sortPastMocks } from './helpers';
import { colorForHistoryScore, styles } from './styles';
import { HISTORY_SORT_OPTIONS, type HistorySortOrder } from './types';

// Variant chip set — mirrors MockTestProgress so the filter UX
// reads identically across both surfaces. Single source of truth
// for these would be nice but adds an import-graph dependency
// across two screens with otherwise separate styles. Worth the
// dupe for the layering benefit.
const VARIANT_OPTIONS: Array<{ id: MockTestVariant | null; label: string }> = [
  { id: null, label: 'All' },
  { id: 'full', label: 'Full' },
  { id: 'extensive', label: 'Extensive' },
];

const CATEGORY_OPTIONS: Array<{
  id: MockSection | 'Full Mock' | null;
  label: string;
}> = [
  { id: null, label: 'All' },
  { id: 'Full Mock', label: 'Full' },
  { id: 'Speaking', label: 'Speaking' },
  { id: 'Writing', label: 'Writing' },
  { id: 'Reading', label: 'Reading' },
  { id: 'Listening', label: 'Listening' },
];

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MockTestHistory'
>;

// Format a past-mock submission timestamp for the list meta line.
// Defensive against unparseable ISOs — returns empty string and
// the caller's "·" separator gracefully collapses.
const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const MockTestHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'MockTestHistory'>>();
  const insets = useSafeAreaInsets();

  const pastQuery = usePastMocks();

  // Seed filter from route params so callers can deep-link to a
  // pre-filtered view ("See all Speaking mocks"). After consumption
  // we keep the local state — clearing the param on the route would
  // fight with the user's chip taps.
  const [filter, setFilter] = useState<ProgressFilter>({
    variant: route.params?.variant ?? null,
    category: route.params?.category ?? null,
  });
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>(
    route.params?.sortOrder ?? 'newest',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter then sort. Two-pass keeps each transformation pure and
  // testable; the cost is negligible at the dataset sizes we
  // expect (dozens of mocks per user, not thousands).
  const visibleMocks = useMemo(
    () => sortPastMocks(applyProgressFilter(pastQuery.pastMocks, filter), sortOrder),
    [pastQuery.pastMocks, filter, sortOrder],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await pastQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [pastQuery]);

  const handleOpenMock = useCallback(
    (mock: PastMock) => {
      navigation.navigate('MockTestResult', {
        mockId: mock.mockId,
        variant: mock.variant,
        category: mock.category,
        title: mock.title,
      });
    },
    [navigation],
  );

  // Single chip renderer for variant / category / sort rows.
  // Generic-free because all three rows use string labels — no
  // type-level distinction worth bringing along.
  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    key: string,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
            All Mock Tests
          </Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>
          Browse, sort, and re-open every attempt
        </Text>
      </View>

      {/* Sticky controls bar — variant, category, sort rows.
          Pulled out of the FlatList header so it stays visible
          while the user scrolls long histories. */}
      <View style={styles.controlsBar}>
        <View style={styles.controlsRow}>
          <Text style={styles.controlsLabel}>Type</Text>
          {VARIANT_OPTIONS.map(opt =>
            renderChip(
              opt.label,
              filter.variant === opt.id,
              () => setFilter(f => ({ ...f, variant: opt.id })),
              `v-${opt.id ?? 'all'}`,
            ),
          )}
        </View>
        <View style={styles.controlsRow}>
          <Text style={styles.controlsLabel}>Section</Text>
          {CATEGORY_OPTIONS.map(opt =>
            renderChip(
              opt.label,
              filter.category === opt.id,
              () => setFilter(f => ({ ...f, category: opt.id })),
              `c-${opt.id ?? 'all'}`,
            ),
          )}
        </View>
        <View style={styles.controlsRow}>
          <Text style={styles.controlsLabel}>Sort</Text>
          {HISTORY_SORT_OPTIONS.map(opt =>
            renderChip(
              opt.label,
              sortOrder === opt.id,
              () => setSortOrder(opt.id),
              `s-${opt.id}`,
            ),
          )}
        </View>
      </View>

      {pastQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1A2151" />
          <Text style={styles.centerStateTitle}>Loading history…</Text>
        </View>
      ) : pastQuery.isError ? (
        <View style={styles.centerState}>
          <Text style={styles.centerStateTitle}>
            We couldn&apos;t load your history
          </Text>
          <Text style={styles.centerStateSubtitle}>
            {pastQuery.error instanceof Error
              ? pastQuery.error.message
              : 'Pull to refresh or try again later.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleMocks}
          keyExtractor={item => `${item.variant}-${item.mockId}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {visibleMocks.length}{' '}
              {visibleMocks.length === 1 ? 'mock' : 'mocks'}
              {(filter.variant != null || filter.category != null) &&
                ' (filtered)'}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.centerStateTitle}>
                {pastQuery.pastMocks.length === 0
                  ? 'No mock tests yet'
                  : 'No mocks match your filters'}
              </Text>
              <Text style={styles.centerStateSubtitle}>
                {pastQuery.pastMocks.length === 0
                  ? 'Take your first mock and it will appear here.'
                  : 'Try clearing a filter chip above.'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1A2151"
            />
          }
          renderItem={({ item }) => {
            const isPending = item.overall == null;
            const color = colorForHistoryScore(item.overall);
            const variantTag =
              item.variant === 'extensive' ? 'Extensive' : 'Mock';
            const dateLabel = formatDate(item.submittedAtIso);
            const meta = [`${variantTag} · ${item.category}`, dateLabel]
              .filter(Boolean)
              .join(' · ');

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleOpenMock(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  isPending
                    ? `${item.title}, score pending`
                    : `${item.title}, score ${item.overall} out of 90`
                }
              >
                <View
                  style={[styles.rowScoreBar, { backgroundColor: color }]}
                />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {meta}
                  </Text>
                </View>
                <View style={styles.rowScoreCol}>
                  {isPending ? (
                    <Text style={styles.rowScorePending}>Pending</Text>
                  ) : (
                    <>
                      <Text style={styles.rowScore}>{item.overall}</Text>
                      <Text style={styles.rowScoreMax}>/ 90</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

export default MockTestHistoryScreen;
