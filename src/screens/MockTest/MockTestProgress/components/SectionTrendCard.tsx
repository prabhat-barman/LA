import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { buildLineChartGeometry } from '../helpers';
import { colorForScore, styles } from '../styles';
import type { SectionStats } from '../types';
import type { PastMock } from '../../MockTestResult/types';

interface Props {
  stats: SectionStats;
  // Tap drill-in — opens the LATEST mock's result. Drilling to a
  // specific point in the sparkline (vs the section's most recent
  // result) would be a nice future iteration but at this density a
  // 4-point chart isn't really a tappable surface.
  onPress?: (mock: PastMock) => void;
}

// Approximate inner card width, used as the sparkline's drawable
// width. Computed from screen width / 2 minus paddings — kept loose
// because react-native-svg auto-fits via viewBox-style behaviour
// when the SVG is sized smaller than the geometry.
const SPARKLINE_HEIGHT = 40;
const SPARKLINE_PAD_X = 4;

// Renders a single section's mini-card. Three layout states:
//   1. Has 2+ scores → sparkline + latest score + trend chip
//   2. Has 1 score   → latest score + "First test logged" note
//   3. Has 0 scores  → "Waiting for data" placeholder
//
// We deliberately don't render the y-axis grid / labels on the
// sparkline — at this size labels would dominate the chart. The big
// numeric latest score above is the user's reference point.
export const SectionTrendCard: React.FC<Props> = ({ stats, onPress }) => {
  const latestColor = colorForScore(stats.latestScore);

  // Build sparkline geometry inline. Sparkline width is approximated
  // — react-native-svg renders at the natural dimensions we pass.
  // Sized small enough that the grid lines from buildLineChartGeometry
  // become invisible squashed against the chart edge, which is
  // exactly what we want at this density.
  const sparkWidth = 160; // approx half-width inside a 2-col grid
  const geom = buildLineChartGeometry(
    stats.scoreSeries.map(s => s.mock),
    {
      width: sparkWidth,
      height: SPARKLINE_HEIGHT,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: SPARKLINE_PAD_X,
      paddingRight: SPARKLINE_PAD_X,
    },
  );

  // Trend chip — same encoding as StatsCard but compressed for the
  // tighter space. Hidden when no comparison is possible.
  const renderTrend = () => {
    if (stats.trendDeltaVsPrevious == null) return null;
    const d = stats.trendDeltaVsPrevious;
    const bg = d > 0 ? '#DCFCE7' : d < 0 ? '#FEE2E2' : '#F3F4F6';
    const color = d > 0 ? '#15803D' : d < 0 ? '#B91C1C' : '#374151';
    const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '•';
    const label = d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0';
    return (
      <View style={[styles.sectionCardTrendChip, { backgroundColor: bg }]}>
        <Text style={[styles.sectionCardTrendChipText, { color }]}>
          {arrow} {label}
        </Text>
      </View>
    );
  };

  const latestMock = stats.scoreSeries[stats.scoreSeries.length - 1]?.mock;

  // Card body — extracted so both the tappable and non-tappable
  // shells render identical content without duplicating JSX. Using
  // a fragment subtree (vs a wrapper component swap) keeps the
  // types simple and sidesteps RN View's `children?: ReactNode`
  // assignability mismatch with an explicit required-children prop.
  const body = (
    <>
      <View style={styles.sectionCardTopRow}>
        <Text style={styles.sectionCardLabel}>{stats.section}</Text>
        {renderTrend()}
      </View>

      {stats.latestScore != null ? (
        <Text
          style={[styles.sectionCardScore, { color: latestColor }]}
          accessibilityLabel={`Latest ${stats.section} score ${stats.latestScore}`}
        >
          {stats.latestScore}
        </Text>
      ) : (
        <Text style={styles.sectionCardScorePending}>Waiting for data</Text>
      )}

      {/* Sparkline — only rendered when there's a polyline worth
          showing (2+ points). A single-point sparkline would just
          be a lonely dot in the middle. */}
      {geom.points.length >= 2 && (
        <View style={styles.sectionCardSparkline}>
          <Svg width={sparkWidth} height={SPARKLINE_HEIGHT}>
            {/* Subtle baseline at the chart's vertical centre.
                Helps the eye sense whether the trend is sloping up
                or down at a glance even when both points are close. */}
            <Line
              x1={SPARKLINE_PAD_X}
              x2={sparkWidth - SPARKLINE_PAD_X}
              y1={SPARKLINE_HEIGHT / 2}
              y2={SPARKLINE_HEIGHT / 2}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
            <Path
              d={geom.linePath}
              stroke="#1A2151"
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Only the latest point gets a dot — keeps the
                sparkline visually quiet while still highlighting
                "this is your most recent score". */}
            <Circle
              cx={geom.points[geom.points.length - 1].x}
              cy={geom.points[geom.points.length - 1].y}
              r={3}
              fill={latestColor}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          </Svg>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.sectionCard}>
      {onPress && latestMock ? (
        <TouchableOpacity
          style={styles.sectionCardInner}
          onPress={() => onPress(latestMock)}
          accessibilityRole="button"
          accessibilityLabel={`Open latest ${stats.section} result`}
        >
          {body}
        </TouchableOpacity>
      ) : (
        <View style={styles.sectionCardInner}>{body}</View>
      )}
    </View>
  );
};

export default SectionTrendCard;
