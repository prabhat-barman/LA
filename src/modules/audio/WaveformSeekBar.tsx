import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { screenWidth } from '../../assets/scale/scale';
import { Colors } from '../../assets/font_color_&_family/font_color_and_family';

export interface WaveformSeekBarProps {
  progress?: number;
  isPlaying?: boolean;
  onSeek?: (ratio: number) => void;
  seekWidth?: number;
  disabled?: boolean;
  isDarkMode?: boolean;
  isExtensive?: boolean;
}

export default function WaveformSeekBar({
  progress = 0,
  isPlaying = false,
  onSeek,
  seekWidth = screenWidth * 0.5,
  disabled = false,
  isDarkMode = false,
  isExtensive = false,
}: WaveformSeekBarProps) {
  const validSeekWidth = Math.max(100, seekWidth || screenWidth * 0.5);
  const BAR_COUNT = Math.max(1, Math.floor(validSeekWidth / 4.4));

  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => 6 + Math.random() * 16),
    [BAR_COUNT],
  );

  const activeColor = isExtensive
    ? isDarkMode
      ? '#90CAF9'
      : '#1b4e73'
    : Colors.green_color_light;

  const inactiveColor = isDarkMode ? '#555555' : '#E5E7EB';

  return (
    <View style={[styles.container, { width: validSeekWidth }]}>
      {bars.map((h, i) => {
        const isActive = i / BAR_COUNT <= progress;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => onSeek && onSeek(Math.min(1, Math.max(0, i / BAR_COUNT)))}
            disabled={disabled}
          >
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, h),
                  backgroundColor: isActive ? activeColor : inactiveColor,
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  bar: {
    width: 2,
    marginHorizontal: 1.2,
    borderRadius: 2,
  },
});
