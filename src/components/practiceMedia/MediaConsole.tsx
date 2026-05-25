import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { PlayIcon, CaretDownIcon, OpenBookIcon } from '../atoms/Icon';
import { useRecorder } from '../../context/RecorderContext';
import { LiveAudioProgressBar } from './LiveAudioProgressBar';
import { MediaStatusInline } from './MediaStatusInline';
import { UnifiedMediaBar } from './UnifiedMediaBar';
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

/**
 * Voice variant entry from the API's per-question `question_audios` list.
 * `value` is the storage path of the recorded mp3, `label` is the voice
 * display name (e.g. "Lily").
 */
export interface MediaConsoleVoiceVariant {
  label: string;
  value: string;
}

interface MediaConsoleProps {
  metadata: QuestionMetadata;
  isCore: boolean;
  questionAudioUrl: string | undefined;
  questionDetailsLoaded: boolean;
  selectedMode: 'Normal' | 'One Line Strategy';
  categoryId: number;
  isSubmitting: boolean;
  /**
   * Voice variants available for the current question. The console doesn't
   * own this state — it's lifted to the screen so it can drive
   * `questionAudioUrl`. Pass an empty array (or omit) for question types
   * without variants.
   */
  availableVoices?: MediaConsoleVoiceVariant[];
  selectedVoiceLabel?: string | null;
  onSelectVoice?: (label: string) => void;
  onRecordedUriChange: (uri: string | null, durationSec: number) => void;
  onError: (msg: string) => void;
}

export const MediaConsole = React.memo(forwardRef<MediaConsoleRef, MediaConsoleProps>(({
  metadata,
  isCore,
  questionAudioUrl,
  questionDetailsLoaded,
  // selectedMode + categoryId are part of the public prop contract for
  // future expansion (mode-specific UI, per-category telemetry); they
  // are intentionally accepted but unused today.
  selectedMode: _selectedMode,
  categoryId: _categoryId,
  isSubmitting,
  availableVoices,
  selectedVoiceLabel,
  onSelectVoice,
  onRecordedUriChange,
  onError,
}, ref) => {
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);

  const mediaFlow = useRecorder();

  // Pull initQuestion out so the effect's dependency list is explicit;
  // the previous shape used `mediaFlow` indirectly which tripped
  // exhaustive-deps. `initQuestion` is stable across renders inside
  // RecorderContext so this still re-runs only when the question
  // identity actually changes.
  const { initQuestion } = mediaFlow;
  useEffect(() => {
    initQuestion({
      metadata,
      isCore,
      audioUrl: questionAudioUrl,
      autoStart: questionDetailsLoaded,
      onError,
    });
  }, [initQuestion, metadata, isCore, questionAudioUrl, questionDetailsLoaded, onError]);

  const { setPlaybackRate } = mediaFlow;
  useEffect(() => {
    setPlaybackRate(selectedSpeed).catch(() => {});
  }, [selectedSpeed, setPlaybackRate]);

  useEffect(() => {
    onRecordedUriChange(mediaFlow.recordedUri, mediaFlow.recordingDurationSec);
  }, [mediaFlow.recordedUri, mediaFlow.recordingDurationSec, onRecordedUriChange]);

  useImperativeHandle(ref, () => ({
    reset: async () => {
      await mediaFlow.reset();
    },
    replayAudio: async () => {
      await mediaFlow.replayAudio();
    },
    getRecordedUri: () => mediaFlow.recordedUri,
    getRecordingDurationSec: () => mediaFlow.recordingDurationSec,
    stopRecordingIfActive: async () => {
      if (mediaFlow.phase === 'recording') {
        await mediaFlow.stopRecording();
      }
    },
    getPhase: () => mediaFlow.phase,
  }));

  const hasRecording = metadata.recordingDuration > 0;
  // Audio-and-record question types (Repeat Sentence, Re-tell Lecture,
  // Answer Short Questions, Respond to a Situation, Summarize Discussion)
  // get the new two-card layout that matches the Figma mockup. Other
  // question types — listening-only (Summarize Spoken Text, MCQs, etc.)
  // and record-only (Read Aloud, Describe Image) — continue to render the
  // legacy layout, which they were not part of in the redesign.
  const useTwoCardLayout = metadata.hasAudio && hasRecording;

  if (useTwoCardLayout) {
    return (
      <View style={styles.consoleContainer}>
        <UnifiedMediaBar
          hasAudio={metadata.hasAudio}
          hasRecording={hasRecording}
          maxRecordingSec={metadata.recordingDuration}
          recordedUri={mediaFlow.recordedUri}
          recordingDurationSec={mediaFlow.recordingDurationSec}
          isSubmitting={isSubmitting}
          selectedSpeed={selectedSpeed}
          onSelectSpeed={setSelectedSpeed}
          availableVoices={availableVoices ?? []}
          selectedVoiceLabel={selectedVoiceLabel ?? null}
          onSelectVoice={onSelectVoice ?? (() => {})}
        />
      </View>
    );
  }

  return (
    <View style={styles.consoleContainer}>
      {/* Audio question display (listening-only question types) */}
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
