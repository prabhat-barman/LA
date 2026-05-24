import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PlayIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';
import type { VideoItem } from '../types';

interface HeroCardProps {
  introVideo: VideoItem | undefined;
  onPlay: () => void;
}

const HeroCardComponent: React.FC<HeroCardProps> = ({
  introVideo,
  onPlay,
}) => (
  <View style={styles.heroCard}>
    <View style={styles.heroLeft}>
      <View style={styles.heroBadgesRow}>
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
          ]}
        >
          <Text style={styles.badgeText}>Introduction</Text>
        </View>
        <View
          style={[styles.badgeContainer, { backgroundColor: '#94C23C' }]}
        >
          <Text style={[styles.badgeText, { color: '#0D112B' }]}>
            By: {introVideo?.author ?? 'varun Dhawan'}
          </Text>
        </View>
      </View>
      <Text style={styles.heroTitle} numberOfLines={2}>
        {introVideo?.title ?? 'PTE Academic Full Video Course'}
      </Text>
      <Text style={styles.heroSub} numberOfLines={2}>
        {introVideo?.description ??
          '50,000+ Successful students · All skill types'}
      </Text>
    </View>
    <TouchableOpacity style={styles.heroPlayButton} onPress={onPlay}>
      <PlayIcon size={scale(18)} />
    </TouchableOpacity>
  </View>
);

export const HeroCard = memo(HeroCardComponent);
