import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  RefreshControl,
  SafeAreaView,
  Modal,
} from 'react-native';
import { ArrowLeftLineIcon, PlayIcon } from '../../components/atoms/Icon';
import { Header } from '../../components/organisms/Header';
import { colors } from '../../theme/colors';
import { useDashboardData } from '../../context/DashboardDataContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { mediaUrl } from '../../config/Config';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { VideosSkeleton } from '../../components/atoms/Skeleton';
import { hasActiveSubscriptionFromData } from '../../utils/subscriptionMapping';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// --- Strategy Videos API helpers ---

type SkillCategory = 'Speaking' | 'Writing' | 'Reading' | 'Listening';

// Backend `stgy_video_cat_id` mapping (verified from GET /get-stgy-videos response):
//   1 = Introduction (treated as intro)
//   2 = Speaking zone
//   3 = Writing zone
//   4 = Reading zone
//   5 = Listening zone
//   6 = Final Tips (treated as finalTip)
const SKILL_CATEGORY_ID: Record<number, SkillCategory> = {
  2: 'Speaking',
  3: 'Writing',
  4: 'Reading',
  5: 'Listening',
};
const INTRO_CATEGORY_ID = 1;
const FINAL_TIP_CATEGORY_ID = 6;

const PLACEHOLDER_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80';

// Strategy-video thumbnails are S3-hosted under `mediaUrl` (e.g. `/ptedata/ptemedia/foo.jpg`).
// Backend never returns absolute http URLs for these, but we still guard against it.
const resolveAssetUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = mediaUrl.endsWith('/') ? mediaUrl.slice(0, -1) : mediaUrl;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const inferCategory = (raw: any): SkillCategory | undefined => {
  // Numeric category id — covers `stgy_video_cat_id` ("2"..."5") and `category` (number)
  const catIdRaw = raw?.stgy_video_cat_id ?? raw?.category;
  const catIdNum = typeof catIdRaw === 'number' ? catIdRaw : Number(catIdRaw);
  if (Number.isFinite(catIdNum) && SKILL_CATEGORY_ID[catIdNum]) {
    return SKILL_CATEGORY_ID[catIdNum];
  }
  // String field candidates (legacy / alt shapes)
  for (const key of ['category', 'skill', 'section', 'type']) {
    const v = raw?.[key];
    if (typeof v === 'string') {
      const cap = capitalize(v);
      if (['Speaking', 'Writing', 'Reading', 'Listening'].includes(cap)) {
        return cap as SkillCategory;
      }
    }
  }
  return undefined;
};

const normalizeDuration = (raw: any): string | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return `${raw} min`;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? `${n} min` : trimmed;
  }
  return undefined;
};

interface VideoItem {
  id: number | string;
  syntheticKey: string;
  chapter?: string;
  title: string;
  description?: string;
  duration?: string;
  author?: string;
  category?: SkillCategory;
  thumbnailUrl: string;
  videoUrl?: string;
  isIntro?: boolean;
  isFinalTip?: boolean;
  raw: any;
}

