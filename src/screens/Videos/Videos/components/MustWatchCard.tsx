import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PlayIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';
import type { VideoItem } from '../types';

interface MustWatchCardProps {
  finalTipVideo: VideoItem | undefined;
  onPlay: () => void;
}

const MustWatchCardComponent: React.FC<MustWatchCardProps> = ({
  finalTipVideo,
  onPlay,
}) => (
  <View style={styles.mustWatchCard}>
    <View style={styles.mustWatchLeft}>
      <View style={styles.mustWatchBadge}>
        <Text style={styles.mustWatchBadgeText}>Must Watch</Text>
      </View>
      <Text style={styles.mustWatchTitle} numberOfLines={2}>
        {finalTipVideo?.title ?? 'Final Tips For Exam'}
      </Text>
      <Text style={styles.mustWatchSubtitle} numberOfLines={2}>
        {finalTipVideo?.description ??
          'Last-minute strategies to boost your score.'}
      </Text>
    </View>
    <View style={styles.mustWatchRight}>
      <TouchableOpacity style={styles.mustWatchPlayBtn} onPress={onPlay}>
        <PlayIcon size={scale(10)} color="#FFFFFF" />
        <Text style={styles.mustWatchPlayBtnText}>Watch Now</Text>
      </TouchableOpacity>
      <Text style={styles.mustWatchTipTime}>
        {finalTipVideo?.duration ?? '5 min'} - Quick Tips
      </Text>
    </View>
  </View>
);

export const MustWatchCard = memo(MustWatchCardComponent);
