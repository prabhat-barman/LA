import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { useRecorder } from '../../context/RecorderContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const LiveAudioProgressBar: React.FC = () => {
  const { subscribeToAudioProgress, getAudioProgress } = useRecorder();
  const [progressData, setProgressData] = useState(getAudioProgress);

  useEffect(() => {
    const unsubscribe = subscribeToAudioProgress((posMs, durMs, progress) => {
      setProgressData({ positionMs: posMs, durationMs: durMs, progress });
    });
    return unsubscribe;
  }, [subscribeToAudioProgress]);

  const { positionMs, durationMs, progress } = progressData;

  return (
    <View style={styles.playbackProgressRow}>
      <Text style={styles.progressTimeText}>{formatTime(positionMs / 1000)}</Text>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressTimeText}>{formatTime(durationMs / 1000)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  playbackProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: scale(8),
    marginBottom: scale(16),
  },
  progressTimeText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    width: scale(32),
    textAlign: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: scale(6),
    backgroundColor: '#E5E5EA',
    borderRadius: scale(3),
    marginHorizontal: scale(8),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: scale(3),
  },
});
