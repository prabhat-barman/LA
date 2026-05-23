import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  count?: number;
}

const PredictionRowSkeleton: React.FC = () => (
  <View style={styles.rowSkeleton}>
    <View style={styles.header}>
      <Skeleton width={scale(40)} height={scale(40)} borderRadius={scale(10)} />
      <View style={styles.headerText}>
        <Skeleton width="55%" height={scale(14)} style={styles.titleSpacing} />
        <Skeleton width="35%" height={scale(11)} />
      </View>
      <Skeleton width={scale(48)} height={scale(20)} borderRadius={scale(10)} />
    </View>
    <Skeleton
      width="100%"
      height={scale(8)}
      borderRadius={scale(4)}
      style={styles.barSpacingLarge}
    />
    <Skeleton
      width="100%"
      height={scale(8)}
      borderRadius={scale(4)}
      style={styles.barSpacing}
    />
  </View>
);

export const MonthlyPredictionSkeleton: React.FC<Props> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <PredictionRowSkeleton key={idx} />
    ))}
  </>
);

const styles = StyleSheet.create({
  rowSkeleton: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: scale(12),
  },
  titleSpacing: {
    marginBottom: scale(6),
  },
  barSpacingLarge: {
    marginTop: scale(14),
  },
  barSpacing: {
    marginTop: scale(10),
  },
});

export default MonthlyPredictionSkeleton;
