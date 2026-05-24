/**
 * AudioPlayer — Unified Playback Component (Nitro-Powered)
 *
 * Wraps AudioPlaybackBar and manages start countdown.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AudioPlaybackBar from './AudioPlaybackBar';
import AudioStore from './AudioStore';
import { fonts } from '../../assets/font_color_&_family/font_color_and_family';

export interface AudioPlayerProps {
  id?: string;
  audioUrl: string;
  autoPlay?: boolean | 'auto' | 'manual' | 'both';
  audioStartDelay?: number;
  playOnce?: boolean;
  clickable?: boolean;
  isDarkMode?: boolean;
  isExtensive?: boolean;
  disabled?: boolean;
  onPlaybackComplete?: () => void;
  onPlayTimeChange?: (position: number, duration: number) => void;
  onPlayStateChange?: (active: boolean) => void;
  onReady?: (controls: { pause: () => void; resume: () => void }) => void;
  onError?: (error: any) => void;
  isPaused?: boolean;
}

const AudioPlayer = ({
  id,
  audioUrl,
  autoPlay = false,
  audioStartDelay = 0,
  playOnce = false,
  clickable = true,
  isDarkMode = false,
  isExtensive = false,
  disabled = false,
  onPlaybackComplete,
  onPlayTimeChange,
  onPlayStateChange,
  onReady,
  onError,
  isPaused = false,
}: AudioPlayerProps) => {
  const [countdown, setCountdown] = useState(audioStartDelay);
  const [countingDown, setCountingDown] = useState(audioStartDelay > 0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedId = id || audioUrl;

  useEffect(() => {
    setHasCompleted(false);
  }, [resolvedId, audioUrl]);

  useEffect(() => {
    setHasCompleted(false);
    setCountdown(audioStartDelay);
    setCountingDown(audioStartDelay > 0);
  }, [resolvedId, audioStartDelay]);

  // Countdown before auto-play
  useEffect(() => {
    if (!audioUrl || !autoPlay || audioStartDelay <= 0) {
      setCountingDown(false);
      return;
    }

    setCountdown(audioStartDelay);
    setCountingDown(true);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCountingDown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl, autoPlay, audioStartDelay]);

  // Expose pause/resume controls to parent
  useEffect(() => {
    if (!onReady) return;
    const controls = {
      pause: () => {
        AudioStore.pause();
      },
      resume: () => {
        if (!hasCompleted && resolvedId && audioUrl) {
          AudioStore.play(resolvedId, audioUrl);
        }
      },
    };
    onReady(controls);
  }, [onReady, hasCompleted, resolvedId, audioUrl]);

  const handleComplete = () => {
    setHasCompleted(true);
    onPlaybackComplete?.();
  };

  if (!audioUrl) return null;

  if (countingDown) {
    return (
      <View style={styles.countdownContainer}>
        <Text style={[styles.countdownText, isDarkMode && styles.countdownTextDark]}>
          {countdown === 0
            ? 'Audio will start in few seconds.'
            : `Audio will start in ${countdown} second${countdown !== 1 ? 's.' : '.'}`}
        </Text>
      </View>
    );
  }

  const resolvedAutoPlay =
    typeof autoPlay === 'string'
      ? autoPlay === 'both' && clickable === false
        ? 'auto'
        : autoPlay
      : autoPlay
        ? clickable === false
          ? 'auto'
          : 'both'
        : clickable
          ? 'manual'
          : 'auto';

  return (
    <AudioPlaybackBar
      id={resolvedId}
      audioUrl={audioUrl}
      autoPlay={resolvedAutoPlay}
      isDarkMode={isDarkMode}
      isExtensive={isExtensive}
      disabled={disabled || (playOnce && hasCompleted)}
      onAudioComplete={handleComplete}
      onPlayTimeChange={onPlayTimeChange}
      onPlayStateChange={onPlayStateChange}
      onError={onError}
      isPaused={isPaused}
    />
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  countdownText: {
    fontSize: 16,
    fontFamily: fonts.DMSansMedium,
    color: '#333',
    textAlign: 'center',
  },
  countdownTextDark: {
    color: '#E0E0E0',
  },
});

export default AudioPlayer;
