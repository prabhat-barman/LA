import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Skeleton } from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const SubcategoryCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Skeleton
        width={scale(36)}
        height={scale(36)}
        borderRadius={scale(10)}
      />
      <Skeleton
        width={scale(20)}
        height={scale(20)}
        borderRadius={scale(10)}
      />
    </View>
    <Skeleton width="70%" height={scale(15)} style={styles.mb14} />
    <View style={styles.progressRow}>
      <Skeleton width={scale(50)} height={scale(11)} />
      <Skeleton width={scale(70)} height={scale(11)} />
    </View>
    <Skeleton
      width="100%"
      height={scale(8)}
      borderRadius={scale(4)}
      style={styles.mb16}
    />
    <Skeleton
      width="100%"
      height={scale(40)}
      borderRadius={scale(12)}
    />
  </View>
);

export const PracticeSkeleton: React.FC = () => (
  <View style={styles.container}>
    {/* Category Tabs */}
    <View style={styles.categoryRow}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          width={scale(78)}
          height={scale(34)}
          borderRadius={scale(20)}
          style={styles.tab}
        />
      ))}
    </View>

    {/* Token badge placeholder */}
    <Skeleton
      width={scale(140)}
      height={scale(28)}
      borderRadius={scale(14)}
      style={styles.tokenBadge}
    />

    {/* Subcategory Cards */}
    <View style={styles.list}>
      {[0, 1, 2, 3].map((i) => (
        <SubcategoryCardSkeleton key={i} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: scale(8),
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(6),
  },
  tab: {
    marginRight: scale(2),
  },
  tokenBadge: {
    marginLeft: scale(16),
    marginBottom: scale(16),
  },
  list: {
    paddingHorizontal: scale(16),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  mb14: { marginBottom: scale(14) },
  mb16: { marginBottom: scale(16) },
});
