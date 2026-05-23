import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle } from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const Card: React.FC<React.PropsWithChildren<{ style?: any }>> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

const PracticeRow: React.FC = () => (
  <View style={styles.practiceRow}>
    {[0, 1].map((i) => (
      <View key={i} style={styles.practiceCard}>
        <SkeletonCircle size={scale(36)} style={styles.mb12} />
        <Skeleton width="70%" height={scale(11)} style={styles.mb6} />
        <Skeleton width="50%" height={scale(11)} />
      </View>
    ))}
  </View>
);

const VideoCardHorizontalSkeleton: React.FC = () => (
  <View style={styles.videoCardH}>
    <Skeleton
      width={scale(160)}
      height={scale(100)}
      borderRadius={scale(12)}
      style={styles.mb6}
    />
    <Skeleton width={scale(140)} height={scale(11)} />
  </View>
);

export const DashboardSkeleton: React.FC = () => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    {/* Header (avatar + name + bell) */}
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <SkeletonCircle size={scale(40)} />
        <View style={styles.headerText}>
          <Skeleton width={scale(60)} height={scale(10)} style={styles.mb4} />
          <Skeleton width={scale(110)} height={scale(14)} />
        </View>
      </View>
      <SkeletonCircle size={scale(36)} />
    </View>

    {/* Welcome card */}
    <Card>
      <Skeleton width="60%" height={scale(16)} style={styles.mb6} />
      <Skeleton width="80%" height={scale(11)} style={styles.mb16} />
      <PracticeRow />
      <View style={[styles.practiceRow, styles.mt12]}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.practiceCard}>
            <SkeletonCircle size={scale(36)} style={styles.mb12} />
            <Skeleton width="70%" height={scale(11)} style={styles.mb6} />
            <Skeleton width="50%" height={scale(11)} />
          </View>
        ))}
      </View>
    </Card>

    {/* Mic / Upcoming class row */}
    <Card>
      <View style={styles.row}>
        <Skeleton width={scale(120)} height={scale(14)} />
        <Skeleton width={scale(70)} height={scale(28)} borderRadius={scale(14)} />
      </View>
    </Card>

    <Card>
      <Skeleton width={scale(140)} height={scale(14)} style={styles.mb12} />
      <Skeleton width="90%" height={scale(11)} style={styles.mb6} />
      <Skeleton width="60%" height={scale(11)} style={styles.mb12} />
      <Skeleton width={scale(90)} height={scale(28)} borderRadius={scale(14)} />
    </Card>

    {/* AI Predicted Score */}
    <Card>
      <View style={styles.row}>
        <Skeleton width={scale(140)} height={scale(14)} />
        <Skeleton width={scale(110)} height={scale(11)} />
      </View>
      <View style={[styles.scoreRow, styles.mt16]}>
        <SkeletonCircle size={scale(96)} />
        <View style={styles.scoreRight}>
          <Skeleton width="80%" height={scale(11)} style={styles.mb6} />
          <Skeleton width={scale(50)} height={scale(20)} style={styles.mb12} />
          <Skeleton width="100%" height={scale(40)} borderRadius={scale(8)} />
        </View>
      </View>
      <View style={[styles.breakdownGrid, styles.mt16]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.breakdownCell}>
            <SkeletonCircle size={scale(20)} style={styles.mr8} />
            <Skeleton width={scale(60)} height={scale(11)} />
          </View>
        ))}
      </View>
    </Card>

    {/* PTE Tutorial Videos */}
    <View style={styles.sectionHeader}>
      <Skeleton width={scale(150)} height={scale(15)} />
    </View>

    <View style={styles.tabsRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          width={scale(60)}
          height={scale(28)}
          borderRadius={scale(14)}
          style={styles.tabSkel}
        />
      ))}
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.videoList}
    >
      {[0, 1, 2].map((i) => (
        <VideoCardHorizontalSkeleton key={i} />
      ))}
    </ScrollView>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  content: {
    paddingBottom: scale(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(50),
    paddingBottom: scale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: scale(10),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  practiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  practiceCard: {
    width: '48%',
    paddingVertical: scale(14),
    paddingHorizontal: scale(12),
    backgroundColor: '#F4F5F7',
    borderRadius: scale(12),
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreRight: {
    flex: 1,
    marginLeft: scale(16),
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  breakdownCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  sectionHeader: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
  },
  tabSkel: {
    marginRight: scale(8),
  },
  videoList: {
    paddingHorizontal: scale(16),
  },
  videoCardH: {
    marginRight: scale(12),
  },
  mb4: { marginBottom: scale(4) },
  mb6: { marginBottom: scale(6) },
  mb12: { marginBottom: scale(12) },
  mb16: { marginBottom: scale(16) },
  mt12: { marginTop: scale(12) },
  mt16: { marginTop: scale(16) },
  mr8: { marginRight: scale(8) },
});
