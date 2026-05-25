import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  BookIcon,
  ChevronRightIcon,
  HeadphonesIcon,
  MicIcon,
  PenIcon,
} from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';
import type { PracticeCounts } from '../types';

interface CategoryCardProps {
  Icon: typeof MicIcon;
  color: string;
  title: string;
  counts: PracticeCounts;
  onPress: () => void;
}

const CategoryCard = React.memo<CategoryCardProps>(
  ({ Icon, color, title, counts, onPress }) => {
    return (
      <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
        <View style={styles.categoryHeader}>
          <Icon size={scale(24)} color={color} />
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>View</Text>
            <ChevronRightIcon size={scale(12)} color={color} />
          </View>
        </View>
        <Text style={styles.categoryTitle}>{title}</Text>
        <View style={styles.countContainer}>
          <Text style={styles.boldCount}>{counts.done}</Text>
          <Text style={styles.totalCount}> / {counts.total}</Text>
        </View>
        <Text style={styles.categorySubText}>Questions Practiced</Text>
      </TouchableOpacity>
    );
  },
);
CategoryCard.displayName = 'CategoryCard';

interface CategoriesGridProps {
  speakingCounts: PracticeCounts;
  writingCounts: PracticeCounts;
  readingCounts: PracticeCounts;
  listeningCounts: PracticeCounts;
  onPracticePress: (category: string) => void;
}

// 2x2 grid of speaking/writing/reading/listening category cards. Each
// card is a tiny memoized component that only re-renders when its own
// counts/handler change.
export const CategoriesGrid: React.FC<CategoriesGridProps> = React.memo(
  ({
    speakingCounts,
    writingCounts,
    readingCounts,
    listeningCounts,
    onPracticePress,
  }) => {
    return (
      <View style={styles.categoriesGrid}>
        <View style={styles.row}>
          <CategoryCard
            Icon={MicIcon}
            color="#007AFF"
            title="Speaking"
            counts={speakingCounts}
            onPress={() => onPracticePress('Speaking')}
          />
          <CategoryCard
            Icon={PenIcon}
            color="#34C759"
            title="Writing"
            counts={writingCounts}
            onPress={() => onPracticePress('Writing')}
          />
        </View>
        <View style={styles.row}>
          <CategoryCard
            Icon={BookIcon}
            color="#FF9500"
            title="Reading"
            counts={readingCounts}
            onPress={() => onPracticePress('Reading')}
          />
          <CategoryCard
            Icon={HeadphonesIcon}
            color="#AF52DE"
            title="Listening"
            counts={listeningCounts}
            onPress={() => onPracticePress('Listening')}
          />
        </View>
      </View>
    );
  },
);
CategoriesGrid.displayName = 'CategoriesGrid';
