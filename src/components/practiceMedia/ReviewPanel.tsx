import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from '../../hooks/practiceMedia';
import { RecordedPlaybackBar } from './RecordedPlaybackBar';
import { mediaStyles } from './styles';

interface ReviewPanelProps {
  /** URI of the user's captured recording. `null` shows the empty state. */
  recordedUri: string | null;
  /** Wall-clock duration captured by the recorder (used as the playback fallback). */
  recordingDurationSec: number;
  /** Retake / record-again handler. */
  onRetake: () => void;
  /** Optional label overrides. */
  retakeLabel?: string;
  emptyLabel?: string;
  emptyCtaLabel?: string;
}

/**
 * "Recording done — review or re-take" panel. Owns a private `useAudioPlayer`
 * so the screen doesn't have to manage playback state for the recorded clip.
 *
 * The playback player coordinates with the global sound coordinator, so
 * starting playback here will auto-pause the question audio or any other
 * player in the same screen.
 */
export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  recordedUri,
  recordingDurationSec,
  onRetake,
  retakeLabel = 'Try Again',
  emptyLabel = 'No response recorded.',
  emptyCtaLabel = 'Record Answer',
}) => {
  const player = useAudioPlayer();

  if (!recordedUri) {
    return (
      <View style={mediaStyles.container}>
        <View style={mediaStyles.noRecordWrapper}>
          <Text style={mediaStyles.noRecordText}>{emptyLabel}</Text>
          <TouchableOpacity style={mediaStyles.reRecordBtn} onPress={onRetake}>
            <Text style={mediaStyles.reRecordBtnText}>{emptyCtaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Prefer the player's reported duration once playback has been initiated
  // — it's more accurate than our wall-clock estimate for very short clips.
  const playerDurationSec = player.durationMs / 1000;
  const displayDuration = playerDurationSec > 0
    ? playerDurationSec
    : recordingDurationSec;

  const handleToggle = () => {
    if (player.isPlaying) {
      player.stop();
    } else {
      player.play(recordedUri);
    }
  };

  return (
    <View style={mediaStyles.container}>
      <View style={mediaStyles.reviewWrapper}>
        <RecordedPlaybackBar
          isPlaying={player.isPlaying}
          positionSec={player.positionMs / 1000}
          durationSec={displayDuration}
          onPlayPause={handleToggle}
        />
        <TouchableOpacity style={mediaStyles.reRecordBtn} onPress={onRetake}>
          <Text style={mediaStyles.reRecordBtnText}>{retakeLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
