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
  /**
   * Initial playback rate for question audio (0.5..2.0). Use the returned
   * `setPlaybackRate()` to change it mid-flow (e.g. from a speed picker).
   */
  initialPlaybackRate?: number;
  /** Fires once the question audio playback finishes (or is skipped). */
  onAudioFinish?: () => void;
  /** Fires once the user's voice recording completes. */
  onRecordingFinish?: (uri: string | null, durationSec: number) => void;
  /** Fires on permission denial / recorder failures / interruptions. */
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
  /** Current playback rate of the question audio. */
  playbackRate: number;

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
  /**
   * Replay JUST the question audio without re-entering the prep/recording
   * cycle. Use this for "Play Audio" buttons in `review` / `audio_done`
   * states — calling `start()` would clobber a captured recording.
   */
  replayAudio: () => Promise<void>;
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
  /** Update the playback rate for the question audio (and apply immediately if playing). */
  setPlaybackRate: (rate: number) => Promise<void>;
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
    initialPlaybackRate = 1.0,
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
  // Ref to the recorder's captured recording so the player handlers can
  // check "do we already have a recording?" without resorting to a circular
  // hook dependency (the recorder hook is constructed below `player`).
  const recordedRef = useRef<{ uri: string; durationSec: number } | null>(null);

  // Resolve "where should we land when the question audio finishes?"
  //
  // Priority:
  //   1. If the user already has a captured recording, go back to `review`
  //      — this is the replay-from-review case where restarting the prep
  //      cycle would clobber their answer.
  //   2. If this question expects a recording (`recordingDuration > 0`)
  //      and we don't have one yet, kick off the prep countdown.
  //   3. Otherwise the question is listening-only — land in `audio_done`.
  const settleAfterAudio = useCallback(() => {
    if (recordedRef.current) {
      setPhase('review');
      setSecondsLeft(0);
      return;
    }
    if (hasRecording(metadata)) {
      startPrepCountdownRef.current();
    } else {
      setPhase('audio_done');
      setSecondsLeft(0);
    }
  }, [metadata]);

  const player = useAudioPlayer({
    initialRate: initialPlaybackRate,
    onComplete: () => {
      if (phaseRef.current !== 'audio_playing') return;
      onAudioFinishRef.current?.();
      settleAfterAudio();
    },
    onPreempt: () => {
      // If something else took the playback slot mid-question-audio we don't
      // want the UI to stay in `audio_playing` forever.
      if (phaseRef.current === 'audio_playing') {
        settleAfterAudio();
      }
    },
    onError: (_err) => {
      // Surface to dev tools but keep the flow advancing so the user isn't
      // stranded on a silent audio screen.
      onAudioFinishRef.current?.();
      settleAfterAudio();
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
      switch (code) {
        case 'permission':
          onErrorRef.current?.(
            'Microphone permission is required to practice speaking.',
          );
          break;
        case 'interrupted':
          onErrorRef.current?.(
            'Recording was interrupted (you left the app). Please retake.',
          );
          break;
        case 'empty':
          onErrorRef.current?.(
            "We couldn't capture any audio — please check your mic and retake.",
          );
          break;
        case 'stop':
          // Stop errors are usually transient and we already moved to
          // 'review' in onFinish; no user-facing message needed.
          break;
        default:
          onErrorRef.current?.('Failed to start recording.');
      }
      // For permission/start errors there is no recording, so the orchestrator
      // should land in review (existing behaviour). For 'interrupted' / 'empty'
      // the recorder already routes through onFinish(null, _) so phase is set
      // there — guard against double-set.
      if (phaseRef.current !== 'review') {
        setPhase('review');
      }
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

  // Replay just the audio without restarting the prep/recording cycle.
  // Safe to call from any phase — preserves whatever recording the user
  // has captured (which `start()` would discard). When playback finishes,
  // `settleAfterAudio` checks `recordedRef` and lands back in `review` if
  // a recording exists, otherwise routes to prep/audio_done as usual.
  const replayAudio = useCallback(async () => {
    if (!audioUrl || !metadata.hasAudio) return;
    clearCountdown();
    setPhase('audio_playing');
    setSecondsLeft(0);
    const ok = await player.play(audioUrl);
    if (!ok && phaseRef.current === 'audio_playing') {
      // Best-effort recover — drop back to whatever phase makes sense.
      settleAfterAudio();
    }
  }, [audioUrl, clearCountdown, metadata, player, settleAfterAudio]);

  // Wire autoStart. Re-run whenever the configured metadata/audio URL changes
  // — typical case: navigating to a new question in the same screen.
  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      clearCountdown();
    };
    // `start` is stable per metadata.id+audioUrl thanks to useCallback, so
    // omitting it here is safe and avoids the autoStart loop on every render.
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

  // Destructure the stable setter rather than depending on the whole
  // `player` object (which is recreated every render). Without this,
  // `setPlaybackRate` changes identity each render and any consumer
  // useEffect that lists it as a dep fires every render — death by a
  // thousand re-renders during an active recording, where the recorder's
  // tick re-renders the orchestrator every second.
  const { setRate: playerSetRate } = player;
  const setPlaybackRate = useCallback(
    async (rate: number) => {
      await playerSetRate(rate);
    },
    [playerSetRate],
  );

  // Keep `recordedRef` in lock-step with the recorder's captured recording
  // so the player handlers (which can't reference `recorder` directly —
  // their hook is constructed BEFORE the recorder) can read the latest
  // value synchronously when audio playback ends.
  useEffect(() => {
    recordedRef.current = recorder.recording;
  }, [recorder.recording]);

  // Belt-and-braces unmount cleanup. Player + recorder hooks already do
  // their own teardown on unmount, but the orchestrator also owns the
  // countdown interval, so we sweep it here too. Done synchronously to
  // avoid leaking a timer in fast-unmount edge cases.
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  return {
    phase,
    // During the brief window between `setPhase('recording')` and native
    // `Sound.startRecorder` resolving, the recorder hasn't flipped
    // `isRecording=true` yet — its derived `secondsRemaining` is still 0.
    // We fall back to the orchestrator's `secondsLeft` (set to
    // `metadata.recordingDuration` inside `startRecording`) so the user
    // never sees a "0s" flash before the countdown starts ticking down.
    secondsLeft:
      phase === 'recording'
        ? recorder.isRecording
          ? recorder.secondsRemaining
          : secondsLeft
        : secondsLeft,
    audioPositionMs: player.positionMs,
    audioDurationMs: player.durationMs,
    audioProgress: player.progress,
    playbackRate: player.rate,
    recordedUri: recorder.recording?.uri ?? null,
    recordingDurationSec: recorder.recording?.durationSec ?? 0,
    amplitude: recorder.amplitude,
    resolvedPrepTimeSec,
    start,
    replayAudio,
    skipAudio,
    startRecordingNow,
    stopRecording,
    retake,
    reset,
    setPlaybackRate,
  };
};
