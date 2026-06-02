import React, { useCallback } from 'react';
import { Image, View } from 'react-native';
import { HtmlText } from '../../../../components/atoms/HtmlText';
import { AutoPlayAudioRecorder } from '../../../../modules/audio';
import { styles } from '../styles';
import type { AnswerDraft, Question, SubcategoryId } from '../types';

interface Props {
  question: Question;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Speaking subcategories where the user must rely on the audio alone —
// the text transcript would defeat the listening half of the task.
//   2  Repeat Sentence       — listen + repeat
//   4  Retell Lecture        — listen + paraphrase
//   5  Answer Short Question — listen + respond
//   21 Respond to Situation  — listen + respond
//   22 (variant)             — assumed audio-only until clarified
//
// Subcategory 1 (Read Aloud) is excluded from this set — the prompt
// IS the reading material and must be visible. Subcategory 3
// (Describe Image) is handled separately via the image branch below.
const AUDIO_ONLY_SUBCATEGORIES: ReadonlySet<SubcategoryId> = new Set<SubcategoryId>([
  2, 4, 5, 21, 22,
]);

// Speaking questions (subcategories 1..5 + 21, 22). Reuses the existing
// `AutoPlayAudioRecorder` — the same component that powers the practice
// flow — so behaviour matches what users already know (auto-play prompt
// audio, mic countdown, fixed recording window, auto-stop).
//
// On `onRecordingComplete` we lift the recorded file path + duration
// into the runner's draft map. The recorder itself owns playback /
// recording UI state, so this component stays a thin adapter.
export const SpeakingQuestion: React.FC<Props> = ({
  question,
  onAnswerChange,
}) => {
  const handleRecordingComplete = useCallback(
    ({ filePath, duration }: { filePath: string; duration: number }) => {
      onAnswerChange({
        kind: 'speaking',
        audioFilePath: filePath,
        durationSec: duration,
      });
    },
    [onAnswerChange],
  );

  // Describe-image (subcategory 3) ships the image in `media_link`
  // rather than `audioUrl` — pass it as `imageUrl` for rendering and
  // suppress audio playback. The recorder still handles the mic
  // countdown identically.
  const isDescribeImage = question.subcategory_id === 3;
  const imageUrl = isDescribeImage
    ? question.audioUrl ?? question.imageUrl
    : question.imageUrl;
  const audioUrl = isDescribeImage ? null : question.audioUrl ?? null;

  // Hide the text prompt for audio-only kinds so the listening
  // component isn't compromised. Describe-image also hides it since
  // the image carries the "prompt" — the textual `question` field
  // there is usually just the instruction ("Describe the image…"),
  // which we don't need to repeat alongside the visible image.
  const showPrompt =
    !!question.prompt &&
    !isDescribeImage &&
    !AUDIO_ONLY_SUBCATEGORIES.has(question.subcategory_id);

  return (
    <View style={styles.speakingContainer}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.speakingImage}
          resizeMode="contain"
          accessibilityLabel="Question image"
        />
      )}
      {showPrompt && (
        <HtmlText content={question.prompt} style={styles.questionPrompt} />
      )}
      <AutoPlayAudioRecorder
        // `componentKey` ties recorder internal state to a specific
        // question — switching to a new Q tears down the old recorder
        // and re-arms a fresh countdown for the new one.
        componentKey={`speaking-${question.id}`}
        audioUrl={audioUrl}
        showAudio={Boolean(audioUrl)}
        onRecordingComplete={handleRecordingComplete}
      />
    </View>
  );
};

export default SpeakingQuestion;
