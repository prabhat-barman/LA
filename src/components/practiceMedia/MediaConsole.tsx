import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { PlayIcon, CaretDownIcon, OpenBookIcon } from '../atoms/Icon';
import { useRecorder } from '../../context/RecorderContext';
import { LiveAudioProgressBar } from './LiveAudioProgressBar';
import { MediaStatusInline } from './MediaStatusInline';
import { Data, QuestionMetadata } from '../../config/practiceData';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export interface MediaConsoleRef {
  reset: () => Promise<void>;
  replayAudio: () => Promise<void>;
  getRecordedUri: () => string | null;
  getRecordingDurationSec: () => number;
  /**
   * If the recorder is currently capturing audio, stop it cleanly. No-op
   * otherwise. Used by callers that want to free the mic without doing a
   * full reset of the question media flow.
   */
  stopRecordingIfActive: () => Promise<void>;
  /** Current media phase, e.g. 'recording', 'audio_playing', 'review'. */
  getPhase: () => string;
}

interface MediaConsoleProps {
  metadata: QuestionMetadata;
  isCore: boolean;
  questionAudioUrl: string | undefined;
  questionDetailsLoaded: boolean;
  selectedMode: 'Normal' | 'One Line Strategy';
  categoryId: number;
  isSubmitting: boolean;
  onRecordedUriChange: (uri: string | null, durationSec: number) => void;
  onError: (msg: string) => void;
}

export const MediaConsole = React.memo(forwardRef<MediaConsoleRef, MediaConsoleProps>(({
  metadata,
  isCore,
  questionAudioUrl,
  questionDetailsLoaded,
  selectedMode,
  categoryId,
  isSubmitting,
  onRecordedUriChange,
  onError,
}, ref) => {
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);

  const mediaFlow = useRecorder();

  // Initialize the global recorder when question parameters change
  useEffect(() => {
    mediaFlow.initQuestion({
      metadata,
      isCore,
      audioUrl: questionAudioUrl,
      autoStart: questionDetailsLoaded,
      onError,
    });
  }, [metadata, isCore, questionAudioUrl, questionDetailsLoaded, onError]);

  // Sync playback rate to hook
  const { setPlaybackRate } = mediaFlow;
  useEffect(() => {
    setPlaybackRate(selectedSpeed).catch(() => {});
  }, [selectedSpeed, setPlaybackRate]);

  // Sync recorded URI changes back to parent
  useEffect(() => {
    onRecordedUriChange(mediaFlow.recordedUri, mediaFlow.recordingDurationSec);
  }, [mediaFlow.recordedUri, mediaFlow.recordingDurationSec, onRecordedUriChange]);

  // Expose handles to parent via ref
  useImperativeHandle(ref, () => ({
    reset: async () => {
      await mediaFlow.reset();
    },
    replayAudio: async () => {
      await mediaFlow.replayAudio();
    },
    getRecordedUri: () => {
      return mediaFlow.recordedUri;
    },
    getRecordingDurationSec: () => {
      return mediaFlow.recordingDurationSec;
    },
    stopRecordingIfActive: async () => {
      if (mediaFlow.phase === 'recording') {
        await mediaFlow.stopRecording();
      }
    },
    getPhase: () => mediaFlow.phase,
  }));

  return (
    <View style={styles.consoleContainer}>
      {/* Audio question display (Repeat Sentence, Retell Lecture, ASQ) */}
      {metadata.hasAudio && (
        <View style={styles.audioDisplayContainer}>
          <View style={styles.audioIconBadge}>
            <OpenBookIcon size={scale(24)} color="#007AFF" />
          </View>
          <Text style={styles.audioLabel}>Listen to the audio question</Text>

          {mediaFlow.phase === 'audio_playing' ? (
            <LiveAudioProgressBar />
          ) : (
            <TouchableOpacity
              style={styles.questionAudioPlayBtn}
              onPress={() => mediaFlow.replayAudio()}
              disabled={!questionAudioUrl}
            >
              <PlayIcon size={scale(12)} color="#007AFF" />
              <Text style={styles.questionAudioPlayText}>Play Audio</Text>
            </TouchableOpacity>
          )}


          {/* Speed Controls Selector */}
          <View style={styles.speedControlsWrapper}>
            <TouchableOpacity
              style={styles.speedSelectorBtn}
              onPress={() => setSpeedDropdownOpen(!speedDropdownOpen)}
              activeOpacity={0.8}
            >
              <Text style={styles.speedSelectorText}>Speed: {selectedSpeed}x</Text>
              <CaretDownIcon size={scale(10)} color="#1C1C1E" expanded={speedDropdownOpen} />
            </TouchableOpacity>

            {speedDropdownOpen && (
              <View style={styles.speedDropdown}>
                {Data.audiovariableSpeed.map(speedItem => (
                  <TouchableOpacity
                    key={speedItem.id}
                    style={[styles.speedItem, selectedSpeed === speedItem.id && styles.speedItemActive]}
                    onPress={() => {
                      setSelectedSpeed(speedItem.id);
                      setSpeedDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.speedItemText, selectedSpeed === speedItem.id && styles.speedItemTextActive]}>
                      {speedItem.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Integrated Status / Controls (Prep / Recording / Review) */}
      <View style={styles.statusSectionDivider} />

      <MediaStatusInline flow={mediaFlow} isSubmitting={isSubmitting} />
    </View>
  );
}));

const styles = StyleSheet.create({
  consoleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  audioDisplayContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: scale(12),
  },
  audioIconBadge: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  audioLabel: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1C1F2A',
    marginBottom: scale(12),
  },
  playbackProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: scale(8),
    marginBottom: scale(16),
  },
  progressTimeText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    width: scale(32),
    textAlign: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: scale(6),
    backgroundColor: '#E5E5EA',
    borderRadius: scale(3),
    marginHorizontal: scale(8),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: scale(3),
  },
  questionAudioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F1FF',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    gap: scale(6),
    marginBottom: scale(12),
  },
  questionAudioPlayText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  speedControlsWrapper: {
    zIndex: 10,
    alignItems: 'center',
  },
  speedSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    gap: scale(4),
  },
  speedSelectorText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1C1E',
  },
  speedDropdown: {
    position: 'absolute',
    bottom: scale(32),
    backgroundColor: colors.white,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    width: scale(100),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  speedItem: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  speedItemActive: {
    backgroundColor: '#F2F2F7',
  },
  speedItemText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1C1C1E',
  },
  speedItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statusSectionDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: scale(16),
    width: '100%',
  },
});
