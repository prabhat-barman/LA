import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colorForScore, styles } from '../styles';
import type { WeakestSkillResult } from '../types';

interface Props {
  weakest: WeakestSkillResult;
  // Phase 7.0 — tap-through to the Practice tab filtered to the
  // weak section. Optional so the card stays useful in contexts
  // that don't have a practice deep-link (e.g. a future export /
  // share preview that just shows the callout statically).
  onStartPracticing?: (section: WeakestSkillResult['section']) => void;
}

// Focus-area callout. Surfaces the lowest-scoring section as an
// actionable recommendation — turns the Progress dashboard from
// retrospective ("here's how you did") into prescriptive ("here's
// what to work on next"). Identification logic in
// `identifyWeakestSection` deliberately avoids low-confidence calls
// (need ≥2 data points + ≥3pt gap to surface), so when this card
// renders the recommendation is data-backed.
//
// Color-coded by the weak section's score band so a "Focus on
// Writing — 35" reads as more urgent (red bar) than "Focus on
// Speaking — 72" (blue bar).
//
// Phase 7.0 closes the loop: when `onStartPracticing` is provided
// the card grows a primary CTA that deep-links into the Practice
// tab with the weak section pre-selected, turning a recommendation
// into a one-tap action.
export const WeakestSkillCard: React.FC<Props> = ({
  weakest,
  onStartPracticing,
}) => {
  const accentColor = colorForScore(weakest.averageScore);
  return (
    <View style={styles.weakestCard}>
      <View
        style={[styles.weakestAccentBar, { backgroundColor: accentColor }]}
      />
      <View style={styles.weakestBody}>
        <Text style={styles.weakestEyebrow}>Focus area</Text>
        <Text style={styles.weakestTitle}>
          Work on your {weakest.section}
        </Text>
        <Text style={styles.weakestSubtitle}>
          Averaging {weakest.averageScore} — {weakest.gapToStrongest} point
          {weakest.gapToStrongest === 1 ? '' : 's'} behind your strongest
          section. Targeted practice here will lift your overall score
          the fastest.
        </Text>
        {onStartPracticing && (
          <TouchableOpacity
            style={[styles.weakestCta, { backgroundColor: accentColor }]}
            onPress={() => onStartPracticing(weakest.section)}
            accessibilityRole="button"
            accessibilityLabel={`Start practicing ${weakest.section}`}
          >
            <Text style={styles.weakestCtaText}>
              Practice {weakest.section} →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default WeakestSkillCard;
