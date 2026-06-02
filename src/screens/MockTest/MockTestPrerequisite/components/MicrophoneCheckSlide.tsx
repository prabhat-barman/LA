import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import MicrophoneCheckPlayer, {
  type MicrophoneCheckPlayerRef,
} from '../../../../modules/audio/MicrophoneCheckPlayer';
import { MICROPHONE_CHECK_INSTRUCTIONS } from '../constants';
import { styles } from '../styles';

export interface MicrophoneCheckSlideProps {
  // Mirrors HeadsetCheckSlide — set true once the user has recorded
  // AND played the recording back at least once (the reference
  // project's `hasMicrophonePlaybackTested` gate).
  onReadyChange: (ready: boolean) => void;
  // Disables Next while the recorder is actively running so the user
  // can't navigate away mid-capture and end up with a dangling file.
  onRecordingChange?: (isRecording: boolean) => void;
}

const MicrophoneCheckSlide: React.FC<MicrophoneCheckSlideProps> = ({
  onReadyChange,
  onRecordingChange,
}) => {
  const playerRef = useRef<MicrophoneCheckPlayerRef>(null);
  const readyFiredRef = useRef(false);
  const [ready, setReady] = useState(false);

  // The MicrophoneCheckPlayer emits its full state object on every
  // transition; we project that down to (a) the live recording flag
  // for the footer and (b) the leading-edge "user has verified" event
  // for the parent gating logic.
  const handleStateChange = useCallback(
    (state: {
      isRecording: boolean;
      hasFile: boolean;
      isPlaying: boolean;
      hasPlayed: boolean;
    }) => {
      onRecordingChange?.(state.isRecording);

      if (!readyFiredRef.current && state.hasPlayed) {
        readyFiredRef.current = true;
        setReady(true);
        onReadyChange(true);
      }
    },
    [onReadyChange, onRecordingChange],
  );

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Microphone Check</Text>
      <Text style={styles.slideDescription}>
        Record a short clip and play it back to make sure your microphone is
        picking up your voice clearly.
      </Text>

      <MicrophoneCheckPlayer
        ref={playerRef}
        onStateChange={handleStateChange}
      />

      <View style={styles.tipBox}>
        {MICROPHONE_CHECK_INSTRUCTIONS.map((step, index) => (
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
            ? 'Microphone check complete'
            : 'Record and play back to continue'
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
          {ready ? 'Microphone verified' : 'Record and play back to continue'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default MicrophoneCheckSlide;
