import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon } from '../atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const SIDE_SLOT_WIDTH = scale(40);

interface SubHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}

export const SubHeader: React.FC<SubHeaderProps> = ({ title, onBack, rightElement }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top, height: scale(56) + insets.top },
      ]}
    >
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={HIT_SLOP}>
        <ChevronLeftIcon size={scale(24)} color="#1C1F2A" strokeWidth={2} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightContainer}>{rightElement}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingHorizontal: scale(16),
  },
  backButton: {
    width: SIDE_SLOT_WIDTH,
    height: SIDE_SLOT_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    textAlign: 'center',
    marginHorizontal: scale(8),
  },
  rightContainer: {
    width: SIDE_SLOT_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
