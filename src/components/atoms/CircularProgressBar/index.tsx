import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { CircularProgressIcon } from '../Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  max?: number;
  color?: string;
  trackColor?: string;
}

export const CircularProgressBar = ({
  size = scale(90),
  strokeWidth = scale(8),
  progress = 43,
  max = 90,
  color = '#85B82B',
  trackColor = '#E5E5EA',
}: CircularProgressProps) => {
  return (
    <View style={[styles.progressWrapper, { width: size, height: size }]}>
      <CircularProgressIcon
        size={size}
        strokeWidth={strokeWidth}
        progress={progress}
        max={max}
        color={color}
        trackColor={trackColor}
      />
      <View style={styles.absoluteCenter}>
        <Text style={styles.progressText}>{progress}</Text>
        <Text style={styles.progressSubText}>/ {max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  progressSubText: {
    fontSize: scale(10),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
