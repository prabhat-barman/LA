import React, { useCallback, useMemo } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { PROGRESS_BAR_COLOR, formatCount } from '../helpers';
import { styles } from '../styles';
import type { ProgressSubcategory } from '../types';

interface SubcategoryProgressCardProps {
  item: ProgressSubcategory;
  onPress: (item: ProgressSubcategory) => void;
}

// Single subcategory row: title + attempt badge + progress bar +
// accuracy/target line. Memo'd so tab-switch re-renders only touch the
// items in the new skill bucket rather than the whole list.
const SubcategoryProgressCardImpl: React.FC<SubcategoryProgressCardProps> = ({
  item,
  onPress,
}) => {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  // Bar fill = accuracy %, NOT attempted/total. The total question pool
  // for a subcategory routinely runs into the thousands (e.g. Read Aloud
  // has 1,000+ questions) so 10 attempts would render as ~1% of the bar
  // and look perpetually empty. The old app uses accuracy as the visual
  // progress signal because that's what the user actually cares about
  // — "how am I performing", not "how much of the catalog have I touched"
  // (which is already shown explicitly in the purple attempt badge).
  // Falls back to 0 when accuracy is unavailable so the bar stays empty
  // instead of jumping around at startup.
  const fillStyle = useMemo<ViewStyle>(() => {
    const pct = item.accuracy ?? 0;
    const width = `${pct}%` as DimensionValue;
    return { width, backgroundColor: PROGRESS_BAR_COLOR };
  }, [item.accuracy]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        item.accuracy === null
          ? `${item.title}, ${item.attempted} of ${item.total} attempted`
          : `${item.title}, ${item.attempted} of ${item.total} attempted, ${item.accuracy} percent accuracy`
      }
      accessibilityHint="Opens the question list for this section"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptBadgeText}>
            Question Attempted {formatCount(item.attempted)}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, fillStyle]} />
      </View>

      <View style={styles.accuracyRow}>
        <Text style={styles.accuracyLabel}>Accuracy</Text>
        {item.accuracy === null ? (
          <Text style={styles.accuracyValueMissing}>—</Text>
        ) : (
          <Text style={styles.accuracyValue}>{item.accuracy}%</Text>
        )}
      </View>
      <Text style={styles.targetLabel}>
        Targeted Accuracy: {item.targetAccuracy}%
      </Text>
    </TouchableOpacity>
  );
};

export const SubcategoryProgressCard = React.memo(SubcategoryProgressCardImpl);
SubcategoryProgressCard.displayName = 'SubcategoryProgressCard';
