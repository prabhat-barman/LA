import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PermissionsAndroid, Platform } from 'react-native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';
import { soundCoordinator } from './soundCoordinator';

export interface UseVoiceRecorderOptions {
  /**
   * If provided, recording auto-stops after this many seconds. Pass `0` /
   * `undefined` for an open-ended recording the caller stops manually.
   */
  maxDurationSec?: number;

  /**
   * Fires whenever the recording ends (auto-stop OR `stop()` call OR preempted
   * by another consumer). Receives the recorded file URI (if any) and the
   * actual elapsed seconds measured wall-clock from `start()`.
   */
  onFinish?: (uri: string | null, elapsedSec: number) => void;

  /**
   * Fires every second while recording with the seconds remaining (only
   * relevant when `maxDurationSec` is set).
   */
  onTick?: (remainingSec: number) => void;

  /**
   * Permission-denied / start failure handler. The hook never throws.
   */
  onError?: (err: unknown, code: 'permission' | 'start' | 'stop') => void;
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  /** Wall-clock seconds since `start()` was called (live during recording). */
  secondsElapsed: number;
  /** Seconds remaining when `maxDurationSec` is set, else `0`. */
  secondsRemaining: number;
  /**
   * Captured recording. Cleared on every new `start()`.
   * Holds the final URI + actual elapsed seconds after stop.
   */
  recording: { uri: string; durationSec: number } | null;
  /**
   * Native-driven amplitude (0..1) for waveform visualisation. Updated via
   * `Animated.Value.setValue` so re-rendering the consumer is NOT required
   * for the waveform to animate.
   */
  amplitude: Animated.Value;

  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
}

const BASELINE_AMPLITUDE = 0.15;

const requestAndroidPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (granted) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone Permission',
      message:
        'Language Academy needs microphone access to record your answers.',
      buttonNeutral: 'Ask Later',
      buttonNegative: 'Deny',
      buttonPositive: 'Allow',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const useVoiceRecorder = (
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn => {
  const { maxDurationSec, onFinish, onTick, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    maxDurationSec ?? 0,
  );
  const [recording, setRecording] = useState<
    UseVoiceRecorderReturn['recording']
  >(null);

  const amplitudeRef = useRef(new Animated.Value(BASELINE_AMPLITUDE));
  const ownerIdRef = useRef(`recorder-${Math.random().toString(36).slice(2)}`);
  const startedAtRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lifecycle flags. Used together to make start/stop safe against:
  //  - Stop being called while native `Sound.startRecorder` is still resolving
  //  - Auto-stop tick firing during/after a manual stop
  //  - Multiple overlapping start() calls
  //  - Coordinator preempt during native start
  const stoppedRef = useRef(true);
  /** Resolves when the most recent start() call has finished (success or failure). */
  const startInFlightRef = useRef<Promise<boolean> | null>(null);
  /**
   * Set true the moment a stop is requested, even if a start is still in
   * flight. The post-start setup phase checks this and bails out if a stop
   * has been queued.
   */
  const stopRequestedRef = useRef(false);

  // Keep latest callbacks without retriggering effects.
  const onFinishRef = useRef(onFinish);
  const onTickRef = useRef(onTick);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFinishRef.current = onFinish;
    onTickRef.current = onTick;
    onErrorRef.current = onError;
  }, [onFinish, onTick, onError]);

  const clearTick = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const teardown = useCallback(
    async (emitFinish: boolean) => {
      // Mark the intent to stop synchronously — even if we have to await an
      // in-flight start below, post-start setup must see this flag and bail.
      stopRequestedRef.current = true;

      // Wait for any pending start to finish so we don't race the native side
      // with concurrent startRecorder/stopRecorder calls.
      if (startInFlightRef.current) {
        try {
          await startInFlightRef.current;
        } catch {
          // start already reported its own error
        }
      }

      if (stoppedRef.current) {
        // The in-flight start aborted itself once it saw `stopRequestedRef`.
        // No native handle to release; just emit the finish so the consumer
        // can transition to its "review" state with whatever URI start() set.
        if (emitFinish) {
          const captured = recording;
          onFinishRef.current?.(captured?.uri ?? null, captured?.durationSec ?? 0);
        }
        stopRequestedRef.current = false;
        return;
      }
      stoppedRef.current = true;

      clearTick();

      let elapsed = 0;
      if (startedAtRef.current > 0) {
        elapsed = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        if (maxDurationSec && maxDurationSec > 0) {
          elapsed = Math.min(maxDurationSec, elapsed);
        }
      }

      let uri: string | null = null;
      try {
        const stoppedUri = await Sound.stopRecorder();
        if (typeof stoppedUri === 'string' && stoppedUri.length > 0) {
          uri = stoppedUri;
        }
      } catch (err) {
        onErrorRef.current?.(err, 'stop');
      }
      try {
        Sound.removeRecordBackListener();
      } catch {
        // quiet fail
      }

      soundCoordinator.release(ownerIdRef.current);

      amplitudeRef.current.setValue(BASELINE_AMPLITUDE);
      setIsRecording(false);

      if (emitFinish) {
        const finalRecording = uri ? { uri, durationSec: elapsed } : null;
        if (finalRecording) {
          setRecording(finalRecording);
        }
        onFinishRef.current?.(uri, elapsed);
      }
      stopRequestedRef.current = false;
    },
    // `recording` is intentionally NOT a dep — we only read it as a fallback
    // when start() was cancelled before any native URI could be captured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearTick, maxDurationSec],
  );

  const performStart = useCallback(async (): Promise<boolean> => {
    // Permission gate
    try {
      const ok = await requestAndroidPermission();
      if (!ok) {
        onErrorRef.current?.(
          new Error('Microphone permission denied'),
          'permission',
        );
        return false;
      }
    } catch (err) {
      onErrorRef.current?.(err, 'permission');
      return false;
    }

    // Reset state for a fresh take.
    clearTick();
    setRecording(null);
    setSecondsElapsed(0);
    setSecondsRemaining(maxDurationSec ?? 0);
    amplitudeRef.current.setValue(BASELINE_AMPLITUDE);

    soundCoordinator.acquire(ownerIdRef.current, 'recorder', () => {
      // Someone else took the slot — abandon without re-stopping native
      // (they own it now).
      clearTick();
      stoppedRef.current = true;
      setIsRecording(false);
      amplitudeRef.current.setValue(BASELINE_AMPLITUDE);
    });

    // Mark active BEFORE awaiting native start so a stop() call between here
    // and the await resolving can find a non-no-op recorder. The post-await
    // block re-checks `stopRequestedRef` to bail cleanly if stop got in first.
    stoppedRef.current = false;
    setIsRecording(true);
    startedAtRef.current = Date.now();

    try {
      const uri = await Sound.startRecorder(undefined, undefined, true);
      if (uri) {
        setRecording({ uri, durationSec: 0 });
      }

      // Stop was requested while native start was in flight — release the
      // native handle and bail out before we install listeners/ticks.
      if (stopRequestedRef.current) {
        try {
          await Sound.stopRecorder();
        } catch {
          // quiet fail
        }
        try {
          Sound.removeRecordBackListener();
        } catch {
          // quiet fail
        }
        soundCoordinator.release(ownerIdRef.current);
        amplitudeRef.current.setValue(BASELINE_AMPLITUDE);
        setIsRecording(false);
        stoppedRef.current = true;
        return false;
      }

      Sound.addRecordBackListener((e: RecordBackType) => {
        const db = e.currentMetering ?? -60;
        const norm = Math.max(0.05, Math.min(1.0, (db + 60) / 60));
        amplitudeRef.current.setValue(norm);
      });

      tickIntervalRef.current = setInterval(() => {
        // Defensive: if something else (preempt, manual stop) torn us down,
        // don't fire any more ticks.
        if (stoppedRef.current) {
          clearTick();
          return;
        }
        const elapsed = Math.floor(
          (Date.now() - startedAtRef.current) / 1000,
        );
        setSecondsElapsed(elapsed);
        if (maxDurationSec && maxDurationSec > 0) {
          const remaining = Math.max(0, maxDurationSec - elapsed);
          setSecondsRemaining(remaining);
          onTickRef.current?.(remaining);
          if (remaining <= 0) {
            clearTick();
            // Fire-and-forget — auto-stop must not block the tick.
            teardown(true).catch(() => {});
          }
        } else {
          onTickRef.current?.(elapsed);
        }
      }, 1000);

      return true;
    } catch (err) {
      stoppedRef.current = true;
      soundCoordinator.release(ownerIdRef.current);
      try {
        Sound.removeRecordBackListener();
      } catch {
        // quiet fail
      }
      setIsRecording(false);
      onErrorRef.current?.(err, 'start');
      return false;
    }
  }, [clearTick, maxDurationSec, teardown]);

  const start = useCallback(async (): Promise<boolean> => {
    // Deduplicate overlapping starts — second caller waits for the first.
    if (startInFlightRef.current) {
      return startInFlightRef.current;
    }
    stopRequestedRef.current = false;
    const promise = performStart();
    startInFlightRef.current = promise;
    try {
      return await promise;
    } finally {
      startInFlightRef.current = null;
    }
  }, [performStart]);

  const stop = useCallback(async () => {
    await teardown(true);
  }, [teardown]);

  const reset = useCallback(async () => {
    await teardown(false);
    setRecording(null);
    setSecondsElapsed(0);
    setSecondsRemaining(maxDurationSec ?? 0);
  }, [maxDurationSec, teardown]);

  // Cleanup on unmount. Capture the owner id at mount time — the ref value
  // itself is stable for the hook's lifetime but ESLint can't prove that.
  useEffect(() => {
    const id = ownerIdRef.current;
    return () => {
      // Fire-and-forget — component is unmounting; we only want native
      // teardown, not state updates.
      clearTick();
      if (soundCoordinator.isOwner(id)) {
        Sound.stopRecorder().catch(() => {});
        try {
          Sound.removeRecordBackListener();
        } catch {
          // quiet fail
        }
        soundCoordinator.release(id);
      }
    };
  }, [clearTick]);

  return {
    isRecording,
    secondsElapsed,
    secondsRemaining,
    recording,
    amplitude: amplitudeRef.current,
    start,
    stop,
    reset,
  };
};
