import React from 'react';
import { Text, View } from 'react-native';
import { colorForScore, styles } from '../styles';
import type { ProgressStats } from '../types';

interface Props {
  stats: ProgressStats;
}

// Renders the trend chip as either:
//   • Green "+5" with up arrow when score improved
//   • Red "−3" with down arrow when score worsened (Unicode minus
//     for typographic precision)
//   • Grey "—" no-change when delta is zero
//   • Hidden entirely when null (fewer than 2 graded mocks)
const renderTrendChip = (delta: number | null) => {
  if (delta == null) return null;

  const bg =
    delta > 0 ? '#DCFCE7' : delta < 0 ? '#FEE2E2' : '#F3F4F6';
  const color =
    delta > 0 ? '#15803D' : delta < 0 ? '#B91C1C' : '#374151';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '•';
  const label =
    delta > 0
      ? `+${delta} vs last`
      : delta < 0
        ? `−${Math.abs(delta)} vs last`
        : 'No change vs last';

  return (
    <View style={[styles.statsTrendChip, { backgroundColor: bg }]}>
      <Text style={[styles.statsTrendChipText, { color }]}>
        {arrow} {label}
      </Text>
    </View>
  );
};

// Single tertiary stat tile (Average / Best / Total). Renders "—"
// when the value is null so the column structure stays consistent
// across "no data" → "first mock graded" → "many mocks graded"
// transitions.
const TertiaryStat: React.FC<{ label: string; value: number | null }> = ({
  label,
  value,
}) => (
  <View style={styles.statsTertiaryItem}>
    <Text style={styles.statsTertiaryValue}>{value == null ? '—' : value}</Text>
    <Text style={styles.statsTertiaryLabel}>{label}</Text>
  </View>
);

export const StatsCard: React.FC<Props> = ({ stats }) => {
  const latestColor = colorForScore(stats.latestOverall);

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsLatestRow}>
        <Text style={styles.statsLatestLabel}>Latest Score</Text>
        <Text
          style={[styles.statsLatestScore, { color: latestColor }]}
          accessibilityLabel={
            stats.latestOverall == null
              ? 'Latest score pending'
              : `Latest score ${stats.latestOverall} out of 90`
          }
        >
          {stats.latestOverall == null ? '—' : stats.latestOverall}
          {stats.latestOverall != null && (
            <Text style={styles.statsLatestScoreMax}> /90</Text>
          )}
        </Text>
        {renderTrendChip(stats.trendDeltaVsPrevious)}
      </View>

      <View style={styles.statsTertiaryRow}>
        <TertiaryStat label="Average" value={stats.averageOverall} />
        <TertiaryStat label="Best" value={stats.bestOverall} />
        {/* Total here = number of mocks taken (incl. pending) so the
            user sees their effort reflected even before grading
            lands. `gradedCount` would understate it. */}
        <TertiaryStat label="Total" value={stats.totalCount} />
      </View>
    </View>
  );
};

export default StatsCard;
