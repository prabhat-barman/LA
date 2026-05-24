import React from 'react';
import { Text, View } from 'react-native';
import { getDifficultyChipStyle } from '../helpers';
import { styles } from '../styles';

interface Props {
  title: string;
  questionId: string | number;
  difficulty: string;
  isNew: boolean;
  attemptedCount: number;
}

export const QuestionMetaBlock: React.FC<Props> = ({
  title,
  questionId,
  difficulty,
  isNew,
  attemptedCount,
}) => {
  const diffStyle = difficulty ? getDifficultyChipStyle(difficulty) : null;
  return (
    <View style={styles.metaBlock}>
      {!!title && (
        <Text style={styles.metaTitle} numberOfLines={2}>
          {title}
        </Text>
      )}
      <View style={styles.metaChipsRow}>
        <View style={styles.metaIdChip}>
          <Text style={styles.metaIdChipText}>#{questionId}</Text>
        </View>

        {!!difficulty && diffStyle && (
          <View style={[styles.metaDiffChip, { backgroundColor: diffStyle.bg }]}>
            <Text style={[styles.metaDiffChipText, { color: diffStyle.text }]}>
              {difficulty}
            </Text>
          </View>
        )}

        {isNew && (
          <View style={styles.metaNewChip}>
            <Text style={styles.metaNewChipText}>New</Text>
          </View>
        )}

        {attemptedCount > 0 && (
          <View style={styles.metaAttemptChip}>
            <Text style={styles.metaAttemptChipText}>Attempted</Text>
          </View>
        )}
      </View>
    </View>
  );
};
