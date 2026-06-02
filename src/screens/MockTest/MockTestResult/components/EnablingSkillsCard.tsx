import React from 'react';
import { Text, View } from 'react-native';
import { describeScoreBand } from '../helpers';
import { scoreColorForBand, styles } from '../styles';
import type { EnablingSkillScore } from '../types';

interface Props {
  skills: EnablingSkillScore[];
}

// 2-column grid of communicative-skill tiles. Renders nothing when the
// backend didn't surface any enabling skills — keeps the screen tidy
// instead of showing an empty heading. Layout intentionally simple
// (Text + colored band label) so it stays usable when scaling to small
// devices; no per-tile bars to keep visual density low.
export const EnablingSkillsCard: React.FC<Props> = ({ skills }) => {
  if (skills.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Enabling Skills</Text>
      <View style={styles.skillGrid}>
        {skills.map(skill => {
          const color = scoreColorForBand(skill.score);
          return (
            <View key={skill.name} style={styles.skillTile}>
              <View style={styles.skillTileInner}>
                <Text style={styles.skillTileName} numberOfLines={1}>
                  {skill.name}
                </Text>
                <Text
                  style={styles.skillTileScore}
                  accessibilityLabel={
                    skill.score == null
                      ? `${skill.name} score pending`
                      : `${skill.name} score ${skill.score} out of 90`
                  }
                >
                  {skill.score == null ? '—' : skill.score}
                </Text>
                <Text style={[styles.skillTileBand, { color }]}>
                  {describeScoreBand(skill.score)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default EnablingSkillsCard;