const normalizeVideo = (
  raw: any,
  index: number,
  forcedCategory?: SkillCategory,
  special?: 'intro' | 'finalTip',
): VideoItem => {
  const id =
    raw?.id ?? raw?.video_id ?? raw?._id ?? `${special ?? 'vid'}-${index}`;
  const category = forcedCategory ?? inferCategory(raw);
  const thumbnailUrl =
    resolveAssetUrl(
      raw?.image ?? raw?.thumbnail ?? raw?.thumb ?? raw?.preview_image,
    ) ?? PLACEHOLDER_THUMB;
  // Verified shape from `get-stgy-videos`: each item carries the URL in `video`
  // (matching DashboardScreen's `video.video`). Other field names kept as fallbacks.
  const videoUrl =
    raw?.video ??
    raw?.video_url ??
    raw?.url ??
    raw?.video_link ??
    raw?.youtube_url ??
    raw?.link ??
    raw?.src;
  if (__DEV__ && !videoUrl) {
    // One-line diagnostic so we can spot the real field name if backend evolves
    // eslint-disable-next-line no-console
    console.warn(
      '[VideosScreen] No video URL on item — keys:',
      Object.keys(raw ?? {}),
    );
  }
  const chapterNum = raw?.chapter ?? raw?.serial ?? raw?.order;
  const chapter =
    chapterNum !== undefined && chapterNum !== null
      ? typeof chapterNum === 'string'
        ? chapterNum
        : `CH.${chapterNum}`
      : undefined;

  return {
    id,
    syntheticKey: special
      ? `${special}-${id}`
      : `${category ?? 'x'}-${id}-${index}`,
    chapter,
    title: raw?.title ?? raw?.name ?? raw?.video_title ?? 'Untitled',
    description: raw?.description ?? raw?.sub_title ?? raw?.subtitle,
    duration: normalizeDuration(raw?.duration ?? raw?.time ?? raw?.video_duration),
    author: raw?.author ?? raw?.instructor ?? raw?.by ?? raw?.teacher,
    category,
    thumbnailUrl,
    videoUrl,
    isIntro: special === 'intro',
    isFinalTip: special === 'finalTip',
    raw,
  };
};

interface ParsedVideosResponse {
  items: VideoItem[];
  message?: string;
}

// Only surface a backend message as a paywall banner when it actually mentions
// subscribing / upgrading. Generic success strings ("Videos fetched", etc.)
// should not be rendered as a paywall.
const PAYWALL_KEYWORDS = ['subscribe', 'subscription', 'upgrade', 'premium', 'plan'];
const isPaywallMessage = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return PAYWALL_KEYWORDS.some(k => lower.includes(k));
};

const parseVideosResponse = (data: any): ParsedVideosResponse => {
  const rawMessage = typeof data?.message === 'string' ? data.message : undefined;
  const message = rawMessage && isPaywallMessage(rawMessage) ? rawMessage : undefined;

  // Primary verified shape:
  //   { message?: string, video: [ { id, title, stgy_vid: [ {...video} ] }, ... ] }
  const videoCategories = data?.video ?? data?.videos;
  if (Array.isArray(videoCategories)) {
    const items: VideoItem[] = [];
    videoCategories.forEach((cat) => {
      const catId = Number(cat?.id);
      const skill = SKILL_CATEGORY_ID[catId];
      const special: 'intro' | 'finalTip' | undefined =
        catId === INTRO_CATEGORY_ID
          ? 'intro'
          : catId === FINAL_TIP_CATEGORY_ID
          ? 'finalTip'
          : undefined;
      const list: any[] = cat?.stgy_vid ?? cat?.videos ?? [];
      if (Array.isArray(list)) {
        list.forEach((v, idx) =>
          items.push(normalizeVideo(v, idx, skill, special)),
        );
      }
    });
    return { items, message };
  }

  // Legacy / alternative shapes the doc described
  const root = data?.result ?? data?.data ?? data;
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const items: VideoItem[] = [];
    const skillKeys: Array<[string, SkillCategory]> = [
      ['speaking', 'Speaking'],
      ['writing', 'Writing'],
      ['reading', 'Reading'],
      ['listening', 'Listening'],
    ];
    skillKeys.forEach(([key, cat]) => {
      const arr = root[key];
      if (Array.isArray(arr)) {
        arr.forEach((v, idx) => items.push(normalizeVideo(v, idx, cat)));
      }
    });
    const specials: Array<[string, 'intro' | 'finalTip']> = [
      ['intro', 'intro'],
      ['introduction', 'intro'],
      ['finalTip', 'finalTip'],
      ['final_tip', 'finalTip'],
      ['finalTips', 'finalTip'],
      ['final_tips', 'finalTip'],
    ];
    specials.forEach(([key, kind]) => {
      const v = root[key];
      if (!v) return;
      const arr = Array.isArray(v) ? v : [v];
      arr.forEach((item, idx) =>
        items.push(normalizeVideo(item, idx, undefined, kind)),
      );
    });
    return { items, message };
  }

  if (Array.isArray(root)) {
    return { items: root.map((v, idx) => normalizeVideo(v, idx)), message };
  }

  return { items: [], message };
};

