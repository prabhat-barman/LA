import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';
import { soundCoordinator } from './soundCoordinator';

export type VoiceRecorderErrorCode =
  | 'permission'
  | 'start'
  | 'stop'
  /** Recording was cut short because the app moved to background. */
  | 'interrupted'
  /** Native returned a URI but the resulting file is empty / unreadable. */
  | 'empty';

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
   *
   * `uri` is `null` if no audio was captured OR if the captured file was
   * empty (in which case `onError(..., 'empty')` also fires).
   */
  onFinish?: (uri: string | null, elapsedSec: number) => void;

  /**
   * Fires every second while recording with the seconds remaining (only
   * relevant when `maxDurationSec` is set).
   */
  onTick?: (remainingSec: number) => void;

  /**
   * Permission-denied / start failure / interrupted / empty-file handler.
   * The hook never throws.
   */
  onError?: (err: unknown, code: VoiceRecorderErrorCode) => void;

  /**
   * Auto-stop the recording when the app moves to background. Defaults to
   * `true`. Disable only if your app declares `UIBackgroundModes: audio`
   * and configures a background-capable audio session.
   */
  stopOnBackground?: boolean;
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
// Floor used when normalizing metering dB to a 0..1 waveform value. -80dB
// gives a more usable dynamic range for voice than the AVAudioRecorder
// hardware floor of -160dB (which would compress quiet speech into a
// near-flat line).
const METERING_FLOOR_DB = -80;

/**
 * Normalize a native metering reading to a 0..1 amplitude.
 *
 * Both iOS (`AVAudioRecorder.peakPower`) and Android (nitro-sound's
 * `20 * log10(maxAmplitude / 32767)`) emit dB values in the [-160, 0]
 * range. We clamp to a more useful [-80, 0] window for voice and lift the
 * floor to `BASELINE_AMPLITUDE` so the waveform never visually flatlines.
 *
 * Some Android devices have been observed emitting positive linear values
 * (legacy behaviour) — those are also handled correctly via the same
 * clamp/min path.
 */
const normalizeMetering = (raw: number | undefined): number => {
  if (raw === undefined || isNaN(raw)) return BASELINE_AMPLITUDE;

  // Handle linear 0..1 (legacy) or already-normalized values.
  if (raw >= 0 && raw <= 1) {
    return Math.max(BASELINE_AMPLITUDE, Math.min(1, raw));
  }

  // dB path (negative values, both platforms).
  const db = raw > 0 ? -60 : raw;
  const clamped = Math.max(METERING_FLOOR_DB, Math.min(0, db));
  const norm = (clamped - METERING_FLOOR_DB) / -METERING_FLOOR_DB;
  return Math.max(BASELINE_AMPLITUDE, Math.min(1, norm));
};

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

/**
 * Normalize a recorder-returned path to a `file://`-prefixed URI that
 * `fetch` can read on both platforms.
 *
 * - iOS:     nitro-sound already returns a full `file:///...` URL.
 * - Android: returns a bare absolute path like
 *            `/data/user/0/com.la/cache/sound.mp4`. `fetch` (and
 *            `FormData` file uploads) need the `file:///` prefix or they
 *            silently fail.
 */
const toFileUri = (raw: string): string => {
  if (!raw) return raw;
  if (raw.startsWith('file://')) return raw;
  if (raw.startsWith('content://')) return raw; // Android scoped storage
  // Strip leading slashes and re-prefix — keeps the URL well-formed
  // regardless of how many slashes the native side returned.
  const cleaned = raw.replace(/^\/+/, '');
  return `file:///${cleaned}`;
};

/**
 * Best-effort check whether a recorder-returned URI resolves to a
 * non-empty file. Used to catch the silent failure where some Android
 * devices return a URI from `stopRecorder` but never wrote any audio
 * data to it.
 */
const isRecordingNonEmpty = async (uri: string): Promise<boolean> => {
  if (!uri) return false;
  const fetchable = toFileUri(uri);
  try {
    // RN's fetch supports file:// reads on both platforms; HEAD isn't
    // universally supported for file URIs so we issue a GET and inspect
    // the resulting blob size. This is cheap for the tiny files involved
    // (a 40-second m4a is ~200KB).
    const res = await fetch(fetchable);
    const blob = await res.blob();
    return blob.size > 256; // 256B = any plausible container header
  } catch {
    // If we can't read the file at all assume it's bad.
    return false;
  }
};

