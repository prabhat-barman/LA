import React, { memo, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { PlayIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';
import type { SkillCategory, VideoItem } from '../types';

interface VideoCardProps {
  video: VideoItem;
  fallbackCategory: SkillCategory;
  categoryColor: string;
  onPress: (video: VideoItem) => void;
}

const VideoCardComponent: React.FC<VideoCardProps> = ({
  video,
  fallbackCategory,
  categoryColor,
  onPress,
}) => {
  const handlePress = useCallback(() => onPress(video), [onPress, video]);
  return (
    <TouchableOpacity style={styles.videoCard} onPress={handlePress}>
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={styles.thumbnail}
        />
        <View style={styles.playBadge}>
          <PlayIcon size={scale(14)} />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.categoryLabel, { color: categoryColor }]}>
          {(video.category ?? fallbackCategory).toUpperCase()}
          {video.chapter ? ` • ${video.chapter}` : ''}
        </Text>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {video.title}
        </Text>
        {(video.duration || video.author) && (
          <Text style={styles.metaText}>
            {video.duration ?? ''}
            {video.duration && video.author ? ' • ' : ''}
            {video.author ? `By ${video.author}` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const VideoCard = memo(VideoCardComponent);
