import React from 'react';
import type { UseQuestionMediaFlowReturn } from '../../hooks/practiceMedia';
import {
  AudioPlayingCard,
  AudioWaitCard,
  SubmittingCard,
} from './AudioStatusCard';
import { PrepTimerCard } from './PrepTimerCard';
import { RecordingPanel } from './RecordingPanel';
import { ReviewPanel } from './ReviewPanel';

interface MediaStatusInlineProps {
  flow: UseQuestionMediaFlowReturn;
  /**
   * External flag — when `true`, overrides the phase and shows the
   * "submitting" spinner. Lets the screen own its own submit lifecycle
   * without needing to encode it in the media flow.
   */
  isSubmitting?: boolean;
  /** Labels for in-screen customisation. */
  labels?: {
    submitting?: string;
    prep?: string;
    recordNow?: string;
    recording?: string;
    stop?: string;
    retake?: string;
    emptyReview?: string;
    emptyReviewCta?: string;
    audioPlaying?: string;
    audioSkip?: string;
  };
  /**
   * Controls whether the "Skip" CTA is shown while audio is playing.
   * Some question types (e.g. timed listening) may want to disable skipping.
   */
  allowSkipAudio?: boolean;
}

/**
 * All-in-one inline media status component. Renders the right thing for
 * each phase of `useQuestionMediaFlow`:
 *
 * - `audio_wait`        → pre-roll countdown
 * - `audio_playing`     → "listening to audio" + skip
 * - `prep_countdown`    → prep timer + "Record Now"
 * - `recording`         → live recorder UI
 * - `review`            → playback bar + retake
 * - `idle` / `audio_done` → nothing
 *
 * Pass `isSubmitting` while your screen is submitting the answer to swap
 * in a spinner.
 */
export const MediaStatusInline: React.FC<MediaStatusInlineProps> = ({
  flow,
  isSubmitting,
  labels,
  allowSkipAudio = true,
}) => {
  if (isSubmitting) {
    return <SubmittingCard label={labels?.submitting} />;
  }

  switch (flow.phase) {
    case 'audio_wait':
      return <AudioWaitCard secondsLeft={flow.secondsLeft} />;

    case 'audio_playing':
      return (
        <AudioPlayingCard
          onSkip={flow.skipAudio}
          label={labels?.audioPlaying}
          skipLabel={labels?.audioSkip}
          showSkip={allowSkipAudio}
        />
      );

    case 'prep_countdown':
      return (
        <PrepTimerCard
          secondsLeft={flow.secondsLeft}
          onRecordNow={flow.startRecordingNow}
          label={labels?.prep}
          ctaLabel={labels?.recordNow}
        />
      );

    case 'recording':
      return (
        <RecordingPanel
          secondsLeft={flow.secondsLeft}
          amplitude={flow.amplitude}
          onStop={flow.stopRecording}
          badgeLabel={labels?.recording}
          stopLabel={labels?.stop}
        />
      );

    case 'review':
      return (
        <ReviewPanel
          recordedUri={flow.recordedUri}
          recordingDurationSec={flow.recordingDurationSec}
          onRetake={flow.retake}
          retakeLabel={labels?.retake}
          emptyLabel={labels?.emptyReview}
          emptyCtaLabel={labels?.emptyReviewCta}
        />
      );

    case 'idle':
    case 'audio_done':
    default:
      return null;
  }
};
