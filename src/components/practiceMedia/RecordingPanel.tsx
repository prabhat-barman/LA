import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { mediaStyles } from './styles';
import { WaveformBar } from './WaveformBar';

interface RecordingPanelProps {
  secondsLeft: number;
  amplitude: Animated.Value | number;
  onStop: () => void;
  /** Number of waveform bars to render. Defaults to 24. */
  barCount?: number;
  /** Localisable labels. */
  badgeLabel?: string;
  stopLabel?: string;
}

/**
 * Active-recording panel. Shows the red "Recording" badge, live countdown,
 * animated waveform, and a stop button. Drop into any "recording in progress"
 * UI slot.
 */
export const RecordingPanel: React.FC<RecordingPanelProps> = ({
  secondsLeft,
  amplitude,
  onStop,
  barCount = 24,
  badgeLabel = 'Recording',
  stopLabel = 'Stop Recording',
}) => {
  return (
    <View style={mediaStyles.container}>
      <View style={mediaStyles.recordingHeaderRow}>
        <View style={mediaStyles.recordingBadge}>
          <View style={mediaStyles.recordingDot} />
          <Text style={mediaStyles.recordingBadgeText}>{badgeLabel}</Text>
        </View>
        <Text style={mediaStyles.recordingTimer}>{secondsLeft}s</Text>
      </View>

      <View style={mediaStyles.waveformContainer}>
        {Array.from({ length: barCount }).map((_, i) => (
          <WaveformBar
            key={i}
            isActive
            amplitude={amplitude}
            seed={(i + 1) / barCount}
          />
        ))}
      </View>

      <TouchableOpacity style={mediaStyles.stopBtn} onPress={onStop}>
        <Text style={mediaStyles.stopBtnText}>{stopLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};
