import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuestionMetadata } from '../../config/practiceData';
import { useAudioPlayer } from './useAudioPlayer';
import { useVoiceRecorder } from './useVoiceRecorder';

export type MediaPhase =
  | 'idle' // text-only types — nothing to orchestrate
  | 'audio_wait' // pre-audio countdown
  | 'audio_playing' // question audio playing
  | 'audio_done' // audio finished, but no recording needed (listening types)
  | 'prep_countdown' // pre-recording prep timer
  | 'recording' // user voice recording in progress
  | 'review'; // recording complete, review/playback/submit

export interface UseQuestionMediaFlowConfig {
  metadata: QuestionMetadata;
  /** PTE Core mode flips `waitTimeBeforeRecording` -> `pteCoreWaitTimeBeforeRecording`. */
  isCore?: boolean;
  /** Resolved (absolute) URL of the question audio. Required when `metadata.hasAudio`. */
  audioUrl?: string;
  /**
   * Auto-kick off the flow when the question is "ready". Pass `false` if
   * the screen needs to call `start()` manually (e.g. after fetching data).
   */
  autoStart?: boolean;
  /** Fires once the question audio playback finishes (or is skipped). */
  onAudioFinish?: () => void;
  /** Fires once the user's voice recording completes. */
  onRecordingFinish?: (uri: string | null, durationSec: number) => void;
  /** Fires on permission denial / recorder failures. */
  onError?: (message: string) => void;
}

export interface UseQuestionMediaFlowReturn {
  phase: MediaPhase;
  /** Live countdown for `audio_wait`, `prep_countdown`, and `recording`. */
  secondsLeft: number;

  /** Question-audio playback (only meaningful in `audio_playing`). */
  audioPositionMs: number;
  audioDurationMs: number;
  audioProgress: number;

  /** User's captured recording. Available from `review` onwards. */
  recordedUri: string | null;
  /** Wall-clock seconds of the captured recording (stable; never overwritten by playback). */
  recordingDurationSec: number;

  /** Live amplitude for waveform UI during recording. */
  amplitude: ReturnType<typeof useVoiceRecorder>['amplitude'];

  /**
   * Resolved prep time (PTE Core override applied). Useful for instruction
   * labels (e.g. "You have 20 seconds to prepare").
   */
  resolvedPrepTimeSec: number;

  // Actions
  /** Manually kick off the flow when `autoStart` is false. */
  start: () => void;
  /** Skip the currently-playing question audio. */
  skipAudio: () => Promise<void>;
  /** Skip the prep countdown and start recording immediately ("Record Now" button). */
  startRecordingNow: () => Promise<void>;
  /** Stop the current recording. */
  stopRecording: () => Promise<void>;
  /** Reset back to the start of the flow (re-takes). */
  retake: () => void;
  /** Tear everything down (call this on unmount or before navigating to a new question). */
  reset: () => Promise<void>;
}

const hasRecording = (m: QuestionMetadata) =>
  Boolean(m.recordingDuration && m.recordingDuration > 0);

