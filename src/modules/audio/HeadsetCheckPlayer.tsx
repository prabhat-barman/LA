/**
 * HeadsetCheckPlayer — Shared Headset Check Audio Player (Nitro-Powered)
 *
 * Uses react-native-nitro-sound directly for playback without react-native-video.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Sound from 'react-native-nitro-sound';
import { images } from '../../assets/imageUrl';
import { fonts } from '../../assets/font_color_&_family/font_color_and_family';
import { logger } from '../../services/logger';

export interface HeadsetCheckPlayerProps {
  id?: string;
  audioUrl: string;
  onPlayTimeChange?: (position: number, duration: number) => void;
  onPlayingStateChange?: (isPlaying: boolean) => void;
  disabled?: boolean;
  isDarkMode?: boolean;
}

export default function HeadsetCheckPlayer({
  id,
  audioUrl,
  onPlayTimeChange,
  onPlayingStateChange,
  disabled = false,
  isDarkMode = false,
}: HeadsetCheckPlayerProps) {
  const isMounted = useRef(true);
  const hasEndedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(Boolean(audioUrl));
    
    // Cleanup playback listeners on unmount
    return () => {
      isMounted.current = false;
      setIsPlaying(false);
      Sound.stopPlayer().catch(() => {});
      try {
        Sound.removePlayBackListener();
        Sound.removePlaybackEndListener();
      } catch (_) {}
    };
  }, [audioUrl]);

  const progress =
    hasEndedRef.current
      ? 1
      : duration > 0
        ? Math.max(0, Math.min(1, position / duration))
        : 0;

  // ─── Playback Listeners ───────────────────────────────────────────────────

  const startPlaybackListeners = useCallback(() => {
    try {
      Sound.addPlayBackListener((e) => {
        if (!isMounted.current) return;
        const durSec = (e.duration || 0) / 1000;
        const posSec = (e.currentPosition || 0) / 1000;
        
        setPosition(posSec);
        if (durSec > 0) setDuration(durSec);
        setIsLoading(false);
        
        if (onPlayTimeChange) onPlayTimeChange(posSec, durSec);
      });

      Sound.addPlaybackEndListener((e) => {
        if (!isMounted.current) return;
        hasEndedRef.current = true;
        setPosition(0);
        setIsPlaying(false);
        if (onPlayingStateChange) onPlayingStateChange(false);
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
      });
    } catch (err) {
      logger.warn("HeadsetCheckPlayer listener setup failed:", err);
    }
  }, [onPlayTimeChange, onPlayingStateChange]);

  // ─── Toggle ───────────────────────────────────────────────────────────────

  const toggle = async () => {
    if (disabled || isLoading || !audioUrl) return;

    if (isPlaying) {
      setIsPlaying(false);
      setIsLoading(false);
      if (onPlayingStateChange) onPlayingStateChange(false);
      await Sound.stopPlayer().catch(() => {});
      try {
        Sound.removePlayBackListener();
        Sound.removePlaybackEndListener();
      } catch (_) {}
    } else {
      setIsLoading(true);
      hasEndedRef.current = false;
      setPosition(0);
      
      try {
        startPlaybackListeners();
        await Sound.startPlayer(audioUrl);
        if (isMounted.current) {
          setIsPlaying(true);
          if (onPlayingStateChange) onPlayingStateChange(true);
        }
      } catch (err) {
        logger.warn("HeadsetCheckPlayer start playback failed:", err);
        if (isMounted.current) {
          setIsLoading(false);
          setIsPlaying(false);
          if (onPlayingStateChange) onPlayingStateChange(false);
        }
      }
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0) setLayoutReady(true);
      }}
    >
      {/* Audio Row */}
      <View style={styles.audioRow}>
        <TouchableOpacity
          onPress={toggle}
          style={styles.playButton}
          disabled={disabled || isLoading || !audioUrl}
          activeOpacity={0.8}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          {layoutReady &&
            (isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image
                source={isPlaying ? images.pause_icon_new : images.play_icon_new}
                style={styles.playIcon}
                tintColor="white"
              />
            ))}
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          {layoutReady && (
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          )}
        </View>
      </View>

      <Text style={styles.helperText}>Click the play button to start</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#56C1E5',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    minHeight: 120,
    alignItems: 'center',
    marginVertical: 10,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playButton: {
    marginRight: 15,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 32,
    height: 32,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
    fontFamily: fonts.DMSansRegular,
    alignSelf: 'flex-start',
    marginLeft: 47,
  },
});
