import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { mediaStyles, scale } from './styles';

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

interface RecordedPlaybackBarProps {
  isPlaying: boolean;
  /** Current position in **seconds**. */
  positionSec: number;
  /** Total duration in **seconds**. */
  durationSec: number;
  onPlayPause: () => void;
  /** Number of static bars in the visualiser. Defaults to 30. */
  barCount?: number;
}

const DEFAULT_BAR_HEIGHTS = [
  8, 12, 16, 10, 14, 22, 26, 20, 14, 24,
  30, 18, 12, 16, 22, 18, 12, 8, 10, 16,
  22, 26, 20, 14, 18, 12, 10, 8, 6, 4,
];

/**
 * Static-bar playback visualiser for a previously-recorded clip. Filled bars
 * indicate playback progress. Press the play/pause button to toggle.
 */
export const RecordedPlaybackBar: React.FC<RecordedPlaybackBarProps> = ({
  isPlaying,
  positionSec,
  durationSec,
  onPlayPause,
  barCount = 30,
}) => {
  const heights = useMemo(() => {
    if (barCount === DEFAULT_BAR_HEIGHTS.length) return DEFAULT_BAR_HEIGHTS;
    // Up/down-sample the default pattern so callers can pick any bar count
    // without us redesigning a new waveform pattern per request.
    return Array.from({ length: barCount }, (_, i) =>
      DEFAULT_BAR_HEIGHTS[i % DEFAULT_BAR_HEIGHTS.length],
    );
  }, [barCount]);

  const progress = durationSec > 0 ? positionSec / durationSec : 0;

  return (
    <View style={mediaStyles.playbackContainer}>
      <TouchableOpacity onPress={onPlayPause} style={mediaStyles.playbackBtn}>
        {isPlaying ? (
          <Svg width={scale(12)} height={scale(12)} viewBox="0 0 24 24" fill="none">
            <Rect x="5" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
            <Rect x="15" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
          </Svg>
        ) : (
          <Svg width={scale(12)} height={scale(12)} viewBox="0 0 24 24" fill="none">
            <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
          </Svg>
        )}
      </TouchableOpacity>

      <View style={mediaStyles.playbackBarsWrapper}>
        {heights.map((h, i) => {
          const barProgress = i / heights.length;
          const isActive = progress >= barProgress;
          return (
            <View
              key={i}
              style={[
                mediaStyles.playbackBar,
                {
                  height: scale(h),
                  backgroundColor: isActive ? '#94C23C' : '#E5E5EA',
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={mediaStyles.playbackTimeText}>{formatTime(positionSec)}</Text>
    </View>
  );
};
