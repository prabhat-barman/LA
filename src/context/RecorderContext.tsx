import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import { useAudioPlayer } from '../hooks/practiceMedia/useAudioPlayer';
import { useVoiceRecorder } from '../hooks/practiceMedia/useVoiceRecorder';
import type { QuestionMetadata } from '../config/practiceData';
import { logger } from '../services/logger';

export type MediaPhase =
  | 'idle'
  | 'audio_wait'
  | 'audio_playing'
  | 'audio_done'
  | 'prep_countdown'
  | 'recording'
  | 'review';

export interface RecorderContextValue {
  phase: MediaPhase;
  recordedUri: string | null;
  recordingDurationSec: number;
  amplitude: Animated.Value;
  resolvedPrepTimeSec: number;

  getAudioProgress: () => { positionMs: number; durationMs: number; progress: number };
  subscribeToAudioProgress: (listener: (posMs: number, durMs: number, progress: number) => void) => () => void;

  getSecondsLeft: () => number;
  subscribeToTimer: (listener: (secs: number) => void) => () => void;

  initQuestion: (params: {
    metadata: QuestionMetadata;
    isCore?: boolean;
    audioUrl?: string;
    autoStart?: boolean;
    onAudioFinish?: () => void;
    onRecordingFinish?: (uri: string | null, durationSec: number) => void;
    onError?: (message: string) => void;
  }) => void;

