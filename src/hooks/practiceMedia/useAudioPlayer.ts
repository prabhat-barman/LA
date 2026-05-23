import { useCallback, useEffect, useRef, useState } from 'react';
import Sound, { PlayBackType } from 'react-native-nitro-sound';
import { soundCoordinator } from './soundCoordinator';

/** Range guard for `setPlaybackSpeed` — AVAudioPlayer accepts 0.5..2.0 reliably. */
const MIN_RATE = 0.5;
const MAX_RATE = 2.0;
const clampRate = (r: number) =>
  Math.min(MAX_RATE, Math.max(MIN_RATE, r));

export interface UseAudioPlayerOptions {
  /** Fires when playback reaches end naturally. */
  onComplete?: () => void;
  /** Fires when playback is preempted by another player/recorder. */
  onPreempt?: () => void;
  /** Fires on a `startPlayer` error. */
  onError?: (err: unknown) => void;
  /**
   * Initial playback rate (0.5..2.0). Defaults to 1.0. Use the returned
   * `setRate()` to change it mid-playback.
   */
  initialRate?: number;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  /** Progress in [0..1]. Safe for empty/zero-duration tracks. */
  progress: number;
  /** Current playback rate. */
  rate: number;

  /**
   * Start playback of `uri`. If `rate` is provided it overrides the current
   * rate for this call (and updates the hook's tracked rate so subsequent
   * UI reflects it).
   */
  play: (uri: string, rate?: number) => Promise<boolean>;
  stop: () => Promise<void>;
  /**
   * Set the playback rate. Applied immediately if playback is active,
   * otherwise stored for the next `play()` call.
   */
  setRate: (rate: number) => Promise<void>;
}

export const useAudioPlayer = (
  options: UseAudioPlayerOptions = {},
): UseAudioPlayerReturn => {
  const { onComplete, onPreempt, onError, initialRate = 1.0 } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(() => clampRate(initialRate));

  const ownerIdRef = useRef(`player-${Math.random().toString(36).slice(2)}`);
  const mountedRef = useRef(true);
  // Tracked rate (mirrors `rate` state but readable inside async callbacks
  // without listing it in deps).
  const rateRef = useRef(rate);
  rateRef.current = rate;
  // Latest known duration — read from the playback-end listener which is
  // attached BEFORE we know the final duration, so closed-over `durationMs`
  // would otherwise be stale.
  const durationRef = useRef(0);
  durationRef.current = durationMs;

  const onCompleteRef = useRef(onComplete);
  const onPreemptRef = useRef(onPreempt);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onPreemptRef.current = onPreempt;
    onErrorRef.current = onError;
  }, [onComplete, onPreempt, onError]);

  const detachListeners = useCallback(() => {
    try {
      Sound.removePlayBackListener();
    } catch {
      // quiet fail
    }
    try {
      Sound.removePlaybackEndListener();
    } catch {
      // quiet fail
    }
  }, []);

  const stop = useCallback(async () => {
    const wasOwner = soundCoordinator.isOwner(ownerIdRef.current);

    if (mountedRef.current) {
      setIsPlaying(false);
    }

    if (wasOwner) {
      detachListeners();
      try {
        await Sound.stopPlayer();
      } catch {
        // quiet fail — native may already be stopped
      }
      soundCoordinator.release(ownerIdRef.current);
    }
  }, [detachListeners]);

  const setRate = useCallback(async (next: number) => {
    const clamped = clampRate(next);
    rateRef.current = clamped;
    if (mountedRef.current) {
      setRateState(clamped);
    }
    // Only push to native when we currently own the player; otherwise the
    // value is queued for the next play() call.
    if (soundCoordinator.isOwner(ownerIdRef.current)) {
      try {
        await Sound.setPlaybackSpeed(clamped);
      } catch {
        // quiet fail — some devices reject rate changes mid-stream
      }
    }
  }, []);

  const play = useCallback(
    async (uri: string, playRate?: number): Promise<boolean> => {
      if (!uri) return false;

      const id = ownerIdRef.current;

      soundCoordinator.acquire(id, 'player', () => {
        if (!mountedRef.current) return;
        setIsPlaying(false);
        onPreemptRef.current?.();
      });

      // Ensure no stale listeners survive a quick play→play sequence.
      detachListeners();
      // Hard-stop any previous player session held by THIS hook before
      // starting a new one — guards against fast back-to-back play() calls
      // racing inside native.
      try {
        await Sound.stopPlayer();
      } catch {
        // already stopped — fine
      }

      // Resolve the rate to use for this play call.
      const useRate = clampRate(playRate ?? rateRef.current);
      rateRef.current = useRate;
      if (mountedRef.current && useRate !== rate) {
        setRateState(useRate);
      }

      if (mountedRef.current) {
        setPositionMs(0);
        setDurationMs(0);
        setIsPlaying(true);
      }

      try {
        await Sound.startPlayer(uri);

        // Apply rate AFTER startPlayer — most platforms reject the call on
        // a freshly-constructed but not-yet-started player.
        if (useRate !== 1.0) {
          try {
            await Sound.setPlaybackSpeed(useRate);
          } catch {
            // quiet fail
          }
        }

        Sound.addPlayBackListener((e: PlayBackType) => {
          if (!mountedRef.current || !soundCoordinator.isOwner(id)) return;
          setPositionMs(e.currentPosition ?? 0);
          if (e.duration && e.duration > 0) {
            setDurationMs(e.duration);
          }
        });

        Sound.addPlaybackEndListener((e) => {
          if (!soundCoordinator.isOwner(id)) return;
          detachListeners();
          Sound.stopPlayer().catch(() => {});
          soundCoordinator.release(id);
          if (mountedRef.current) {
            // Snap progress to 100% on natural completion. Without this
            // the progress bar gets stuck at ~98% because the periodic
            // playback listener doesn't always fire one last tick at
            // exactly `duration` — visual leftover that makes finished
            // audio look unfinished. `PlaybackEndType.duration` is the
            // authoritative value from the native side at the moment the
            // playback ended.
            const finalDuration = e?.duration ?? 0;
            if (finalDuration > 0) {
              setDurationMs(finalDuration);
              setPositionMs(finalDuration);
            } else {
              // Fallback: bump position up to whatever duration we last
              // knew about so the UI at least matches the bar's max.
              setPositionMs((prev) => Math.max(prev, durationRef.current));
            }
            setIsPlaying(false);
          }
          onCompleteRef.current?.();
        });

        return true;
      } catch (err) {
        soundCoordinator.release(id);
        if (mountedRef.current) {
          setIsPlaying(false);
        }
        onErrorRef.current?.(err);
        return false;
      }
    },
    [detachListeners, rate],
  );

  // Cleanup on unmount. Capture the owner id at mount time so the cleanup
  // doesn't depend on `ownerIdRef.current` at teardown.
  useEffect(() => {
    const id = ownerIdRef.current;
    return () => {
      mountedRef.current = false;
      if (soundCoordinator.isOwner(id)) {
        try {
          Sound.removePlayBackListener();
        } catch {
          // quiet fail
        }
        try {
          Sound.removePlaybackEndListener();
        } catch {
          // quiet fail
        }
        Sound.stopPlayer().catch(() => {});
        soundCoordinator.release(id);
      }
    };
  }, []);

  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  return {
    isPlaying,
    positionMs,
    durationMs,
    progress,
    rate,
    play,
    stop,
    setRate,
  };
};
