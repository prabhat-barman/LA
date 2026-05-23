import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
export const scale = (size: number) => (screenWidth / 375) * size;

/**
 * Shared StyleSheet for the practice-media UI atoms. Mirrors the inline
 * styling that previously lived inside `PracticeQuestionDetailScreen` so
 * extracting the components is purely visual-parity work.
 */
export const mediaStyles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: scale(8),
  },

  /** Horizontal row used by status banners (audio wait, audio playing, etc.). */
  rowContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: scale(8),
    flexDirection: 'row',
    justifyContent: 'center',
  },

  iconLeftSpacer: {
    marginLeft: scale(6),
  },

  boldText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  inlineText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Prep timer row
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(10),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
  },
  prepText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
  },
  prepTimerText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1A2151',
  },
  recordNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#94C23C',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    gap: scale(4),
  },
  recordNowBtnText: {
    color: colors.white,
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // Recording active state
  recordingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: scale(12),
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: scale(12),
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    gap: scale(4),
  },
  recordingDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#FF3B30',
  },
  recordingBadgeText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  recordingTimer: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    height: scale(40),
    width: '100%',
    marginBottom: scale(12),
  },
  waveformBar: {
    width: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#94C23C',
    minHeight: scale(4),
  },

  // Stop / Skip / Re-record buttons
  stopBtn: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    width: '100%',
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#FF3B30',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  skipBtn: {
    marginLeft: scale(8),
    backgroundColor: '#F2F2F7',
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
  },
  skipBtnText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1C1E',
  },
  reRecordBtn: {
    borderWidth: 1,
    borderColor: '#8E8E93',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    width: '100%',
    alignItems: 'center',
  },
  reRecordBtnText: {
    color: '#48484A',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // Review state
  reviewWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: scale(12),
  },
  noRecordWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: scale(12),
  },
  noRecordText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  submittingText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#94C23C',
    marginLeft: scale(8),
  },

  // Playback bar
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(10),
    padding: scale(8),
    width: '100%',
    gap: scale(8),
  },
  playbackBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#94C23C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackBarsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
    height: scale(36),
  },
  playbackBar: {
    width: scale(2),
    borderRadius: scale(1),
  },
  playbackTimeText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
    width: scale(32),
    textAlign: 'center',
  },
});
