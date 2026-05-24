import { useCallback, useState } from 'react';
import { getAttemptAudioFile } from '../helpers';

interface UseAttemptAudioPlayerArgs {
  resolveAudioUrl: (file: string) => string;
  onError: (msg: string) => void;
  // Side-effects that must run when an attempt clip starts: stop sample
  // playback and the recorder (which would otherwise keep capturing
  // silently in the background).
  beforePlay?: () => void | Promise<void>;
}

export interface UseAttemptAudioPlayerReturn {
  source: string | null;
  paused: boolean;
  isPlaying: boolean;
  playingId: string | number | null;
  toggle: (attempt: any) => void;
  stop: () => void;
}

// Owns the WebView <audio> element used to play attempt recordings on iOS.
// Native players (AVAudioPlayer / nitro-sound) routinely fail on S3 mp3s
// served with the wrong Content-Type, so we route playback through a hidden
// WebView. This hook owns the URL + playing-id state machine; the screen
// renders <HiddenAttemptAudioWebView source=... /> to actually play it.
export const useAttemptAudioPlayer = ({
  resolveAudioUrl,
  onError,
  beforePlay,
}: UseAttemptAudioPlayerArgs): UseAttemptAudioPlayerReturn => {
  const [source, setSource] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean>(true);
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const isPlaying = !!source && !paused;

  const stop = useCallback(() => {
    setPaused(true);
    setSource(null);
    setPlayingId(null);
  }, []);

  const toggle = useCallback(
    (attempt: any) => {
      const rawFile = getAttemptAudioFile(attempt);
      if (!rawFile) {
        onError('No recording available for this attempt.');
        return;
      }
      const attemptId = attempt?.id ?? rawFile;

      if (playingId === attemptId && !paused) {
        stop();
        return;
      }

      const url = resolveAudioUrl(rawFile);
      if (!url) {
        onError('Unable to resolve attempt audio URL.');
        return;
      }

      // Fire and forget — beforePlay handles releasing other audio sessions.
      Promise.resolve(beforePlay?.()).catch(() => {});

      setPlayingId(attemptId);
      setSource(url);
      setPaused(false);
    },
    [paused, playingId, resolveAudioUrl, onError, beforePlay, stop],
  );

  return { source, paused, isPlaying, playingId, toggle, stop };
};
