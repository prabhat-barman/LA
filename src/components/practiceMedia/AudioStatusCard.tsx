import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { mediaStyles, scale } from './styles';

/**
 * "Audio starting in Ns" pre-roll banner. Used when `metadata.waitTimeBeforeAudio > 0`.
 */
export const AudioWaitCard: React.FC<{ secondsLeft: number }> = ({
  secondsLeft,
}) => {
  return (
    <View style={mediaStyles.rowContainer}>
      <Svg width={scale(14)} height={scale(14)} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke="#5C527F" strokeWidth="2" />
        <Path d="M12 8V12" stroke="#5C527F" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="15" r="1" fill="#5C527F" />
      </Svg>
      <Text style={[mediaStyles.inlineText, mediaStyles.iconLeftSpacer]}>
        Audio starting in{' '}
        <Text style={mediaStyles.boldText}>{secondsLeft}s</Text>
      </Text>
    </View>
  );
};

/**
 * "Listening to audio..." banner with a Skip CTA. Shown while question audio
 * is actively playing.
 */
export const AudioPlayingCard: React.FC<{
  onSkip?: () => void;
  label?: string;
  skipLabel?: string;
  showSkip?: boolean;
}> = ({
  onSkip,
  label = 'Listening to audio... ',
  skipLabel = 'Skip',
  showSkip = true,
}) => {
  return (
    <View style={mediaStyles.rowContainer}>
      <ActivityIndicator size="small" color="#94C23C" />
      <Text style={[mediaStyles.inlineText, mediaStyles.iconLeftSpacer]}>
        {label}
      </Text>
      {showSkip && onSkip && (
        <TouchableOpacity style={mediaStyles.skipBtn} onPress={onSkip}>
          <Text style={mediaStyles.skipBtnText}>{skipLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Submitting / analysing spinner. Generic enough to drop into any "we're
 * scoring your answer" UI slot.
 */
export const SubmittingCard: React.FC<{ label?: string }> = ({
  label = 'Analyzing with AI...',
}) => {
  return (
    <View style={mediaStyles.rowContainer}>
      <ActivityIndicator size="small" color="#94C23C" />
      <Text style={mediaStyles.submittingText}>{label}</Text>
    </View>
  );
};
