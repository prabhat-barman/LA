import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import HeadsetCheckPlayer from '../../../../modules/audio/HeadsetCheckPlayer';
import { HEADSET_CHECK_AUDIO_URL, HEADSET_CHECK_TIP } from '../constants';
import { styles } from '../styles';

export interface HeadsetCheckSlideProps {
  // Lets the parent gate the Next button. We flip this true as soon
  // as the user has played any non-trivial portion of the sample
  // (matches the reference project's `setHasHeadsetTested` heuristic).
  onReadyChange: (ready: boolean) => void;
  // Live playing flag — parent uses this to additionally disable Next
  // *while* the audio is mid-playback so the user can't skip past a
  // half-played sample.
  onPlayingChange?: (isPlaying: boolean) => void;
}

const HeadsetCheckSlide: React.FC<HeadsetCheckSlideProps> = ({
  onReadyChange,
  onPlayingChange,
}) => {
  const [ready, setReady] = useState(false);

  // We only need to fire onReadyChange once on the leading edge —
  // wrapping in a ref avoids spamming the parent on every position
  // tick from the player.
  const readyFiredRef = useRef(false);

  const handlePlayTime = useCallback(
    (position: number) => {
      if (!readyFiredRef.current && position > 0) {
        readyFiredRef.current = true;
        setReady(true);
        onReadyChange(true);
      }
    },
    [onReadyChange],
  );

  const handlePlayingChange = useCallback(
    (isPlaying: boolean) => {
      onPlayingChange?.(isPlaying);
    },
    [onPlayingChange],
  );

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Headset Check</Text>
      <Text style={styles.slideDescription}>
        This is your chance to confirm your headset is working. Tap play to
        hear a sample clip and adjust your volume.
      </Text>

      <HeadsetCheckPlayer
        id="prerequisite-headset"
        audioUrl={HEADSET_CHECK_AUDIO_URL}
        onPlayTimeChange={handlePlayTime}
        onPlayingStateChange={handlePlayingChange}
      />

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>{HEADSET_CHECK_TIP}</Text>
      </View>

      <View
        style={[styles.readyBadge, ready && styles.readyBadgeActive]}
        accessibilityRole="text"
        accessibilityLabel={
          ready ? 'Headset check complete' : 'Play the sample to continue'
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
          {ready ? 'Sample played' : 'Play the sample to continue'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default HeadsetCheckSlide;
