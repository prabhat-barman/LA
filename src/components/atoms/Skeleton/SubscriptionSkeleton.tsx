import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  count?: number;
}

/**
 * Plan card placeholder for the Subscription screen. Replaces the old
 * hand-rolled static grey blocks with the shared shimmer Skeleton atom
 * so the loading state matches the rest of the app visually.
 */
const PlanCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <Skeleton width="80%" height={scale(14)} borderRadius={scale(6)} />
    <Skeleton
      width="60%"
      height={scale(28)}
      borderRadius={scale(6)}
      style={styles.priceSpacing}
    />
    <Skeleton
      width="80%"
      height={scale(10)}
      borderRadius={scale(5)}
      style={styles.subSpacing}
    />
  </View>
);

export const SubscriptionSkeleton: React.FC<Props> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <PlanCardSkeleton key={idx} />
    ))}
  </>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginRight: scale(10),
    width: scale(150),
    borderWidth: 1.5,
    borderColor: '#EAECEF',
    minHeight: scale(140),
    paddingTop: scale(20),
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  priceSpacing: {
    marginTop: scale(8),
  },
  subSpacing: {
    marginTop: scale(6),
  },
});

export default SubscriptionSkeleton;
