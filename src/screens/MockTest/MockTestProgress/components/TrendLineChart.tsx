import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { PastMock } from '../../MockTestResult/types';
import { buildLineChartGeometry } from '../helpers';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  colorForScore,
  styles,
} from '../styles';

interface Props {
  // Mocks to plot — caller should sort OLDEST-first so the chart
  // reads left-to-right chronologically. Pending mocks (`overall ==
  // null`) are silently dropped by the geometry helper.
  mocks: PastMock[];
  // Optional drill-in handler when the user taps a data point.
  // SVG <Circle> doesn't fire onPress on every RN version reliably
  // enough to depend on — we expose the handler as a prop but the
  // primary tap surface is the recent mocks list below the chart.
  onPointPress?: (mock: PastMock) => void;
}

// Pure-SVG sparkline-style trend chart. No external chart library —
// `react-native-svg` (already in deps) gives us all the primitives.
// Geometry is pre-computed by `buildLineChartGeometry` so this
// component is just a thin renderer; layout math is unit-tested
// separately.
export const TrendLineChart: React.FC<Props> = ({ mocks, onPointPress }) => {
  const geom = buildLineChartGeometry(mocks, {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });

  if (geom.points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>
          No graded mocks yet. Your trend will appear here once your first
          mock is scored.
        </Text>
      </View>
    );
  }

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Horizontal grid lines + y-axis labels. Drawn FIRST so the
          trend line + points sit on top. */}
      {geom.yGridLines.map(g => (
        <React.Fragment key={`grid-${g.score}`}>
          <Line
            x1={28}
            x2={CHART_WIDTH - 12}
            y1={g.y}
            y2={g.y}
            stroke="#F3F4F6"
            strokeWidth={1}
          />
          <SvgText
            x={6}
            y={g.y + 3}
            fontSize={10}
            fill="#9CA3AF"
            fontFamily="BricolageGrotesque-Regular"
          >
            {g.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Trend polyline. Only rendered when there are 2+ points — a
          single-point chart shows just the dot. */}
      {geom.linePath.length > 0 && (
        <Path
          d={geom.linePath}
          stroke="#1A2151"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points. Color-coded by score band — gives the chart
          extra information density: at a glance the user can see
          which mocks were in which PTE band, not just the line's
          general shape. */}
      {geom.points.map((p, idx) => (
        <Circle
          key={`pt-${idx}`}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={colorForScore(p.score)}
          stroke="#FFFFFF"
          strokeWidth={1.5}
          // `onPress` on Circle works on most platforms; pointer events
          // are forwarded through react-native-svg. The "tap a list
          // row" interaction below the chart is the primary drill-in
          // path; this is a nice-to-have shortcut.
          onPress={onPointPress ? () => onPointPress(p.mock) : undefined}
        />
      ))}
    </Svg>
  );
};

export default TrendLineChart;