export const useQuestionMediaFlow = (
  config: UseQuestionMediaFlowConfig,
): UseQuestionMediaFlowReturn => {
  const {
    metadata,
    isCore,
    audioUrl,
    autoStart = true,
    onAudioFinish,
    onRecordingFinish,
    onError,
  } = config;

  const resolvedPrepTimeSec = useMemo(() => {
    if (isCore && metadata.pteCoreWaitTimeBeforeRecording !== undefined) {
      return metadata.pteCoreWaitTimeBeforeRecording;
    }
    return metadata.waitTimeBeforeRecording;
  }, [isCore, metadata]);

  const [phase, setPhase] = useState<MediaPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<MediaPhase>('idle');
  phaseRef.current = phase;

  const onAudioFinishRef = useRef(onAudioFinish);
  const onRecordingFinishRef = useRef(onRecordingFinish);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onAudioFinishRef.current = onAudioFinish;
    onRecordingFinishRef.current = onRecordingFinish;
    onErrorRef.current = onError;
  }, [onAudioFinish, onRecordingFinish, onError]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Forward declarations so callbacks can reference each other safely.
  const startPrepCountdownRef = useRef<() => void>(() => {});
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});

  const player = useAudioPlayer({
    onComplete: () => {
      if (phaseRef.current !== 'audio_playing') return;
      onAudioFinishRef.current?.();
      if (hasRecording(metadata)) {
        startPrepCountdownRef.current();
      } else {
        setPhase('audio_done');
        setSecondsLeft(0);
      }
    },
    onPreempt: () => {
      // If something else took the playback slot mid-question-audio we don't
      // want the UI to stay in `audio_playing` forever.
      if (phaseRef.current === 'audio_playing') {
        if (hasRecording(metadata)) {
          startPrepCountdownRef.current();
        } else {
          setPhase('audio_done');
          setSecondsLeft(0);
        }
      }
    },
    onError: (_err) => {
      // Surface to dev tools but keep the flow advancing so the user isn't
      // stranded on a silent audio screen.
      onAudioFinishRef.current?.();
      if (hasRecording(metadata)) {
        startPrepCountdownRef.current();
      } else {
        setPhase('audio_done');
      }
    },
  });

  const recorder = useVoiceRecorder({
    maxDurationSec: metadata.recordingDuration,
    onFinish: (uri, elapsedSec) => {
      clearCountdown();
      setPhase('review');
      setSecondsLeft(0);
      onRecordingFinishRef.current?.(uri, elapsedSec);
    },
    onError: (_err, code) => {
      if (code === 'permission') {
        onErrorRef.current?.(
          'Microphone permission is required to practice speaking.',
        );
      } else {
        onErrorRef.current?.('Failed to start recording.');
      }
      setPhase('review');
    },
  });

  const playQuestionAudio = useCallback(
    async (url: string) => {
      setPhase('audio_playing');
      setSecondsLeft(0);
      const ok = await player.play(url);
      if (!ok) {
        // Player already invoked our onError path — but just in case:
        if (hasRecording(metadata)) {
          startPrepCountdownRef.current();
        } else {
          setPhase('audio_done');
        }
      }
    },
    [metadata, player],
  );

  const startPrepCountdown = useCallback(() => {
    clearCountdown();
    if (!hasRecording(metadata)) {
      // Defensive — should not be reached.
      setPhase('audio_done');
      return;
    }

    if (resolvedPrepTimeSec <= 0) {
      startRecordingRef.current();
      return;
    }

    setPhase('prep_countdown');
    setSecondsLeft(resolvedPrepTimeSec);

    let remaining = resolvedPrepTimeSec;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearCountdown();
        startRecordingRef.current();
      }
    }, 1000);
  }, [clearCountdown, metadata, resolvedPrepTimeSec]);
  startPrepCountdownRef.current = startPrepCountdown;

  const startRecording = useCallback(async () => {
    clearCountdown();

    setPhase('recording');
    setSecondsLeft(metadata.recordingDuration);

    // Tear down any active playback that might still own the audio slot.
    await player.stop();

    const ok = await recorder.start();
    if (!ok) {
      // onError already invoked → phase set to 'review' by recorder hook handler.
      clearCountdown();
    }
  }, [clearCountdown, metadata.recordingDuration, player, recorder]);
  startRecordingRef.current = startRecording;

  const start = useCallback(() => {
    clearCountdown();

    if (!metadata.hasAudio && !hasRecording(metadata)) {
      // Reading / writing — no media flow at all.
      setPhase('idle');
      setSecondsLeft(0);
      return;
    }

    if (metadata.hasAudio) {
      if (!audioUrl) {
        // No audio URL despite `hasAudio` — fall through to recording (or idle).
        if (hasRecording(metadata)) {
          startPrepCountdown();
        } else {
          setPhase('audio_done');
          setSecondsLeft(0);
        }
        return;
      }

      const wait = metadata.waitTimeBeforeAudio;
      if (wait > 0) {
        setPhase('audio_wait');
        setSecondsLeft(wait);
        let remaining = wait;
        countdownRef.current = setInterval(() => {
          remaining -= 1;
          setSecondsLeft(remaining);
          if (remaining <= 0) {
            clearCountdown();
            playQuestionAudio(audioUrl);
          }
        }, 1000);
      } else {
        playQuestionAudio(audioUrl);
      }
      return;
    }

    // No audio, but has recording → go straight to prep countdown.
    startPrepCountdown();
  }, [
    audioUrl,
    clearCountdown,
    metadata,
    playQuestionAudio,
    startPrepCountdown,
  ]);

  // Wire autoStart. Re-run whenever the configured metadata/audio URL changes
  // — typical case: navigating to a new question in the same screen.
  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      clearCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, audioUrl, metadata.id]);

  const skipAudio = useCallback(async () => {
    if (phaseRef.current !== 'audio_playing' && phaseRef.current !== 'audio_wait') {
      return;
    }
    clearCountdown();
    await player.stop();
    onAudioFinishRef.current?.();
    if (hasRecording(metadata)) {
      startPrepCountdown();
    } else {
      setPhase('audio_done');
      setSecondsLeft(0);
    }
  }, [clearCountdown, metadata, player, startPrepCountdown]);

  const startRecordingNow = useCallback(async () => {
    if (phaseRef.current !== 'prep_countdown') return;
    await startRecording();
  }, [startRecording]);

  const stopRecording = useCallback(async () => {
    if (phaseRef.current !== 'recording') return;
    clearCountdown();
    await recorder.stop();
  }, [clearCountdown, recorder]);

  const retake = useCallback(() => {
    clearCountdown();
    recorder.reset().catch(() => {});
    player.stop().catch(() => {});
    // Re-enter the prep stage so the user gets the same lead-in they had
    // the first time around.
    if (hasRecording(metadata)) {
      startPrepCountdown();
    } else {
      setPhase('idle');
      setSecondsLeft(0);
    }
  }, [clearCountdown, metadata, player, recorder, startPrepCountdown]);

  const reset = useCallback(async () => {
    clearCountdown();
    await player.stop();
    await recorder.reset();
    setPhase('idle');
    setSecondsLeft(0);
  }, [clearCountdown, player, recorder]);

  return {
    phase,
    secondsLeft: phase === 'recording' ? recorder.secondsRemaining : secondsLeft,
    audioPositionMs: player.positionMs,
    audioDurationMs: player.durationMs,
    audioProgress: player.progress,
    recordedUri: recorder.recording?.uri ?? null,
    recordingDurationSec: recorder.recording?.durationSec ?? 0,
    amplitude: recorder.amplitude,
    resolvedPrepTimeSec,
    start,
    skipAudio,
    startRecordingNow,
    stopRecording,
    retake,
    reset,
  };
};
