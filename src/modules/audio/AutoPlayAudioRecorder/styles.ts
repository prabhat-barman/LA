import { Dimensions, StyleSheet } from 'react-native';
import {
  Colors,
  fonts,
} from '../../../assets/font_color_&_family/font_color_and_family';

const { width } = Dimensions.get('window');

// Theme-aware factory. Cached behind useMemo at the call site so we
// don't repeatedly create the StyleSheet on every render.
export const buildRecorderStyles = (isDarkMode = false) => {
  const themedColors = {
    bg: isDarkMode ? '#1B1B1B' : Colors.backgroundColor,
    text: isDarkMode ? '#E0E0E0' : Colors.text_color,
    secondaryText: isDarkMode ? '#BBBBBB' : Colors.instruction_text_color,
    border: isDarkMode ? '#333' : Colors.border_color,
  };

  return StyleSheet.create({
    container: {
      backgroundColor: themedColors.bg,
      marginHorizontal: 0,
      marginVertical: 8,
      borderWidth: 0.5,
      borderRadius: 10,
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 60,
    },
    countdownContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    countdownText: {
      fontSize: 16,
      fontWeight: '600',
      color: themedColors.text,
      textAlign: 'center',
      fontFamily: fonts.DMSansRegular,
    },
    audioContainer: {
      alignItems: 'center',
      width: '100%',
      paddingVertical: 10,
    },
    phaseText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#007AFF',
      marginBottom: 8,
      fontFamily: fonts.DMSansRegular,
    },
    extensivePhaseText: {
      color: isDarkMode ? '#E0E0E0' : '#1b4e73',
    },
    timeText: {
      fontSize: 14,
      color: themedColors.text,
      fontWeight: '500',
      marginBottom: 8,
      fontFamily: fonts.DMSansRegular,
    },
    sliderContainer: { width: '100%', marginTop: 8 },
    slider: { width: '100%', height: 20 },
    recordingContainer: {
      alignItems: 'center',
      width: width * 0.8,
      padding: 10,
    },
    recordingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 16,
    },
    recordingIndicator: { flexDirection: 'row', alignItems: 'center' },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF4D4D',
      marginRight: 8,
    },
    recordingText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FF4D4D',
      fontFamily: fonts.DMSansRegular,
    },
    recordingTime: {
      fontSize: 14,
      color: themedColors.text,
      fontWeight: '500',
      fontFamily: fonts.DMSansRegular,
    },
    recordingProgress: {
      width: '100%',
      height: 4,
      backgroundColor: themedColors.border,
      borderRadius: 2,
      marginBottom: 16,
      overflow: 'hidden',
    },
    recordingProgressBar: { height: '100%', backgroundColor: '#FF4D4D' },
    stopButton: {
      backgroundColor: '#FF4D4D',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    stopButtonText: {
      color: Colors.white_Color,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: fonts.DMSansRegular,
    },
    completedContainer: { alignItems: 'center', paddingVertical: 16 },
    completedText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#22C55E',
      marginBottom: 4,
      fontFamily: fonts.DMSansRegular,
    },
    completedDetails: {
      fontSize: 14,
      color: themedColors.secondaryText,
      marginBottom: 4,
      fontFamily: fonts.DMSansRegular,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: themedColors.text,
      fontFamily: fonts.DMSansMedium,
      fontWeight: '600',
    },
    loadingSubText: {
      marginTop: 4,
      fontSize: 12,
      color: themedColors.secondaryText,
      fontFamily: fonts.DMSansRegular,
    },
    extensiveCountdownBox: {},
    extensiveCountdownText: {
      color: isDarkMode ? '#E0E0E0' : '#1b4e73',
    },
  });
};

export type RecorderStyles = ReturnType<typeof buildRecorderStyles>;
