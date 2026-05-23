import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Skeleton } from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const MockTestCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Skeleton width="55%" height={scale(15)} />
      <Skeleton
        width={scale(50)}
        height={scale(20)}
        borderRadius={scale(10)}
      />
    </View>
    <Skeleton width="95%" height={scale(11)} style={styles.mb6} />
    <Skeleton width="70%" height={scale(11)} style={styles.mb12} />
    <Skeleton width={scale(60)} height={scale(11)} style={styles.mb16} />
    <Skeleton
      width="100%"
      height={scale(40)}
      borderRadius={scale(12)}
    />
  </View>
);

export const MockTestSkeleton: React.FC = () => (
  <View style={styles.list}>
    {[0, 1, 2, 3].map((i) => (
      <MockTestCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: scale(16),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  mb6: { marginBottom: scale(6) },
  mb12: { marginBottom: scale(12) },
  mb16: { marginBottom: scale(16) },
});
