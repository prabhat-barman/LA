import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';
import type { SectionScore } from '../types';

interface Props {
  sections: SectionScore[];
}

const MAX_SCORE = 90;
const MAX_BAR_WIDTH = 220;
const MIN_BAR_WIDTH = 24;

// Skill → bar color. Matches the same palette
// PerformanceResultCircles uses so the user can visually correlate
// the two cards at a glance.
const SKILL_COLORS: Record<string, string> = {
  Speaking: '#22C55E',
  Writing: '#2563EB',
  Reading: '#F59E0B',
  Listening: '#7C3AED',
};

const getBarWidth = (value: number): number => {
  const safe = Math.max(0, Math.min(value, MAX_SCORE));
  const ratio = safe / MAX_SCORE;
  return Math.max(MIN_BAR_WIDTH, ratio * MAX_BAR_WIDTH);
};

// "Skill Breakdown" card — horizontal bar per section, colored to
// match the legacy palette. Mirrors the Score Comparison view of
// legacy SkillBreakdownCard.js (we deliberately skip the radar
// view — same data, more screen real estate, and the bars are the
// default on PTE official scorecards too).
//
// Renders null when there's no section data so we don't show a
// hollow card during the pending state.
export const SkillBreakdownCard: React.FC<Props> = ({ sections }) => {
  if (!sections || sections.length === 0) return null;

  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.breakdownTitle}>Skill Breakdown</Text>
      </View>

      <View style={styles.breakdownBars}>
        {sections.map(({ section, score }) => {
          const value = score ?? 0;
          const barColor = SKILL_COLORS[section] ?? '#7C3AED';
          const barWidth = getBarWidth(value);

          return (
            <View key={section} style={styles.breakdownRow}>
              <Text style={styles.breakdownRowLabel}>{section}</Text>
              <View style={styles.breakdownAxisDash} />
              <View style={styles.breakdownAxisLine} />
              <View
                style={[
                  styles.breakdownBar,
                  { width: barWidth, backgroundColor: barColor },
                ]}
              />
              <Text style={styles.breakdownRowValue}>
                {score == null ? '—' : value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SkillBreakdownCard;
