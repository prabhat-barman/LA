import React from 'react';
import { Text, View } from 'react-native';
import { describeScoreBand } from '../helpers';
import { scoreColorForBand, styles } from '../styles';
import type { SectionScore } from '../types';

interface Props {
  sections: SectionScore[];
}

// PTE band ceiling — drives both the visible "/90" label and the
// progress-bar normalisation.
const SCORE_MAX = 90;

export const SectionScoreCard: React.FC<Props> = ({ sections }) => {
  if (sections.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Section Scores</Text>
      {sections.map(s => {
        const isPending = s.score == null;
        const fillWidth = isPending
          ? '0%'
          : `${Math.min(100, ((s.score as number) / SCORE_MAX) * 100)}%`;
        const fillColor = scoreColorForBand(s.score);

        return (
          <View key={s.section} style={styles.sectionRow}>
            <View style={styles.sectionRowTopLine}>
              <Text style={styles.sectionRowName}>{s.section}</Text>
              <Text
                style={[
                  styles.sectionRowScore,
                  isPending && styles.sectionRowScorePending,
                ]}
                accessibilityLabel={
                  isPending
                    ? `${s.section} score pending`
                    : `${s.section} score ${s.score} out of 90, ${describeScoreBand(
                        s.score,
                      )}`
                }
              >
                {isPending ? 'Pending' : s.score}
                {!isPending && (
                  <Text style={styles.sectionRowScoreMax}> /90</Text>
                )}
              </Text>
            </View>
            <View style={styles.sectionBarTrack}>
              <View
                style={[
                  styles.sectionBarFill,
                  // `fillWidth` is dynamic and the StyleSheet API doesn't
                  // accept percentage strings via createStyles — apply
                  // inline. Same with the dynamic color.
                  { width: fillWidth as `${number}%`, backgroundColor: fillColor },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default SectionScoreCard;
