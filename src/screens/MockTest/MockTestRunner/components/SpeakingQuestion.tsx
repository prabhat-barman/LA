import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Image, View } from 'react-native';
import { HtmlText } from '../../../../components/atoms/HtmlText';
import {
  AutoPlayAudioRecorder,
  type AutoPlayAudioRecorderRef,
} from '../../../../modules/audio';
import type { RecorderStatus } from '../../../../modules/audio/AutoPlayAudioRecorder/types';
import { styles } from '../styles';
import type { AnswerDraft, Question, SubcategoryId } from '../types';

interface Props {
  question: Question;
  onAnswerChange: (draft: AnswerDraft) => void;
  // Hides the in-card "Stop Recording" button. Mock tests force a
  // continuous recording window with no manual stop — the runner's
  // Next button (with confirmation) is the only way out — so the
  // button is suppressed there. Practice keeps the default visible
  // button for self-paced control.
  hideStopButton?: boolean;
  // Fires whenever the prompt audio's playing state changes. Used by
  // the mock-test runner to gate the Next button while the prompt is
  // still playing — users have to listen to the whole prompt before
  // they can advance. `true` while the recorder is in audio-countdown
  // or playing-audio, `false` once the audio finishes (and for
  // questions that don't have prompt audio at all). The parent owns
  // the gating decision — this component just reports the signal.
  onPromptAudioPlayingChange?: (isPlaying: boolean) => void;
}

// Exposed to the parent so MockTestRunner can imperatively stop an
// in-progress recording when the user confirms a Next press. The
// recorder's `stopRecording` fires `onRecordingComplete`, which
// updates the answer map — but that update is async (setState
// queues a render), so the caller would race against its own
// `advanceToNext` and ship a stale empty draft to the submit
// payload. We return the captured recording data here so the
// runner can apply it INLINE to its submit-context build, bypassing
// the React state round-trip and guaranteeing `file[]` is populated
// on the very same Next press that triggered the stop.
//
// Returns `null` when the recorder wasn't actually capturing audio
// (still in the pre-roll countdown, already completed, never armed,
// or unmounted) — callers should treat null as "no audio to attach".
export interface SpeakingQuestionRef {
  finishRecording: () => Promise<{
    filePath: string;
    duration: number;
  } | null>;
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
export const SpeakingQuestion = forwardRef<SpeakingQuestionRef, Props>(
  (
    {
      question,
      onAnswerChange,
      hideStopButton = false,
      onPromptAudioPlayingChange,
    },
    ref,
  ) => {
    const recorderRef = useRef<AutoPlayAudioRecorderRef>(null);

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

    useImperativeHandle(
      ref,
      () => ({
        finishRecording: async () => {
          const inst = recorderRef.current;
          if (!inst) return null;
          // `stopRecording` is a no-op when the recorder is idle or
          // already completed (`isRecordingActive.current === false`),
          // returning undefined in both cases. We translate undefined
          // to null and forward valid `{ filePath, duration }` results
          // so the runner can attach the recording to its submit
          // payload synchronously, without waiting on a setState
          // round-trip.
          if (inst.isCompleted()) return null;
          const result = await inst.stopRecording();
          if (
            !result ||
            !result.filePath ||
            !(result.duration > 0)
          ) {
            return null;
          }
          return { filePath: result.filePath, duration: result.duration };
        },
      }),
      [],
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

    // Seed the parent's gate state to TRUE on every mount / question
    // swap. Every speaking subcategory has at least a mic countdown
    // before recording (and most also have a prompt audio playback
    // first), so gating Next at mount is the always-safe default —
    // the recorder's first `onStatusChange` will flip it to false
    // once we reach the actual `recording` phase, where the user is
    // free to stop early at their own discretion.
    //
    // Without this seed there's a brief window after mount where the
    // recorder hasn't yet fired its first status event and the
    // parent (still holding the previous question's terminal value)
    // could either:
    //   - Show Next enabled, letting the user tap through before the
    //     recorder armed → blank `file[]` on submit.
    //   - Show Next disabled forever on a non-speaking → speaking
    //     swap if the previous question left the gate on.
    // The cleanup phase clears the gate so the next question's
    // mount-time seed is the authoritative value.
    useEffect(() => {
      onPromptAudioPlayingChange?.(true);
      return () => onPromptAudioPlayingChange?.(false);
    }, [onPromptAudioPlayingChange, question.id]);

    const handleStatusChange = useCallback(
      (status: RecorderStatus) => {
        // We use "prompt audio playing" loosely as "Next button must
        // be gated" so the runner has a single boolean to bind to.
        // True during:
        //   - `audio-countdown` — the user is waiting for the prompt
        //     audio to start. Letting Next through here feels like
        //     skipping the prompt.
        //   - `playing-audio`   — the prompt is actually playing;
        //     advancing now would mean the user never heard it.
        //   - `recording-countdown` — the prompt has finished and the
        //     mic is about to activate. Tapping Next here would race
        //     against the recorder's `isRecordingActive` flag and
        //     result in a blank `file[]` on submit (the mic literally
        //     wasn't open yet). The legacy app gates this phase too.
        // False during `recording` / `completed` so the user can stop
        // their answer early ("user ki marzi") and still ship the
        // partial recording.
        const stillGated =
          status.isAudioPlaying ||
          status.phase === 'audio-countdown' ||
          status.phase === 'recording-countdown';
        onPromptAudioPlayingChange?.(stillGated);
      },
      [onPromptAudioPlayingChange],
    );

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
          ref={recorderRef}
          // `componentKey` ties recorder internal state to a specific
          // question — switching to a new Q tears down the old recorder
          // and re-arms a fresh countdown for the new one.
          componentKey={`speaking-${question.id}`}
          audioUrl={audioUrl}
          showAudio={Boolean(audioUrl)}
          hideStopButton={hideStopButton}
          onRecordingComplete={handleRecordingComplete}
          onStatusChange={handleStatusChange}
        />
      </View>
    );
  },
);

SpeakingQuestion.displayName = 'SpeakingQuestion';

export default SpeakingQuestion;
