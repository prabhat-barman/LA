import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  count?: number;
}

const QuestionItemSkeleton: React.FC = () => (
  <View style={styles.row}>
    <View style={styles.body}>
      <Skeleton width="85%" height={scale(16)} style={styles.titleSpacing} />
      <View style={styles.metaRow}>
        <Skeleton width={scale(40)} height={scale(18)} borderRadius={scale(10)} />
        <Skeleton width={scale(70)} height={scale(18)} borderRadius={scale(10)} />
        <Skeleton width={scale(16)} height={scale(16)} borderRadius={scale(8)} />
      </View>
    </View>
    <Skeleton width={scale(65)} height={scale(32)} borderRadius={scale(10)} />
  </View>
);

/**
 * Placeholder list for the Practice question-type listing while questions
 * are being fetched. Renders dividers between items so the height delta
 * to the real list is minimal.
 */
export const PracticeCommonListSkeleton: React.FC<Props> = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <View key={idx}>
        <QuestionItemSkeleton />
        {idx < count - 1 ? <View style={styles.separator} /> : null}
      </View>
    ))}
  </>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
    backgroundColor: colors.white,
  },
  body: {
    flex: 1,
  },
  titleSpacing: {
    marginBottom: scale(8),
  },
  metaRow: {
    flexDirection: 'row',
    gap: scale(6),
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F7',
  },
});

export default PracticeCommonListSkeleton;
