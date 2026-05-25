import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRightIcon, TagIcon } from '../../../../components/atoms/Icon';
import { TAG_COLOR_HEX } from '../constants';
import { getDifficultyStyles } from '../helpers';
import { scale } from '../scale';
import { styles } from '../styles';
import type { QuestionItem, TagColor } from '../types';

interface QuestionRowProps {
  item: QuestionItem;
  currentColor: Exclude<TagColor, 'none'> | undefined;
  taggingId: string | number | null;
  onPickTag: (id: string | number) => void;
  onView: (item: QuestionItem) => void;
}

// Single question row inside the FlatList. Memoized so unrelated state
// changes (refresh, search input keystrokes) don't re-render every row.
export const QuestionRow: React.FC<QuestionRowProps> = React.memo(
  ({ item, currentColor, taggingId, onPickTag, onView }) => {
    const diffStyle = getDifficultyStyles(item.difficulty);
    const tagIconColor = currentColor ? TAG_COLOR_HEX[currentColor] : '#8E8E93';

    const handlePickTag = useCallback(
      () => onPickTag(item.id),
      [onPickTag, item.id],
    );
    const handleView = useCallback(() => onView(item), [onView, item]);

    return (
      <View style={styles.questionsCardWrapper}>
        <View style={styles.questionItemRow}>
          <View style={styles.questionLeft}>
            <Text style={styles.questionTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>#{item.id}</Text>
              </View>
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
              <View
                style={[styles.diffBadge, { backgroundColor: diffStyle.bg }]}
              >
                <Text
                  style={[styles.diffBadgeText, { color: diffStyle.text }]}
                >
                  {item.difficulty}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.tagWrapper}
                onPress={handlePickTag}
                disabled={taggingId === item.id}
              >
                <TagIcon color={tagIconColor} tagged={!!currentColor} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleView}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>View</Text>
            <ChevronRightIcon size={scale(12)} color="#94C23C" strokeWidth={3} />
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />
      </View>
    );
  },
);
QuestionRow.displayName = 'QuestionRow';