export const useVoiceRecorder = (
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn => {
  const {
    maxDurationSec,
    onFinish,
    onTick,
    onError,
    stopOnBackground = true,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [recording, setRecording] = useState<
    UseVoiceRecorderReturn['recording']
  >(null);

  // `secondsRemaining` is *derived* from `secondsElapsed` so the tick only
  // has to maintain ONE source of truth. Previously this was a separate
  // useState that the tick had to keep in sync via setSecondsRemaining —
  // and any missed/dropped setter call would freeze the visible countdown
  // even while native recording continued. Deriving it removes that whole
  // class of bug and also keeps the value at `0` until the user actually
  // starts a take (no "35s shown before tap" wart).
  const secondsRemaining = useMemo(() => {
    if (!isRecording) return 0;
    if (!maxDurationSec || maxDurationSec <= 0) return 0;
    return Math.max(0, maxDurationSec - secondsElapsed);
  }, [isRecording, maxDurationSec, secondsElapsed]);

  const amplitudeRef = useRef(new Animated.Value(BASELINE_AMPLITUDE));
  const ownerIdRef = useRef(`recorder-${Math.random().toString(36).slice(2)}`);
  const startedAtRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Hard backup auto-stop timer. The per-second `tickIntervalRef` would
   * normally trigger teardown at `maxDurationSec`, but `setInterval` is
   * not reliable when the JS thread stalls (heavy render, slow native
   * bridge, etc.) — and we'd rather under-record than let a forgotten
   * mic burn through battery + storage. This one-shot `setTimeout`
   * fires at the absolute deadline regardless of how many ticks were
   * delivered, guaranteeing the recording cannot exceed `maxDurationSec`
   * by more than scheduler jitter.
   */
  const hardStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /**
   * Holds the native-returned URI for the *in-flight* recording. We don't
   * surface it as `recording` state until teardown validates the file —
   * exposing it early would let the UI enable a "Submit" button while the
   * mic is still capturing (and the file isn't finalized on disk).
   */
  const inFlightUriRef = useRef<string | null>(null);

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
  const maxDurationSecRef = useRef(maxDurationSec);
  useEffect(() => {
    onFinishRef.current = onFinish;
    onTickRef.current = onTick;
    onErrorRef.current = onError;
    maxDurationSecRef.current = maxDurationSec;
  }, [onFinish, onTick, onError, maxDurationSec]);

  const clearTick = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (hardStopTimeoutRef.current) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
  }, []);

  const teardown = useCallback(
    async (emitFinish: boolean, interruptReason?: VoiceRecorderErrorCode) => {
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
        // No native handle to release; emit finish with whatever was captured
        // (typically nothing — see the bail branch in performStart which
        // now clears `setRecording(null)` to prevent leaking a bogus URI).
        if (emitFinish) {
          onFinishRef.current?.(null, 0);
        }
        stopRequestedRef.current = false;
        return;
      }
      stoppedRef.current = true;

      clearTick();

      const max = maxDurationSecRef.current;
      let elapsed = 0;
      if (startedAtRef.current > 0) {
        elapsed = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        if (max && max > 0) {
          elapsed = Math.min(max, elapsed);
        }
      }

      // Race `Sound.stopRecorder` against a generous timeout. We've seen
      // the native promise hang indefinitely on some devices when the
      // audio session is in an unexpected state (interrupted, route
      // change). Hanging here would leave the UI stuck in 'recording'
      // forever — better to fall back to the URI we cached at start.
      let uri: string | null = null;
      try {
        const stoppedUri = await Promise.race([
          Sound.stopRecorder(),
          new Promise<string | null>(resolve =>
            setTimeout(() => resolve(null), 3000),
          ),
        ]);
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

      // Fall back to the URI we captured at start time — some platforms
      // return null from `stopRecorder` even though the file exists where
      // `startRecorder` reported.
      if (!uri && inFlightUriRef.current) {
        uri = inFlightUriRef.current;
      }
      inFlightUriRef.current = null;

      soundCoordinator.release(ownerIdRef.current);

      amplitudeRef.current.setValue(BASELINE_AMPLITUDE);
      setIsRecording(false);

      // Validate the file before reporting success. Some Android devices
      // return a URI from stopRecorder even when no audio was written
      // (e.g. permission revoked mid-recording, audio focus loss).
      let finalUri: string | null = null;
      if (uri) {
        const normalized = toFileUri(uri);
        const ok = await isRecordingNonEmpty(normalized);
        if (ok) {
          finalUri = normalized;
          setRecording({ uri: normalized, durationSec: elapsed });
        } else {
          onErrorRef.current?.(
            new Error(`Recording at ${normalized} is empty.`),
            'empty',
          );
          setRecording(null);
        }
      }

      // If the teardown was triggered by an interruption (e.g. app
      // backgrounded), surface that to the consumer too — it lets the UI
      // show a friendlier message than a generic stop.
      if (interruptReason) {
        onErrorRef.current?.(
          new Error('Recording was interrupted.'),
          interruptReason,
        );
      }

      if (emitFinish) {
        onFinishRef.current?.(finalUri, elapsed);
      }
      stopRequestedRef.current = false;
    },
    [clearTick],
  );

  const performStart = useCallback(async (): Promise<boolean> => {
    // Permission gate (Android runtime). iOS triggers its prompt inside
    // `Sound.startRecorder` itself — we keep `isRecording` false until
    // native resolves, which avoids the "recording" UI flicker while the
    // permission sheet is up.
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

    // Reset state for a fresh take. `secondsRemaining` is derived from
    // `secondsElapsed` + isRecording so we don't have to (and shouldn't)
    // touch it here — it'll snap to `maxDurationSec` the moment
    // setIsRecording(true) fires below.
    clearTick();
    setRecording(null);
    setSecondsElapsed(0);
    amplitudeRef.current.setValue(BASELINE_AMPLITUDE);

    soundCoordinator.acquire(ownerIdRef.current, 'recorder', () => {
      // Someone else took the slot — abandon without re-stopping native
      // (they own it now).
      clearTick();
      stoppedRef.current = true;
      setIsRecording(false);
      amplitudeRef.current.setValue(BASELINE_AMPLITUDE);
    });

    // Internal "we hold the slot" flag flips BEFORE awaiting native so a
    // concurrent stop() can find a non-no-op recorder. The UI-facing
    // `isRecording` is intentionally deferred to AFTER the await so iOS
    // doesn't flash "Recording..." while the permission prompt is on screen.
    stoppedRef.current = false;
    startedAtRef.current = Date.now();

    try {
      const uri = await Sound.startRecorder(undefined, undefined, true);

      // Stop was requested while native start was in flight — release the
      // native handle and bail out before we install listeners/ticks.
      // IMPORTANT: clear `recording` state too, otherwise the consumer may
      // see a bogus 0-second URI from a half-started session.
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
        setRecording(null);
        inFlightUriRef.current = null;
        setIsRecording(false);
        stoppedRef.current = true;
        return false;
      }

      if (uri) {
        // Reset the start clock to the moment native ACTUALLY started — on
        // iOS the permission prompt can swallow several seconds; counting
        // those as "elapsed" would shorten the user's actual recording.
        startedAtRef.current = Date.now();
        // Stash the URI in a ref instead of `recording` state — teardown
        // will validate the file and promote it to public `recording`
        // state. Surfacing it now would let the screen's Submit button
        // enable before the user has actually finished speaking.
        inFlightUriRef.current = toFileUri(uri);
      }

      // Now that native is live AND no stop has been queued, surface
      // "recording" to the UI.
      setIsRecording(true);

      Sound.addRecordBackListener((e: RecordBackType) => {
        amplitudeRef.current.setValue(normalizeMetering(e.currentMetering));
      });

      // Tick is intentionally minimal: it only advances `secondsElapsed`.
      // `secondsRemaining` is *derived* in the hook body via useMemo, so
      // there's no second piece of state that can fall out of sync.
      tickIntervalRef.current = setInterval(() => {
        if (stoppedRef.current) {
          clearTick();
          return;
        }
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
        setSecondsElapsed(elapsed);

        const max = maxDurationSecRef.current;
        if (max && max > 0) {
          const remaining = Math.max(0, max - elapsed);
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

      // Hard backup auto-stop. If the JS thread stalls (heavy render or
      // native bridge backpressure during the recording) the per-second
      // tick can be delayed by many seconds — leaving the mic open well
      // past `maxDurationSec`. This one-shot timer fires at the absolute
      // deadline and tears down the recorder regardless of tick health.
      const maxAtStart = maxDurationSecRef.current;
      if (maxAtStart && maxAtStart > 0) {
        hardStopTimeoutRef.current = setTimeout(() => {
          if (stoppedRef.current) return;
          // Reuse the same fire-and-forget teardown — onFinish/onError
          // flow is identical to the tick's auto-stop path.
          teardown(true).catch(() => {});
        }, maxAtStart * 1000);
      }

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
  }, [clearTick, teardown]);

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
    inFlightUriRef.current = null;
    setSecondsElapsed(0);
  }, [teardown]);

  // ── AppState handling ───────────────────────────────────────────────────
  // iOS / Android both stop a foreground-only audio session when the app
  // moves to background. Without this listener the UI stays "recording"
  // while the native session is dead, and the user submits an empty file.
  useEffect(() => {
    if (!stopOnBackground) return;
    const subscription = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        // 'inactive' fires for a system overlay (Control Center, incoming
        // call sheet) where iOS often pauses the session. We treat both
        // states as "interrupted" since we can't reliably resume.
        if (next === 'background' || next === 'inactive') {
          if (!stoppedRef.current) {
            teardown(true, 'interrupted').catch(() => {});
          }
        }
      },
    );
    return () => subscription.remove();
  }, [stopOnBackground, teardown]);

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
