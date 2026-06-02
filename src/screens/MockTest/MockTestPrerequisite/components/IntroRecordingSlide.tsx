import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import MicrophoneCheckPlayer, {
  type MicrophoneCheckPlayerRef,
} from '../../../../modules/audio/MicrophoneCheckPlayer';
import {
  INTRO_RECORDING_INSTRUCTIONS,
  PERSONAL_INTRO_PROMPT,
} from '../constants';
import { styles } from '../styles';

export interface IntroRecordingSlideProps {
  // Set true once the user has captured a personal-intro recording.
  // Unlike the microphone check (which gates on `hasPlayed`), this
  // slide gates on `hasFile`: PTE's Personal Introduction step doesn't
  // require the candidate to listen back before continuing — the
  // recording itself is the submission artifact.
  onReadyChange: (ready: boolean) => void;
  // Disables Next while the recorder is actively running so the user
  // can't navigate away mid-capture and end up with a dangling file.
  onRecordingChange?: (isRecording: boolean) => void;
  // Surfaces the recorded file URI to the parent so it can be threaded
  // into the runner's route params (and later, multipart-uploaded as
  // part of SUBMIT_MOCK in Phase 2.0+). Called every time a new take
  // completes — re-records overwrite the previous URI.
  onAudioCaptured?: (filePath: string) => void;
}

const IntroRecordingSlide: React.FC<IntroRecordingSlideProps> = ({
  onReadyChange,
  onRecordingChange,
  onAudioCaptured,
}) => {
  const playerRef = useRef<MicrophoneCheckPlayerRef>(null);
  // Latches once the user records their first take. Re-records keep
  // ready=true (and update the URI via `onRecordingComplete`) so the
  // user can iterate without losing their "verified" status.
  const readyFiredRef = useRef(false);
  const [ready, setReady] = useState(false);

  const handleStateChange = useCallback(
    (state: {
      isRecording: boolean;
      hasFile: boolean;
      isPlaying: boolean;
      hasPlayed: boolean;
    }) => {
      onRecordingChange?.(state.isRecording);

      if (!readyFiredRef.current && state.hasFile) {
        readyFiredRef.current = true;
        setReady(true);
        onReadyChange(true);
      }
    },
    [onReadyChange, onRecordingChange],
  );

  const handleRecordingComplete = useCallback(
    (filePath: string) => {
      onAudioCaptured?.(filePath);
    },
    [onAudioCaptured],
  );

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Personal Introduction</Text>
      <Text style={styles.slideDescription}>
        Record a short introduction about yourself. This recording is sent
        with your score report so the receiving institution can verify your
        voice — it is not scored.
      </Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Prompt to read aloud</Text>
        <Text style={styles.promptText}>{PERSONAL_INTRO_PROMPT}</Text>
      </View>

      <MicrophoneCheckPlayer
        ref={playerRef}
        onStateChange={handleStateChange}
        onRecordingComplete={handleRecordingComplete}
      />

      <View style={styles.tipBox}>
        {INTRO_RECORDING_INSTRUCTIONS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View
        style={[styles.readyBadge, ready && styles.readyBadgeActive]}
        accessibilityRole="text"
        accessibilityLabel={
          ready
            ? 'Introduction recorded'
            : 'Record an introduction to continue'
        }
      >
        <View
          style={[styles.readyBadgeDot, ready && styles.readyBadgeDotActive]}
        />
        <Text
          style={[
            styles.readyBadgeText,
            ready && styles.readyBadgeTextActive,
          ]}
        >
          {ready
            ? 'Introduction recorded'
            : 'Record an introduction to continue'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default IntroRecordingSlide;
