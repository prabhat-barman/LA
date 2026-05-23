import { useCallback, useEffect, useRef, useState } from 'react';
import Sound, { PlayBackType } from 'react-native-nitro-sound';
import { soundCoordinator } from './soundCoordinator';

export interface UseAudioPlayerOptions {
  /** Fires when playback reaches end naturally. */
  onComplete?: () => void;
  /** Fires when playback is preempted by another player/recorder. */
  onPreempt?: () => void;
  /** Fires on a `startPlayer` error. */
  onError?: (err: unknown) => void;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  /** Progress in [0..1]. Safe for empty/zero-duration tracks. */
  progress: number;

  play: (uri: string) => Promise<boolean>;
  stop: () => Promise<void>;
}

export const useAudioPlayer = (
  options: UseAudioPlayerOptions = {},
): UseAudioPlayerReturn => {
  const { onComplete, onPreempt, onError } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const ownerIdRef = useRef(`player-${Math.random().toString(36).slice(2)}`);
  const mountedRef = useRef(true);

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

  const play = useCallback(
    async (uri: string): Promise<boolean> => {
      if (!uri) return false;

      const id = ownerIdRef.current;

      soundCoordinator.acquire(id, 'player', () => {
        if (!mountedRef.current) return;
        setIsPlaying(false);
        onPreemptRef.current?.();
      });

      // Always start from a clean listener state.
      detachListeners();

      if (mountedRef.current) {
        setPositionMs(0);
        setDurationMs(0);
        setIsPlaying(true);
      }

      try {
        await Sound.startPlayer(uri);

        Sound.addPlayBackListener((e: PlayBackType) => {
          if (!mountedRef.current || !soundCoordinator.isOwner(id)) return;
          setPositionMs(e.currentPosition ?? 0);
          if (e.duration && e.duration > 0) {
            setDurationMs(e.duration);
          }
        });

        Sound.addPlaybackEndListener(() => {
          if (!soundCoordinator.isOwner(id)) return;
          detachListeners();
          Sound.stopPlayer().catch(() => {});
          soundCoordinator.release(id);
          if (mountedRef.current) {
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
    [detachListeners],
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
    play,
    stop,
  };
};