interface VideosScreenProps {
  dashboardData: any;
  hasNotifications: boolean;
  profileImage: string;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VideosScreen: React.FC<Partial<VideosScreenProps>> = (props) => {
  const contextData = useDashboardData();
  const toastContext = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dashboardData = props.dashboardData !== undefined ? props.dashboardData : contextData.dashboardData;
  const hasNotifications = props.hasNotifications !== undefined ? props.hasNotifications : contextData.hasNotifications;
  const showToast = props.showToast !== undefined ? props.showToast : toastContext.showToast;
  
  const getProfileImage = () => {
    if (props.profileImage !== undefined) return props.profileImage;
    const photoPath = dashboardData?.image || dashboardData?.user?.image;
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    }
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    const baseUrl = getPdfPath();
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `${baseUrl}${separator}${cleanPath}`;
  };
  const profileImage = getProfileImage();

  const onNotificationPress = props.onNotificationPress || (() => navigation.navigate('NotificationsList'));
  const onProfilePress = props.onProfilePress || (() => navigation.navigate('Profile'));

  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('Speaking');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const categories = [
    { name: 'Speaking' as const, color: '#007AFF' },
    { name: 'Writing' as const, color: '#34C759' },
    { name: 'Reading' as const, color: '#FF9500' },
    { name: 'Listening' as const, color: '#AF52DE' },
  ];

  // --- Fetched strategy videos state ---
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppress the paywall banner when the local dashboard already shows an
  // active subscription, even if the backend video endpoint still returns
  // a generic "please subscribe" message.
  const hasActiveSub = hasActiveSubscriptionFromData(dashboardData);

