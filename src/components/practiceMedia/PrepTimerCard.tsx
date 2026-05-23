import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MicIcon } from '../atoms/Icon';
import { mediaStyles, scale } from './styles';

interface PrepTimerCardProps {
  secondsLeft: number;
  onRecordNow: () => void;
  label?: string;
  ctaLabel?: string;
}

/**
 * Prep-time countdown pill with an inline "Record Now" CTA. Matches the
 * design used in the practice screen — the user can wait the timer out or
 * jump straight into recording.
 */
export const PrepTimerCard: React.FC<PrepTimerCardProps> = ({
  secondsLeft,
  onRecordNow,
  label = 'Prep Time',
  ctaLabel = 'Record Now',
}) => {
  return (
    <View style={mediaStyles.container}>
      <View style={mediaStyles.prepRow}>
        <Text style={mediaStyles.prepText}>
          {label}:{' '}
          <Text style={mediaStyles.prepTimerText}>{secondsLeft}s</Text>
        </Text>
        <TouchableOpacity style={mediaStyles.recordNowBtn} onPress={onRecordNow}>
          <MicIcon size={scale(14)} color="#FFFFFF" />
          <Text style={mediaStyles.recordNowBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