  start: () => void;
  replayAudio: () => Promise<void>;
  skipAudio: () => Promise<void>;
  startRecordingNow: () => Promise<void>;
  stopRecording: () => Promise<void>;
  retake: () => void;
  reset: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

const hasRecording = (m: QuestionMetadata) =>
  Boolean(m.recordingDuration && m.recordingDuration > 0);

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<MediaPhase>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);
  const [resolvedPrepTimeSec, setResolvedPrepTimeSec] = useState<number>(35);
  const [maxDurationSec, setMaxDurationSec] = useState<number | undefined>(undefined);

  const phaseRef = useRef<MediaPhase>('idle');
  phaseRef.current = phase;

  const recordedUriRef = useRef<string | null>(null);
  recordedUriRef.current = recordedUri;

  // Active configurations in refs to avoid rebuilding callbacks
  const metadataRef = useRef<QuestionMetadata | null>(null);
  const isCoreRef = useRef<boolean>(false);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const onAudioFinishRef = useRef<(() => void) | undefined>(undefined);
  const onRecordingFinishRef = useRef<((uri: string | null, durationSec: number) => void) | undefined>(undefined);
  const onErrorRef = useRef<((message: string) => void) | undefined>(undefined);
  const resolvedPrepTimeSecRef = useRef<number>(35);
  resolvedPrepTimeSecRef.current = resolvedPrepTimeSec;

  // Timer subscription management
  const timerListeners = useRef<Set<(secs: number) => void>>(new Set());
  const secondsLeftRef = useRef<number>(0);

  const notifyTimerListeners = useCallback((secs: number) => {
    secondsLeftRef.current = secs;
    timerListeners.current.forEach(cb => {
      try {
        cb(secs);
      } catch (err) {
        logger.warn('Error in timer listener:', err);
      }
    });
  }, []);

  const getSecondsLeft = useCallback(() => secondsLeftRef.current, []);

  const subscribeToTimer = useCallback((listener: (secs: number) => void) => {
    timerListeners.current.add(listener);
    // Initialize subscriber with current value immediately
    listener(secondsLeftRef.current);
    return () => {
      timerListeners.current.delete(listener);
    };
  }, []);

  // Audio progress subscription management
  const audioListeners = useRef<Set<(posMs: number, durMs: number, progress: number) => void>>(new Set());
  const audioProgressRef = useRef({ positionMs: 0, durationMs: 0, progress: 0 });

  const getAudioProgress = useCallback(() => audioProgressRef.current, []);

  const subscribeToAudioProgress = useCallback((listener: (posMs: number, durMs: number, progress: number) => void) => {
    audioListeners.current.add(listener);
    const { positionMs, durationMs, progress } = audioProgressRef.current;
    listener(positionMs, durationMs, progress);
    return () => {
      audioListeners.current.delete(listener);
    };
  }, []);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // `startPrepCountdown` is defined further down — settleAfterAudio
  // needs to call it without forming a cyclic useCallback dep chain.
  // Stash the latest closure in a ref and dereference at call time;
  // this keeps exhaustive-deps satisfied without invalidating the
  // callback identity on every render.
  const startPrepCountdownRef = useRef<(() => void) | null>(null);

  // Settle flow after playback completes or is skipped
  const settleAfterAudio = useCallback(() => {
    if (recordedUriRef.current) {
      setPhase('review');
      notifyTimerListeners(0);
      return;
    }
    const meta = metadataRef.current;
    if (meta && hasRecording(meta)) {
      startPrepCountdownRef.current?.();
    } else {
      setPhase('audio_done');
      notifyTimerListeners(0);
    }
  }, [notifyTimerListeners]);

  // Hook integrations
  const player = useAudioPlayer({
    initialRate: 1.0,
    onComplete: () => {
      if (phaseRef.current !== 'audio_playing') return;
      onAudioFinishRef.current?.();
      settleAfterAudio();
    },
    onPreempt: () => {
      if (phaseRef.current === 'audio_playing') {
        settleAfterAudio();
      }
    },
    onError: (err) => {
      logger.warn('Audio player error:', err);
      onAudioFinishRef.current?.();
      settleAfterAudio();
    },
  });

  const recorder = useVoiceRecorder({
    maxDurationSec: maxDurationSec,
    onFinish: (uri, elapsedSec) => {
      clearCountdown();
      setPhase('review');
      notifyTimerListeners(0);
      onRecordingFinishRef.current?.(uri, elapsedSec);
      if (uri) {
        setRecordedUri(uri);
        setRecordingDurationSec(elapsedSec);
      }
    },
    onTick: (remainingSec) => {
      notifyTimerListeners(remainingSec);
    },
    onError: (err, code) => {
      logger.warn('Voice recorder error:', err, code);
      switch (code) {
        case 'permission':
          onErrorRef.current?.('Microphone permission is required to practice speaking.');
          break;
        case 'interrupted':
          onErrorRef.current?.('Recording was interrupted (you left the app). Please retake.');
          break;
        case 'empty':
          onErrorRef.current?.("We couldn't capture any audio — please check your mic and retake.");
          break;
        default:
          onErrorRef.current?.('Failed to start recording.');
      }
      if (phaseRef.current !== 'review') {
        setPhase('review');
      }
    },
  });

  // Sync player position state changes to subscribers
  const audioPositionMs = player.positionMs;
  const audioDurationMs = player.durationMs;
  const audioProgress = player.progress;

  const { play: playAudio, stop: stopAudio, setRate: setAudioRate } = player;
  const { start: startRecorder, stop: stopRecorder, reset: resetRecorder, amplitude: recorderAmplitude } = recorder;

  useEffect(() => {
    audioProgressRef.current = {
      positionMs: audioPositionMs,
      durationMs: audioDurationMs,
      progress: audioProgress,
    };
    audioListeners.current.forEach(cb => {
      try {
        cb(audioPositionMs, audioDurationMs, audioProgress);
      } catch (err) {
        logger.warn('Error in audio progress listener:', err);
      }
    });
  }, [audioPositionMs, audioDurationMs, audioProgress]);

  // Sub-callbacks for orchestration
  const playQuestionAudio = useCallback(async (url: string) => {
    setPhase('audio_playing');
    notifyTimerListeners(0);
    const ok = await playAudio(url);
    if (!ok && phaseRef.current === 'audio_playing') {
      settleAfterAudio();
    }
  }, [playAudio, settleAfterAudio, notifyTimerListeners]);

  const startRecording = useCallback(async () => {
    clearCountdown();
    const meta = metadataRef.current;
    if (!meta) return;

    setPhase('recording');
    notifyTimerListeners(meta.recordingDuration);

    await stopAudio();
    const ok = await startRecorder();
    if (!ok) {
      clearCountdown();
    }
  }, [clearCountdown, stopAudio, startRecorder, notifyTimerListeners]);

  const startPrepCountdown = useCallback(() => {
    clearCountdown();
    const meta = metadataRef.current;
    if (!meta || !hasRecording(meta)) {
      setPhase('audio_done');
      return;
    }

    const prepTime = resolvedPrepTimeSecRef.current;
    if (prepTime <= 0) {
      startRecording();
      return;
    }

    setPhase('prep_countdown');
    notifyTimerListeners(prepTime);

    let remaining = prepTime;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      notifyTimerListeners(remaining);
      if (remaining <= 0) {
        clearCountdown();
        startRecording();
      }
    }, 1000);
  }, [clearCountdown, startRecording, notifyTimerListeners]);

  // Keep the forward-reference ref in sync so settleAfterAudio (defined
  // earlier) can call the latest startPrepCountdown without listing it
  // as a useCallback dependency.
  startPrepCountdownRef.current = startPrepCountdown;

  const start = useCallback(() => {
    clearCountdown();
    const meta = metadataRef.current;
    if (!meta) return;

    if (!meta.hasAudio && !hasRecording(meta)) {
      setPhase('idle');
      notifyTimerListeners(0);
      return;
    }

    if (meta.hasAudio) {
      const url = audioUrlRef.current;
      if (!url) {
        if (hasRecording(meta)) {
          startPrepCountdown();
        } else {
          setPhase('audio_done');
          notifyTimerListeners(0);
        }
        return;
      }

      const wait = meta.waitTimeBeforeAudio;
      if (wait > 0) {
        setPhase('audio_wait');
        notifyTimerListeners(wait);
        let remaining = wait;
        countdownIntervalRef.current = setInterval(() => {
          remaining -= 1;
          notifyTimerListeners(remaining);
          if (remaining <= 0) {
            clearCountdown();
            playQuestionAudio(url);
          }
        }, 1000);
      } else {
        playQuestionAudio(url);
      }
      return;
    }

    startPrepCountdown();
  }, [clearCountdown, playQuestionAudio, startPrepCountdown, notifyTimerListeners]);

  // Exposed API implementations
  const initQuestion = useCallback((params: {
    metadata: QuestionMetadata;
    isCore?: boolean;
    audioUrl?: string;
    autoStart?: boolean;
    onAudioFinish?: () => void;
    onRecordingFinish?: (uri: string | null, durationSec: number) => void;
    onError?: (message: string) => void;
  }) => {
    clearCountdown();
    stopAudio().catch(() => {});
    resetRecorder().catch(() => {});

    metadataRef.current = params.metadata;
    setMaxDurationSec(params.metadata.recordingDuration);
    isCoreRef.current = !!params.isCore;
    audioUrlRef.current = params.audioUrl;
    onAudioFinishRef.current = params.onAudioFinish;
    onRecordingFinishRef.current = params.onRecordingFinish;
    onErrorRef.current = params.onError;

    const prep = params.isCore && params.metadata.pteCoreWaitTimeBeforeRecording !== undefined
      ? params.metadata.pteCoreWaitTimeBeforeRecording
      : params.metadata.waitTimeBeforeRecording;

    setResolvedPrepTimeSec(prep);
    setRecordedUri(null);
    setRecordingDurationSec(0);
    setPhase('idle');
    notifyTimerListeners(0);

    if (params.autoStart !== false) {
      // Delay slightly or schedule next-tick to allow refs to bind properly
      setTimeout(() => {
        start();
      }, 0);
    }
  }, [clearCountdown, stopAudio, resetRecorder, start, notifyTimerListeners]);

  const replayAudio = useCallback(async () => {
    const url = audioUrlRef.current;
    if (!url || !metadataRef.current?.hasAudio) return;
    clearCountdown();
    setPhase('audio_playing');
    notifyTimerListeners(0);
    const ok = await playAudio(url);
    if (!ok && phaseRef.current === 'audio_playing') {
      settleAfterAudio();
    }
  }, [playAudio, settleAfterAudio, notifyTimerListeners, clearCountdown]);

  const skipAudio = useCallback(async () => {
    if (phaseRef.current !== 'audio_playing' && phaseRef.current !== 'audio_wait') {
      return;
    }
    clearCountdown();
    await stopAudio();
    onAudioFinishRef.current?.();
    settleAfterAudio();
  }, [stopAudio, settleAfterAudio, clearCountdown]);

  const startRecordingNow = useCallback(async () => {
    if (phaseRef.current !== 'prep_countdown') return;
    await startRecording();
  }, [startRecording]);

  const stopRecording = useCallback(async () => {
    if (phaseRef.current !== 'recording') return;
    clearCountdown();
    await stopRecorder();
  }, [clearCountdown, stopRecorder]);

  const retake = useCallback(() => {
    clearCountdown();
    resetRecorder().catch(() => {});
    stopAudio().catch(() => {});
    const meta = metadataRef.current;
    if (meta && hasRecording(meta)) {
      startPrepCountdown();
    } else {
      setPhase('idle');
      notifyTimerListeners(0);
    }
  }, [clearCountdown, stopAudio, resetRecorder, startPrepCountdown, notifyTimerListeners]);

  const reset = useCallback(async () => {
    clearCountdown();
    await stopAudio();
    await resetRecorder();
    setPhase('idle');
    setRecordedUri(null);
    setRecordingDurationSec(0);
    notifyTimerListeners(0);
  }, [clearCountdown, stopAudio, resetRecorder, notifyTimerListeners]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    await setAudioRate(rate);
  }, [setAudioRate]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  const contextValue = useMemo(() => ({
    phase,
    recordedUri,
    recordingDurationSec,
    amplitude: recorderAmplitude,
    resolvedPrepTimeSec,
    getAudioProgress,
    subscribeToAudioProgress,
    getSecondsLeft,
    subscribeToTimer,
    initQuestion,
    start,
    replayAudio,
    skipAudio,
    startRecordingNow,
    stopRecording,
    retake,
    reset,
    setPlaybackRate,
  }), [
    phase,
    recordedUri,
    recordingDurationSec,
    recorderAmplitude,
    resolvedPrepTimeSec,
    getAudioProgress,
    subscribeToAudioProgress,
    getSecondsLeft,
    subscribeToTimer,
    initQuestion,
    start,
    replayAudio,
    skipAudio,
    startRecordingNow,
    stopRecording,
    retake,
    reset,
    setPlaybackRate,
  ]);

  return <RecorderContext.Provider value={contextValue}>{children}</RecorderContext.Provider>;
};

export const useRecorder = () => {
  const context = useContext(RecorderContext);
  if (!context) {
    throw new Error('useRecorder must be used within a RecorderProvider');
  }
  return context;
};