  const fetchVideos = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await apiClient.get(API_ENDPOINTS.PTE_VIDEOS);
        const { items, message } = parseVideosResponse(response.data);
        setVideos(items);
        setSubscriptionMessage(message);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load strategy videos';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (videos === null) {
      fetchVideos();
    }
  }, [videos, fetchVideos]);

  const onRefresh = useCallback(() => fetchVideos(true), [fetchVideos]);

  const introVideo = useMemo(
    () => (videos ?? []).find((v) => v.isIntro),
    [videos],
  );
  const finalTipVideo = useMemo(
    () => (videos ?? []).find((v) => v.isFinalTip),
    [videos],
  );
  const skillVideos = useMemo(
    () => (videos ?? []).filter((v) => !v.isIntro && !v.isFinalTip),
    [videos],
  );

  const filteredVideos = useMemo(
    () => skillVideos.filter((v) => v.category === selectedCategory),
    [skillVideos, selectedCategory],
  );

  const activeCategoryConfig = categories.find((c) => c.name === selectedCategory);

  const markVideoViewed = useCallback((video: VideoItem) => {
    // Fire-and-forget; do not block UI on analytics endpoint
    apiClient
      .post(API_ENDPOINTS.MARK_N_VIDEO_WATCHED, { id: video.id })
      .catch(() => {
        // Silently ignore — viewing should not be interrupted by analytics failure
      });
  }, []);

  const startPlaying = useCallback((video: VideoItem) => {
    setActiveVideo(video);
  }, []);

  const currentRelated = useMemo(
    () =>
      skillVideos.filter(
        (v) =>
          v.category === (activeVideo ? activeVideo.category : selectedCategory) &&
          v.id !== activeVideo?.id,
      ),
    [skillVideos, activeVideo, selectedCategory],
  );

  return (
    <View style={styles.container}>
      {/* --- Course Catalog Hub Mode --- */}
      <Header
        hasNotifications={hasNotifications}
        profileImage={profileImage}
        onNotificationPress={onNotificationPress}
        onProfilePress={onProfilePress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Paywall / informational message from backend, e.g. "Please subscribe..." */}
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

        {/* Hero Course Banner — backed by `intro` from API, falls back to static copy */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroBadgesRow}>
              <View style={[styles.badgeContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <Text style={styles.badgeText}>Introduction</Text>
              </View>
              <View style={[styles.badgeContainer, { backgroundColor: '#94C23C' }]}>
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
          <TouchableOpacity
            style={styles.heroPlayButton}
            onPress={() => {
              if (introVideo) {
                startPlaying(introVideo);
              } else if (skillVideos.length > 0) {
                startPlaying(skillVideos[0]);
              } else {
                showToast('No videos available yet', 'info');
              }
            }}
          >
            <PlayIcon size={scale(18)} />
          </TouchableOpacity>
        </View>

        {/* Category horizontal Filter Pills */}
        <View style={styles.categoryContainer}>
          {categories.map((category) => {
            const isActive = selectedCategory === category.name;
            return (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.categoryPill,
                  isActive
                    ? { borderColor: colors.primary, backgroundColor: colors.white, borderWidth: 1 }
                    : { borderColor: 'transparent', backgroundColor: '#E5E5EA' },
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive ? { color: colors.primary, fontWeight: '700' } : { color: colors.gray },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Must Watch Banner — backed by `finalTip` from API, falls back to static copy */}
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
            <TouchableOpacity
              style={styles.mustWatchPlayBtn}
              onPress={() => {
                if (finalTipVideo) {
                  startPlaying(finalTipVideo);
                } else {
                  showToast('Final Tips not available yet', 'info');
                }
              }}
            >
              <PlayIcon size={scale(10)} color="#FFFFFF" />
              <Text style={styles.mustWatchPlayBtnText}>Watch Now</Text>
            </TouchableOpacity>
            <Text style={styles.mustWatchTipTime}>
              {finalTipVideo?.duration ?? '5 min'} - Quick Tips
            </Text>
          </View>
        </View>

        {/* Cards List */}
        <View style={styles.videoListContainer}>
          {loading && !refreshing ? (
            <VideosSkeleton count={4} />
          ) : error ? (
            <View style={styles.stateContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchVideos()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredVideos.length === 0 ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>
                No {selectedCategory.toLowerCase()} videos available yet.
              </Text>
            </View>
          ) : (
            filteredVideos.map((video) => (
              <TouchableOpacity
                key={video.syntheticKey}
                style={styles.videoCard}
                onPress={() => startPlaying(video)}
              >
                <View style={styles.thumbnailContainer}>
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
                  <View style={styles.playBadge}>
                    <PlayIcon size={scale(14)} />
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: activeCategoryConfig?.color || '#007AFF' },
                    ]}
                  >
                    {(video.category ?? selectedCategory).toUpperCase()}
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
            ))
          )}
        </View>

      </ScrollView>

      {/* --- Fullscreen Video Player Modal --- */}
      <Modal
        visible={activeVideo !== null}
        animationType="slide"
        onRequestClose={() => setActiveVideo(null)}
      >
        {activeVideo && (
          <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FC' }]}>
            {/* Header Row */}
            <View style={styles.playerHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveVideo(null)}>
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
              {/* Player Frame — picks YouTube iframe / native Video / external link automatically */}
              <SmartVideoPlayer
                key={activeVideo.syntheticKey}
                videoUrl={activeVideo.videoUrl}
                thumbnailUrl={activeVideo.thumbnailUrl}
                height={scale(210)}
                onPlaybackStart={() => markVideoViewed(activeVideo)}
                onError={(msg) => showToast(msg, 'error')}
              />

              {/* Title / Category Metadata */}
              <View style={styles.playerMeta}>
                <Text style={styles.playerMetaTitle} numberOfLines={2}>
                  {activeVideo.title}
                  {activeVideo.category && (
                    <Text style={styles.playerMetaCategory}>
                      {' '}• {activeVideo.category.toUpperCase()}
                    </Text>
                  )}
                </Text>
                {activeVideo.duration && (
                  <Text style={styles.playerMetaDuration}>
                    {activeVideo.duration}
                  </Text>
                )}
              </View>

              {/* Related Videos Header */}
              <Text style={styles.relatedHeader}>Related Videos</Text>

              {/* Related list */}
              <View style={styles.relatedList}>
                {currentRelated.map((video) => (
                  <TouchableOpacity
                    key={video.syntheticKey}
                    style={styles.relatedCard}
                    onPress={() => startPlaying(video)}
                  >
                    <View style={styles.relatedThumbnailContainer}>
                      <Image source={{ uri: video.thumbnailUrl }} style={styles.relatedThumbnail} />
                      <View style={styles.playBadgeSmall}>
                        <PlayIcon size={scale(10)} />
                      </View>
                    </View>
                    <View style={styles.relatedInfo}>
                      <Text
                        style={[
                          styles.relatedCategoryLabel,
                          { color: activeCategoryConfig?.color || '#007AFF' },
                        ]}
                      >
                        {(video.category ?? selectedCategory).toUpperCase()}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(20),
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    height: scale(54),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
    backgroundColor: colors.white,
  },
  backButton: {
    padding: scale(6),
  },
  playerHeaderTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  playerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: scale(14),
    marginBottom: scale(8),
  },
  playerMetaTitle: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  playerMetaCategory: {
    color: colors.gray,
    fontWeight: 'normal',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  playerMetaDuration: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  relatedHeader: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1C1F2A',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  relatedList: {
    paddingHorizontal: scale(16),
  },
  relatedCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: scale(12),
    padding: scale(10),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  relatedThumbnailContainer: {
    width: scale(90),
    height: scale(60),
    borderRadius: scale(8),
    overflow: 'hidden',
    position: 'relative',
  },
  relatedThumbnail: {
    width: '100%',
    height: '100%',
  },
  playBadgeSmall: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: scale(10),
    padding: scale(4),
  },
  relatedInfo: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  relatedCategoryLabel: {
    fontSize: scale(10),
    fontWeight: 'bold',
    marginBottom: scale(2),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  relatedTitle: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(4),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  relatedMetaText: {
    fontSize: scale(10),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  heroCard: {
    backgroundColor: '#0D112B',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(20),
    padding: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  heroBadgesRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(10),
  },
  badgeContainer: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  badgeText: {
    color: colors.white,
    fontSize: scale(9),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  heroTitle: {
    color: colors.white,
    fontSize: scale(17),
    fontWeight: 'bold',
    marginBottom: scale(6),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  heroPlayButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(20),
    gap: scale(6),
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(2),
    borderRadius: scale(20),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(4),
  },
  categoryPillText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  mustWatchCard: {
    backgroundColor: '#F4FBD6',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginBottom: scale(20),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#94C23C',
    borderStyle: 'dashed',
  },
  mustWatchLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  mustWatchBadge: {
    backgroundColor: '#1C1F2A',
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    alignSelf: 'flex-start',
    marginBottom: scale(8),
  },
  mustWatchBadgeText: {
    color: colors.white,
    fontSize: scale(9),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  mustWatchTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#94C23C',
    marginBottom: scale(4),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  mustWatchSubtitle: {
    fontSize: scale(11),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  mustWatchRight: {
    alignItems: 'center',
  },
  mustWatchPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1F2A',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    marginBottom: scale(6),
  },
  mustWatchPlayBtnText: {
    color: colors.white,
    fontSize: scale(10),
    fontWeight: 'bold',
    marginLeft: scale(4),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  mustWatchTipTime: {
    fontSize: scale(9),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  videoListContainer: {
    paddingHorizontal: scale(16),
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  thumbnailContainer: {
    width: scale(110),
    height: scale(72),
    borderRadius: scale(10),
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: scale(-18),
    marginTop: scale(-18),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: scale(10),
    fontWeight: 'bold',
    marginBottom: scale(2),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  videoTitle: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(4),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  metaText: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(48),
    paddingHorizontal: scale(24),
  },
  stateText: {
    marginTop: scale(12),
    fontSize: scale(13),
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  errorText: {
    fontSize: scale(13),
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: scale(16),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  retryButton: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(24),
    borderRadius: scale(20),
    backgroundColor: '#1C1F2A',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: scale(13),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: '#FEF3C7',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  subscriptionBannerText: {
    flex: 1,
    fontSize: scale(11),
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Regular',
    marginRight: scale(10),
  },
  subscriptionBannerCta: {
    backgroundColor: '#1C1F2A',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(10),
  },
  subscriptionBannerCtaText: {
    color: colors.white,
    fontSize: scale(11),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
});
