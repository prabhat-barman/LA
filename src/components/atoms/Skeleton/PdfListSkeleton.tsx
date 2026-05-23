import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  count?: number;
}

const PdfItemSkeleton: React.FC = () => (
  <View style={styles.row}>
    <Skeleton width={scale(44)} height={scale(44)} borderRadius={scale(10)} />
    <View style={styles.body}>
      <Skeleton width="70%" height={scale(14)} style={styles.titleSpacing} />
      <Skeleton width="45%" height={scale(11)} style={styles.metaSpacing} />
      <View style={styles.metaRow}>
        <Skeleton width={scale(36)} height={scale(11)} />
        <Skeleton width={scale(56)} height={scale(11)} />
      </View>
    </View>
  </View>
);

/**
 * Container-aware skeleton for the PDF list screen. Renders `count` rows
 * separated by dividers, wrapped in the same card chrome as the live list
 * so the layout reflows are minimal once data arrives.
 */
export const PdfListSkeleton: React.FC<Props> = ({ count = 5 }) => (
  <View style={styles.container}>
    {Array.from({ length: count }).map((_, idx) => (
      <View key={idx}>
        <PdfItemSkeleton />
        {idx < count - 1 ? <View style={styles.divider} /> : null}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
  },
  body: {
    flex: 1,
    marginLeft: scale(12),
  },
  titleSpacing: {
    marginBottom: scale(8),
  },
  metaSpacing: {
    marginBottom: scale(10),
  },
  metaRow: {
    flexDirection: 'row',
    gap: scale(14),
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
  },
});

export default PdfListSkeleton;
