import React, { memo } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {
  ArrowLeftLineIcon,
  PlayIcon,
} from '../../../../components/atoms/Icon';
import { SmartVideoPlayer } from '../../SmartVideoPlayer';
import { scale } from '../scale';
import { styles } from '../styles';
import type { SkillCategory, VideoItem } from '../types';

interface VideoPlayerModalProps {
  activeVideo: VideoItem | null;
  fallbackCategory: SkillCategory;
  categoryColor: string;
  related: VideoItem[];
  onClose: () => void;
  onSelectRelated: (video: VideoItem) => void;
  onPlaybackStart: (video: VideoItem) => void;
  onError: (msg: string) => void;
}

const VideoPlayerModalComponent: React.FC<VideoPlayerModalProps> = ({
  activeVideo,
  fallbackCategory,
  categoryColor,
  related,
  onClose,
  onSelectRelated,
  onPlaybackStart,
  onError,
}) => {
  return (
    <Modal
      visible={activeVideo !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      {activeVideo && (
        <SafeAreaView
          style={[styles.container, { backgroundColor: '#F8F9FC' }]}
        >
          <View style={styles.playerHeader}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeftLineIcon size={scale(20)} color="#1C1F2A" />
            </TouchableOpacity>
            <Text style={styles.playerHeaderTitle}>PTE Video Course</Text>
            <View style={{ width: scale(28) }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SmartVideoPlayer
              key={activeVideo.syntheticKey}
              videoUrl={activeVideo.videoUrl}
              thumbnailUrl={activeVideo.thumbnailUrl}
              height={scale(210)}
              onPlaybackStart={() => onPlaybackStart(activeVideo)}
              onError={onError}
            />

            <View style={styles.playerMeta}>
              <Text style={styles.playerMetaTitle} numberOfLines={2}>
                {activeVideo.title}
                {activeVideo.category && (
                  <Text style={styles.playerMetaCategory}>
                    {' '}
                    • {activeVideo.category.toUpperCase()}
                  </Text>
                )}
              </Text>
              {activeVideo.duration && (
                <Text style={styles.playerMetaDuration}>
                  {activeVideo.duration}
                </Text>
              )}
            </View>

            <Text style={styles.relatedHeader}>Related Videos</Text>

            <View style={styles.relatedList}>
              {related.map(video => (
                <TouchableOpacity
                  key={video.syntheticKey}
                  style={styles.relatedCard}
                  onPress={() => onSelectRelated(video)}
                >
                  <View style={styles.relatedThumbnailContainer}>
                    <Image
                      source={{ uri: video.thumbnailUrl }}
                      style={styles.relatedThumbnail}
                    />
                    <View style={styles.playBadgeSmall}>
                      <PlayIcon size={scale(10)} />
                    </View>
                  </View>
                  <View style={styles.relatedInfo}>
                    <Text
                      style={[
                        styles.relatedCategoryLabel,
                        { color: categoryColor },
                      ]}
                    >
                      {(video.category ?? fallbackCategory).toUpperCase()}
                      {video.chapter ? ` • ${video.chapter}` : ''}
                    </Text>
                    <Text style={styles.relatedTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                    {(video.duration || video.author) && (
                      <Text style={styles.relatedMetaText}>
                        {video.duration ?? ''}
                        {video.duration && video.author ? ' • ' : ''}
                        {video.author ? `By ${video.author}` : ''}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
};

export const VideoPlayerModal = memo(VideoPlayerModalComponent);
