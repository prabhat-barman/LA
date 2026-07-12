import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { styles } from '../styles';
import type { SectionScore } from '../types';

interface Props {
  sections: SectionScore[];
}

const CIRCLE_SIZE = 96;
const STROKE_WIDTH = 10;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_SCORE = 90;

// Skill → ring color. Same mapping the legacy
// PerformanceResultCircles uses (line 14-23). Hard-coded rather
// than themed because the colors are PTE-skill-specific and any
// theme that overrides them would defeat the visual association
// (Reading = orange, etc.) the user has built up across screens.
const SKILL_COLORS: Record<string, string> = {
  Speaking: '#2563EB',
  Writing: '#22C55E',
  Reading: '#F59E0B',
  Listening: '#7C3AED',
};

// "Performance Result" card — circular progress ring per skill in a
// 2x2 grid. Mirrors legacy PerformanceResultCircles.js. Renders
// null when there are no sections to draw (pending grading), so
// the result screen doesn't show an empty card.
export const PerformanceResultCircles: React.FC<Props> = ({ sections }) => {
  if (!sections || sections.length === 0) return null;

  return (
    <View style={styles.perfCard}>
      <View style={styles.perfHeader}>
        <Text style={styles.perfTitle}>Performance Result</Text>
      </View>

      <View style={styles.perfGrid}>
        {sections.map(({ section, score }) => {
          const numericValue = score ?? 0;
          const ratio =
            numericValue <= 0 ? 0 : Math.min(numericValue / MAX_SCORE, 1);
          const strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
          const ringColor = SKILL_COLORS[section] ?? '#7C3AED';

          return (
            <View key={section} style={styles.perfSkillCard}>
              <View style={styles.perfCircleWrapper}>
                <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                  <Circle
                    stroke="#E5E7EB"
                    fill="none"
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    strokeWidth={STROKE_WIDTH}
                  />
                  <Circle
                    stroke={ringColor}
                    fill="none"
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                  />
                </Svg>
                <View style={styles.perfCenterValue}>
                  <Text style={styles.perfValueText}>
                    {score == null ? '—' : numericValue}
                  </Text>
                </View>
              </View>
              <Text style={styles.perfLabel}>{section}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default PerformanceResultCircles;
