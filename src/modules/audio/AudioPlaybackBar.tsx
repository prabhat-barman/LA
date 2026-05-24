/**
 * AudioPlaybackBar — Shared Audio Playback UI Component (Nitro-Powered)
 *
 * Driven entirely by the singleton AudioStore.
 * The react-native-video component is removed; react-native-nitro-sound handles
 * the playback natively via AudioStore.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import AudioStore from './AudioStore';
import WaveformSeekBar from './WaveformSeekBar';
import { images } from '../../assets/imageUrl';
import { Colors, fonts } from '../../assets/font_color_&_family/font_color_and_family';

export interface AudioPlaybackBarProps {
  id: string;
  audioUrl: string;
  autoPlay?: boolean | 'auto' | 'manual' | 'both';
  preload?: boolean;
  disabled?: boolean;
  isDarkMode?: boolean;
  onPlayStateChange?: (active: boolean) => void;
  onAudioComplete?: () => void;
  onPlayTimeChange?: (position: number, duration: number) => void;
  onError?: (error: any) => void;
  isPaused?: boolean;
  isExtensive?: boolean;
  lazyMountAudioEngine?: boolean;
  showTimeOnlyWhenPlaying?: boolean;
  seekWidth?: number;
}

export default function AudioPlaybackBar({
  id,
  audioUrl,
  autoPlay = false,
  preload = true,
  disabled = false,
  isDarkMode = false,
  onPlayStateChange,
  onAudioComplete,
  onPlayTimeChange,
  onError,
  isPaused = false,
  isExtensive = false,
  lazyMountAudioEngine = false,
  showTimeOnlyWhenPlaying = false,
}: AudioPlaybackBarProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const isMounted = useRef(true);
  const autoPlayedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normalize autoPlay prop
  const resolvedPlayMode =
    typeof autoPlay === 'boolean' ? (autoPlay ? 'both' : 'manual') : autoPlay;
  const shouldAutoPlay = resolvedPlayMode === 'auto' || resolvedPlayMode === 'both';
  const showButton = resolvedPlayMode === 'manual' || resolvedPlayMode === 'both';
  const seekDisabled = disabled || resolvedPlayMode === 'auto';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
      
      const state = AudioStore.getCurrentState();
      if (state.id === id) {
        AudioStore.stop();
      }
    };
  }, [id]);

  useEffect(() => {
    hasCompletedRef.current = false;
    autoPlayedRef.current = false;
    setPosition(0);

    const cached = AudioStore.getCachedDuration(audioUrl);
    if (cached > 0) setLocalDuration(cached);

    const unsub = AudioStore.subscribeToDuration((url, dur) => {
      if (url === audioUrl && dur > 0 && isMounted.current) {
        setLocalDuration(dur);
      }
    });

    if (preload && audioUrl && !disabled) {
      AudioStore.load(id, audioUrl);
    }

    return () => unsub();
  }, [id, audioUrl, preload, disabled]);

  useEffect(() => {
    const unsub = AudioStore.subscribe(({ id: activeId, playing: isPlaying, loading: isLoading, position: storePos, duration: storeDur }) => {
      if (!isMounted.current) return;
      const isCurrentlyActive = activeId === id;
      setActive(isCurrentlyActive);
      setPlaying(isCurrentlyActive && isPlaying);
      setLoading(isCurrentlyActive && isLoading);

      if (isCurrentlyActive) {
        if (storePos !== undefined) {
          setPosition(storePos);
          if (storePos === 0 && !isPlaying) {
            hasCompletedRef.current = false;
          }
        }
        if (storeDur !== undefined) setDuration(storeDur);
      }

      if (onPlayStateChange) {
        onPlayStateChange(isCurrentlyActive && (isPlaying || isLoading));
      }

      if (!isCurrentlyActive) {
        hasCompletedRef.current = false;
      }
    });

    return () => unsub();
  }, [id, onPlayStateChange]);

  useEffect(() => {
    const unsub = AudioStore.subscribeToProgress((progressId, pos, dur) => {
      if (progressId !== id || !isMounted.current) return;
      setPosition(pos);
      if (dur > 0) setDuration(dur);
      if (onPlayTimeChange) onPlayTimeChange(pos, dur);

      // Completion check
      if (dur > 0 && pos > 0 && pos >= dur - 0.1 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (onAudioComplete) onAudioComplete();
      }
    });
    return () => unsub();
  }, [id, onPlayTimeChange, onAudioComplete]);

  useEffect(() => {
    if (isPaused && playing) {
      AudioStore.pause();
    }
  }, [isPaused, playing]);

  useEffect(() => {
    if (
      shouldAutoPlay &&
      audioUrl &&
      !disabled &&
      !isPaused &&
      !autoPlayedRef.current &&
      !hasCompletedRef.current
    ) {
      autoPlayTimeoutRef.current = setTimeout(async () => {
        if (!isMounted.current || isPaused) return;
        try {
          await AudioStore.play(id, audioUrl);
          const state = AudioStore.getCurrentState();
          if (state.id === id && (state.playing || state.loading)) {
            autoPlayedRef.current = true;
            onPlayStateChange?.(true);
          }
        } catch (err) {
          if (onError) onError(err);
        }
      }, 300);
    }

    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [shouldAutoPlay, audioUrl, disabled, id, isPaused, onError, onPlayStateChange]);

  const toggle = async () => {
    if (disabled) return;
    if (playing) {
      AudioStore.pause();
    } else {
      try {
        if (hasCompletedRef.current) {
          hasCompletedRef.current = false;
          AudioStore.seekTo(0);
        }
        await AudioStore.play(id, audioUrl);
      } catch (err) {
        onError?.(err);
      }
    }
  };

  const seek = (ratio: number) => {
    if (seekDisabled || !duration) return;
    const seekPos = ratio * duration;
    AudioStore.seekTo(seekPos);
    setPosition(seekPos);
  };

  const format = (t: number = 0) =>
    `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

  const progressValue =
    hasCompletedRef.current
      ? 1
      : active && duration
        ? Math.min(1, Math.max(0, position / duration))
        : 0;

  const accentColor = isExtensive
    ? isDarkMode
      ? '#E0E0E0'
      : '#1b4e73'
    : Colors.lime_green;

  const displayDuration = duration || localDuration || 0;
  const showTimeLabel = !showTimeOnlyWhenPlaying || (active && playing);

  return (
    <View style={[styles.row, disabled && { opacity: 0.6 }]}>
      {/* Play / Pause Button */}
      {loading && !playing ? (
        <View style={styles.iconContainer}>
          <ActivityIndicator size="small" color={accentColor} />
        </View>
      ) : resolvedPlayMode === 'auto' ? (
        <View style={styles.iconContainer}>
          <Image
            source={images.sourcePlayIcon}
            style={styles.icon}
            tintColor={accentColor}
          />
        </View>
      ) : (
        <>
          {showButton && (
            <TouchableOpacity
              onPress={toggle}
              style={[
                styles.iconContainer,
                !isExtensive && { backgroundColor: Colors.green_color_light },
              ]}
              disabled={disabled}
            >
              <Image
                source={playing ? images.pause_icon_new : images.play_icon_new}
                style={playing ? styles.icon : styles.icon1}
                tintColor={isExtensive ? accentColor : Colors.white_Color}
              />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Waveform Seekbar */}
      <View
        style={{ flex: 1, height: 36, justifyContent: 'center' }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0 && width !== measuredWidth) setMeasuredWidth(width);
        }}
      >
        {measuredWidth > 0 && (
          <WaveformSeekBar
            progress={progressValue}
            isPlaying={active && playing}
            onSeek={seek}
            seekWidth={measuredWidth}
            disabled={seekDisabled}
            isDarkMode={isDarkMode}
            isExtensive={isExtensive}
          />
        )}
      </View>

      {/* Time Display */}
      {showTimeLabel ? (
        <View style={styles.timeContainer}>
          <Text
            style={[styles.time, isDarkMode && { color: '#E0E0E0' }]}
            numberOfLines={1}
          >
            {active
              ? `${format(hasCompletedRef.current ? displayDuration : position)} / ${format(displayDuration)}`
              : `0:00 / ${format(displayDuration)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  icon: { width: 20, height: 20 },
  icon1: { width: 23, height: 23 },
  time: {
    fontSize: 12,
    marginLeft: 6,
    color: Colors.text_color,
    fontFamily: fonts.DMSansRegular,
  },
  timeContainer: {
    minWidth: 90,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
