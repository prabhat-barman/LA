import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../../components/organisms/Header';
import { VideosSkeleton } from '../../../components/atoms/Skeleton';
import { colors } from '../../../theme/colors';
import { useDashboardData } from '../../../context/DashboardDataContext';
import { useToast } from '../../../context/ToastContext';
import { getPdfPath } from '../../../config/appVariantConfig';
import apiClient from '../../../services/apiClient';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import { hasActiveSubscriptionFromData } from '../../../utils/subscriptionMapping';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { CATEGORIES, FALLBACK_AVATAR_URI } from './constants';
import { buildVideoProfileImageUrl } from './helpers';
import { styles } from './styles';
import type { SkillCategory, VideoItem } from './types';
import { HeroCard } from './components/HeroCard';
import { CategoryPills } from './components/CategoryPills';
import { MustWatchCard } from './components/MustWatchCard';
import { VideoCard } from './components/VideoCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { useStrategyVideos } from './hooks/useStrategyVideos';

interface VideosScreenProps {
  dashboardData: unknown;
  hasNotifications: boolean;
  profileImage: string;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VideosScreen: React.FC<Partial<VideosScreenProps>> = props => {
  const contextData = useDashboardData();
  const toastContext = useToast();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dashboardData =
    props.dashboardData !== undefined
      ? props.dashboardData
      : contextData.dashboardData;
  const hasNotifications =
    props.hasNotifications !== undefined
      ? props.hasNotifications
      : contextData.hasNotifications;
  const showToast =
    props.showToast !== undefined ? props.showToast : toastContext.showToast;

  const profileImage = useMemo(() => {
    if (props.profileImage !== undefined) return props.profileImage;
    return buildVideoProfileImageUrl(
      dashboardData as { image?: string; user?: { image?: string } } | null,
      getPdfPath(),
      FALLBACK_AVATAR_URI,
    );
  }, [props.profileImage, dashboardData]);

  const onNotificationPress =
    props.onNotificationPress ||
    (() => navigation.navigate('NotificationsList'));
  const onProfilePress =
    props.onProfilePress || (() => navigation.navigate('Profile'));

  const [selectedCategory, setSelectedCategory] =
    useState<SkillCategory>('Speaking');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  // Suppress the paywall banner when the local dashboard already shows an
  // active subscription, even if the backend video endpoint still returns
  // a generic "please subscribe" message.
  const hasActiveSub = hasActiveSubscriptionFromData(dashboardData);

  // Strategy videos via TanStack Query — gives us stale-while-revalidate
  // caching, automatic retry, and pull-to-refresh state out of the box.
  const videosQuery = useStrategyVideos();
  const videos = videosQuery.data?.items ?? null;
  const subscriptionMessage = videosQuery.data?.message;
  const loading = videosQuery.isLoading;
  const refreshing = videosQuery.isFetching && !videosQuery.isLoading;
  const error: string | null = videosQuery.isError
    ? (() => {
        const e = videosQuery.error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        return (
          e?.response?.data?.message ||
          e?.message ||
          'Failed to load strategy videos'
        );
      })()
    : null;

  // Surface non-recoverable errors via the existing toast system once
  // per error transition.
  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const fetchVideos = useCallback(() => {
    videosQuery.refetch();
  }, [videosQuery]);

  const onRefresh = useCallback(() => {
    videosQuery.refetch();
  }, [videosQuery]);

  const introVideo = useMemo(
    () => (videos ?? []).find(v => v.isIntro),
    [videos],
  );
  const finalTipVideo = useMemo(
    () => (videos ?? []).find(v => v.isFinalTip),
    [videos],
  );
  const skillVideos = useMemo(
    () => (videos ?? []).filter(v => !v.isIntro && !v.isFinalTip),
    [videos],
  );

  const filteredVideos = useMemo(
    () => skillVideos.filter(v => v.category === selectedCategory),
    [skillVideos, selectedCategory],
  );

  const activeCategoryConfig = useMemo(
    () => CATEGORIES.find(c => c.name === selectedCategory),
    [selectedCategory],
  );

  const markVideoViewed = useCallback((video: VideoItem) => {
    // Fire-and-forget; do not block UI on analytics endpoint.
    apiClient
      .post(API_ENDPOINTS.MARK_N_VIDEO_WATCHED, { id: video.id })
      .catch(() => {
        // Silently ignore — viewing should not be interrupted by analytics
        // failure.
      });
  }, []);

  const startPlaying = useCallback((video: VideoItem) => {
    setActiveVideo(video);
  }, []);

  const closePlayer = useCallback(() => setActiveVideo(null), []);

  const handleHeroPlay = useCallback(() => {
    if (introVideo) {
      startPlaying(introVideo);
    } else if (skillVideos.length > 0) {
      startPlaying(skillVideos[0]);
    } else {
      showToast('No videos available yet', 'info');
    }
  }, [introVideo, skillVideos, showToast, startPlaying]);

  const handleFinalTipPlay = useCallback(() => {
    if (finalTipVideo) {
      startPlaying(finalTipVideo);
    } else {
      showToast('Final Tips not available yet', 'info');
    }
  }, [finalTipVideo, showToast, startPlaying]);

  const currentRelated = useMemo(
    () =>
      skillVideos.filter(
        v =>
          v.category ===
            (activeVideo ? activeVideo.category : selectedCategory) &&
          v.id !== activeVideo?.id,
      ),
    [skillVideos, activeVideo, selectedCategory],
  );

  const categoryColor = activeCategoryConfig?.color || '#007AFF';

  const renderHeader = useCallback(
    () => (
      <>
        {!!subscriptionMessage && !hasActiveSub && (
          <View style={styles.subscriptionBanner}>
            <Text style={styles.subscriptionBannerText}>
              {subscriptionMessage}
            </Text>
            <TouchableOpacity
              style={styles.subscriptionBannerCta}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.subscriptionBannerCtaText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        )}
        <HeroCard introVideo={introVideo} onPlay={handleHeroPlay} />
        <CategoryPills
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <MustWatchCard
          finalTipVideo={finalTipVideo}
          onPlay={handleFinalTipPlay}
        />
        <View style={{ height: 0, paddingHorizontal: 0 }} />
      </>
    ),
    [
      subscriptionMessage,
      hasActiveSub,
      introVideo,
      handleHeroPlay,
      selectedCategory,
      finalTipVideo,
      handleFinalTipPlay,
      navigation,
    ],
  );

  const renderEmpty = useCallback(() => {
    if (loading && !refreshing) {
      return (
        <View style={styles.videoListContainer}>
          <VideosSkeleton count={4} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchVideos()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>
          No {selectedCategory.toLowerCase()} videos available yet.
        </Text>
      </View>
    );
  }, [error, fetchVideos, loading, refreshing, selectedCategory]);

  const renderItem: ListRenderItem<VideoItem> = useCallback(
    ({ item }) => (
      <View style={styles.videoListContainer}>
        <VideoCard
          video={item}
          fallbackCategory={selectedCategory}
          categoryColor={categoryColor}
          onPress={startPlaying}
        />
      </View>
    ),
    [selectedCategory, categoryColor, startPlaying],
  );

  return (
    <View style={styles.container}>
      <Header
        hasNotifications={hasNotifications}
        profileImage={profileImage}
        onNotificationPress={onNotificationPress}
        onProfilePress={onProfilePress}
      />

      <FlatList
        data={filteredVideos}
        keyExtractor={item => item.syntheticKey}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        windowSize={10}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        removeClippedSubviews
      />

      <VideoPlayerModal
        activeVideo={activeVideo}
        fallbackCategory={selectedCategory}
        categoryColor={categoryColor}
        related={currentRelated}
        onClose={closePlayer}
        onSelectRelated={startPlaying}
        onPlaybackStart={markVideoViewed}
        onError={msg => showToast(msg, 'error')}
      />
    </View>
  );
};

export default VideosScreen;
