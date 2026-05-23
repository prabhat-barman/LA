import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Skeleton } from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const VideoCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <Skeleton
      width={scale(110)}
      height={scale(72)}
      borderRadius={scale(10)}
    />
    <View style={styles.cardInfo}>
      <Skeleton
        width={scale(80)}
        height={scale(10)}
        borderRadius={scale(4)}
        style={styles.line}
      />
      <Skeleton
        width="90%"
        height={scale(13)}
        borderRadius={scale(4)}
        style={styles.line}
      />
      <Skeleton
        width="60%"
        height={scale(13)}
        borderRadius={scale(4)}
        style={styles.line}
      />
      <Skeleton
        width={scale(120)}
        height={scale(10)}
        borderRadius={scale(4)}
      />
    </View>
  </View>
);

interface VideosSkeletonProps {
  count?: number;
}

export const VideosSkeleton: React.FC<VideosSkeletonProps> = ({ count = 4 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <VideoCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  cardInfo: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  line: {
    marginBottom: scale(6),
  },
});
