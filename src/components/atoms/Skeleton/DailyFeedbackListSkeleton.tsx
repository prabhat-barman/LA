import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  count?: number;
}

/**
 * Loading placeholder for each row in the Daily Feedback list screen.
 * Mirrors the visual rhythm of a real feedback card (tags row, title,
 * description, score footer) so the layout doesn't jump on data arrival.
 */
const FeedbackCardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <View style={styles.tagsRow}>
      <Skeleton width={scale(54)} height={scale(18)} borderRadius={scale(9)} />
      <Skeleton width={scale(34)} height={scale(18)} borderRadius={scale(9)} />
    </View>
    <Skeleton width="70%" height={scale(15)} style={styles.titleSpacing} />
    <Skeleton width="100%" height={scale(11)} style={styles.lineSpacing} />
    <Skeleton width="80%" height={scale(11)} style={styles.lineSpacingTight} />
    <View style={styles.footerRow}>
      <Skeleton width={scale(60)} height={scale(13)} />
      <Skeleton width={scale(110)} height={scale(28)} borderRadius={scale(14)} />
    </View>
  </View>
);

export const DailyFeedbackListSkeleton: React.FC<Props> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <FeedbackCardSkeleton key={idx} />
    ))}
  </>
);

const styles = StyleSheet.create({
  cardSkeleton: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  titleSpacing: {
    marginTop: scale(10),
  },
  lineSpacing: {
    marginTop: scale(8),
  },
  lineSpacingTight: {
    marginTop: scale(4),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(12),
  },
});

export default DailyFeedbackListSkeleton;
