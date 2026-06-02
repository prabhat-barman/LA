import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PersistedMockSummary } from '../MockTestRunner/persistence';
import { useToast } from '../../../context/ToastContext';

interface Props {
  // Already filtered + sorted by `useRecoveryMocks`. Newest persisted
  // record first.
  persistedMocks: PersistedMockSummary[];
  // The mockId currently being retried (banner gates per-row CTAs on
  // this so we don't fire multiple concurrent bulk-resubmits).
  retryingMockId: number | string | null;
  // Returns the FlushResult so the banner can show a toast on
  // partial / full failure. `null` means "skipped — another retry is
  // already in flight".
  onRetryMock: (
    mockId: number | string,
  ) => Promise<import('../MockTestRunner/scheduler').FlushResult | null>;
}

// Phase 2.3 — App-level recovery banner.
//
// Surfaced at the top of MockTestScreen whenever the persistence
// layer holds failed items from a previous (crashed / killed)
// session. Each row triggers a one-shot bulk-resubmit without
// requiring the user to re-open the runner.
//
// Collapsed by default to avoid dominating the screen — the headline
// shows the totals and a single "Show" toggle expands the per-mock
// list. We deliberately don't dismiss this banner: failed items are
// real and they need attention before the user can fully trust the
// app. The "Later" affordance lives inside the runner itself.
export const RecoveryBanner: React.FC<Props> = ({
  persistedMocks,
  retryingMockId,
  onRetryMock,
}) => {
  const toast = useToast();
  // Expansion state — the banner starts collapsed so users with a
  // single unsent answer don't get a huge banner. On expand we show
  // a per-mock list with individual retry buttons.
  const [expanded, setExpanded] = useState(false);

  if (persistedMocks.length === 0) return null;

  const totalItems = persistedMocks.reduce(
    (sum, m) => sum + m.itemCount,
    0,
  );

  // Triggers retry and surfaces feedback through the toast. The
  // banner self-hides once the underlying query reports no remaining
  // persisted mocks (driven by `useRecoveryMocks` invalidation).
  const handleRetry = async (mockId: number | string, label: string) => {
    if (retryingMockId != null) return;
    const result = await onRetryMock(mockId);
    if (!result) return;
    if (result.allSucceeded) {
      toast.showToast(`Sent answers from ${label}`, 'success');
    } else {
      toast.showToast(
        `${result.failedItems.length} of ${result.totalItems} still failing — try again`,
        'error',
      );
    }
  };

  const labelFor = (m: PersistedMockSummary): string => {
    if (m.title) return m.title;
    if (m.category) return `${m.category} Mock`;
    return `Mock #${m.mockId}`;
  };

  return (
    <View style={styles.banner}>
      {/* Headline row — always visible. Tap to expand / collapse. */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? 'Hide unsent answers list' : 'Show unsent answers list'
        }
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>Unsent answers from previous sessions</Text>
          <Text style={styles.subtitle}>
            {totalItems} {totalItems === 1 ? 'answer' : 'answers'} across{' '}
            {persistedMocks.length}{' '}
            {persistedMocks.length === 1 ? 'mock' : 'mocks'}
          </Text>
        </View>
        <Text style={styles.expandChevron}>{expanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.rowList}>
          {persistedMocks.map(mock => {
            const label = labelFor(mock);
            const isRetryingThis = retryingMockId === mock.mockId;
            const isOtherRunning =
              retryingMockId != null && retryingMockId !== mock.mockId;
            return (
              <View
                key={String(mock.mockId)}
                style={styles.row}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {mock.itemCount}{' '}
                    {mock.itemCount === 1 ? 'answer' : 'answers'} pending
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRetry(mock.mockId, label)}
                  disabled={isRetryingThis || isOtherRunning}
                  style={[
                    styles.rowBtn,
                    (isRetryingThis || isOtherRunning) && styles.rowBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Retry ${label}`}
                >
                  {isRetryingThis ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.rowBtnText}>Retry</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// Local styles — kept inside the component since this banner is the
// only consumer. Same amber palette as the runner's intra-session
// recovery banner so the user sees a consistent visual language
// across both surfaces.
const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#78350F',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  expandChevron: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  rowList: {
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 13,
    color: '#451A03',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  rowMeta: {
    fontSize: 11,
    color: '#78350F',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: 1,
  },
  rowBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  rowBtnDisabled: {
    opacity: 0.55,
  },
  rowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
});

export default RecoveryBanner;
