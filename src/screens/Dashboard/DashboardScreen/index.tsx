import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Header } from '../../../components/organisms/Header';
import { CircularProgressBar } from '../../../components/atoms/CircularProgressBar';
import { DashboardSkeleton } from '../../../components/atoms/Skeleton';
import { DatePickerModal } from '../../../components/molecules/DatePickerModal';
import {
  ArrowLeftLineIcon,
  ArrowUpIcon,
  BookIcon,
  ChatBubbleDotsIcon,
  ChevronRightIcon,
  ClockCircleIcon,
  InfoCircleFilledIcon,
  PlayIcon,
  ShareNodesIcon,
  SmallCalendarIcon,
  TrianglePeakIcon,
} from '../../../components/atoms/Icon';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import type {
  DashboardTabParamList,
  PracticeSection,
} from '../../../navigation/types';
import { useDashboardData } from '../../../context/DashboardDataContext';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import apiClient from '../../../services/apiClient';
import {
  AnalyticsEvents,
  trackEvent,
  trackScreen,
} from '../../../services/analytics';
import { initializeNotifications } from '../../../services/notificationService';
import {
  markPopupVideoShownToday,
  shouldShowPopupVideoToday,
} from '../../../services/popupVideoStorage';
import { SmartVideoPlayer } from '../../Videos/SmartVideoPlayer';
import { FeedbackModal } from '../FeedbackModal';

import { BreakdownGrid } from './components/BreakdownGrid';
import { CategoriesGrid } from './components/CategoriesGrid';
import { InfoModal } from './components/InfoModal';
import { TAB_TO_TYPES, VIDEO_TABS, DEFAULT_CATEGORY_TOTALS } from './constants';
import {
  buildExamDaysText,
  buildProfileImageUrl,
  formatExamDateChip,
  formatPracticeCount,
  getGreeting,
  getYoutubeVideoId,
} from './helpers';
import { FULLSCREEN_PLAYER_HEIGHT, scale, screenWidth } from './scale';
import { styles } from './styles';
import type {
  BreakdownMeta,
  BreakdownSkill,
  DashboardVideoItem,
  VideoSkillTab,
} from './types';

// Composed navigation prop: this screen sits inside the bottom tab
// navigator (DashboardTabNavigator), which itself sits inside the root
// stack. The composite type lets us call both `navigate('Practice', {...})`
// (tab) and `navigate('Profile')` (stack) without casts.
type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<DashboardTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { showToast } = useToast();
  const {
    dashboardData,
    loading,
    refreshing,
    hasNotifications,
    loadDashboardData,
  } = useDashboardData();
  const { updateExamDate } = useUser();

  const [selectedVideoTab, setSelectedVideoTab] =
    useState<VideoSkillTab>('Speaking');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [activeVideo, setActiveVideo] = useState<DashboardVideoItem | null>(
    null,
  );
  // Post-login YouTube welcome popup. Backend ships an id (or
  // sometimes a full youtube URL) at
  // `dashboardData.data.popup_video.youtube_vid`. Suppressed via a
  // per-day AsyncStorage marker so the user sees the welcome video
  // at most once per calendar day, even across cold starts.
  const [popupVideoUrl, setPopupVideoUrl] = useState<string | null>(null);
  const popupShownRef = useRef(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [examDatePickerVisible, setExamDatePickerVisible] = useState(false);
  const [examDateSaving, setExamDateSaving] = useState(false);
  // Which breakdown skill is currently "focused" inside the AI score
  // circle. 'Overall' falls back to the global predicted_score; tapping
  // a skill swaps the circle to that skill's number + brand color, and
  // tapping again resets to Overall.
  const [selectedBreakdown, setSelectedBreakdown] =
    useState<BreakdownSkill>('Overall');

  // Refetch on focus. The dashboard provider already guards against
  // duplicate in-flight requests so this is cheap when the user
  // bounces between tabs.
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  // Boot platform notifications + an `app_open` analytics ping on
  // first dashboard mount. `initializeNotifications()` is idempotent
  // so re-running on subsequent Dashboard mounts is a no-op. We do
  // it here (rather than in Splash) because the device-token sync
  // endpoint needs an authenticated session, which is guaranteed by
  // the time the user lands on Dashboard.
  useEffect(() => {
    initializeNotifications().catch(() => {});
    trackScreen('Dashboard');
    trackEvent(AnalyticsEvents.AppOpen);
  }, []);

  // App-launch welcome popup. Fires at most once per day when the
  // dashboard payload carries a non-empty `popup_video.youtube_vid`.
  // The `popupShownRef` guards against dashboard refetches (focus
  // refresh) reopening the modal in the same session; the per-day
  // AsyncStorage marker handles the same suppression across cold
  // starts.
  useEffect(() => {
    if (popupShownRef.current) return;
    const raw =
      (dashboardData?.data?.popup_video?.youtube_vid as
        | string
        | undefined) ??
      (dashboardData?.popup_video?.youtube_vid as string | undefined);
    if (!raw) return;
    (async () => {
      const ok = await shouldShowPopupVideoToday();
      if (!ok) return;
      popupShownRef.current = true;
      await markPopupVideoShownToday();
      // Backend sometimes returns an id, sometimes a full URL —
      // SmartVideoPlayer accepts either via its `videoUrl` prop
      // (it has a youtube-id extractor), so normalise to a URL.
      const url = /^https?:\/\//i.test(raw)
        ? raw
        : `https://www.youtube.com/watch?v=${raw}`;
      setPopupVideoUrl(url);
    })();
  }, [dashboardData]);

  // ---- Handlers ----------------------------------------------------------
  const handleMicTest = useCallback(() => {
    navigation.navigate('MicrophoneSetup');
  }, [navigation]);

  // Dashboard "Book Free Trial Class" CTA → opens the real form
  // (BookTrialClassScreen) instead of the old throwaway toast. The
  // form does its own success/error toast on submit.
  const handleBooking = useCallback(() => {
    navigation.navigate('BookTrialClass');
  }, [navigation]);

  // Hand-off from dashboard CTAs (Today's Practice / Mock Test / category
  // cards) to the bottom tab navigator. The composite navigation prop
  // above lets `navigate` accept both tab routes (Practice/Mock) and
  // root-stack routes (Profile, etc.) without runtime casts.
  //
  // Category cards (Speaking/Writing/Reading/Listening) deep-link into
  // the dedicated Progress Tracker stack screen instead of switching to
  // the Practice tab — the Practice tab is the "go practice now" surface
  // while the Progress Tracker is the "see how I'm doing" surface, and
  // the visual "View >" affordance + counts on the dashboard card maps
  // cleanly to the latter. "Today's Practice" still opens the Practice
  // tab.
  const handlePractice = useCallback(
    (category: string) => {
      if (category === 'Mock Test') {
        navigation.navigate('Mock');
        return;
      }

      const PRACTICE_SECTIONS: PracticeSection[] = [
        'Speaking',
        'Writing',
        'Reading',
        'Listening',
      ];
      if (PRACTICE_SECTIONS.includes(category as PracticeSection)) {
        navigation.navigate('ProgressTracker', {
          initialSkill: category as PracticeSection,
        });
        return;
      }

      // "Today's Practice" and any other fallthrough just opens the
      // Practice tab without forcing a section — the screen keeps its
      // own last-selected section or defaults to Speaking.
      navigation.navigate('Practice');
    },
    [navigation],
  );

  const openVideo = useCallback(
    (video: DashboardVideoItem) => {
      if (!video?.video) {
        showToast('Video link not available', 'error');
        return;
      }
      setActiveVideo(video);
    },
    [showToast],
  );

  const markVideoViewed = useCallback((video: DashboardVideoItem) => {
    // Fire-and-forget analytics; should not block playback
    apiClient
      .post(API_ENDPOINTS.MARK_N_VIDEO_WATCHED, { id: video.id })
      .catch(() => {
        /* silent */
      });
  }, []);

  const handleShareApp = useCallback(async () => {
    const message =
      "I'm prepping for my PTE Academic exam with the Language Academy app — it's been a huge help. Try it out: https://languageacademy.com.au/app";
    try {
      const result = await Share.share({
        message,
        title: 'Language Academy — PTE Prep',
      });
      if (result.action === Share.sharedAction) {
        showToast('Thanks for sharing!', 'success');
      }
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || 'Could not open share sheet';
      showToast(msg, 'error');
    }
  }, [showToast]);

  const handleBreakdownTap = useCallback((skill: BreakdownSkill) => {
    setSelectedBreakdown(prev => (prev === skill ? 'Overall' : skill));
  }, []);

  const handleSaveExamDate = useCallback(
    async (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      setExamDateSaving(true);
      try {
        await updateExamDate(iso);
        setExamDatePickerVisible(false);
        showToast('Exam date saved!', 'success');
        loadDashboardData(true);
      } catch (err: unknown) {
        const e = err as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          'Failed to save exam date';
        showToast(msg, 'error');
      } finally {
        setExamDateSaving(false);
      }
    },
    [updateExamDate, showToast, loadDashboardData],
  );

  // ---- Derived state -----------------------------------------------------
  const profileImage = buildProfileImageUrl(
    dashboardData?.image || dashboardData?.user?.image,
  );
  const first_name =
    dashboardData?.first_name || dashboardData?.user?.first_name || 'Olivia';
  const exam_date =
    dashboardData?.exam_date || dashboardData?.user?.exam_date;
  const examDaysText = buildExamDaysText(exam_date);
  const initialExamDate = exam_date ? new Date(exam_date) : null;

  const desired_score =
    dashboardData?.score || dashboardData?.user?.score || 72;
  const mocks_practiced =
    dashboardData?.user_attempted_questions?.total_mock_practiced || 0;
  const questions_practiced =
    dashboardData?.user_attempted_questions?.total_ques_practiced ||
    dashboardData?.practice_history?.questions ||
    0;

  const speakingCounts = formatPracticeCount(
    dashboardData?.practice_data?.speaking?.done ||
      dashboardData?.user_attempted_questions?.speaking_questions,
    dashboardData?.practice_data?.speaking?.total || dashboardData?.speak_t,
    DEFAULT_CATEGORY_TOTALS.speaking,
  );
  const writingCounts = formatPracticeCount(
    dashboardData?.practice_data?.writing?.done ||
      dashboardData?.user_attempted_questions?.writing_questions,
    dashboardData?.practice_data?.writing?.total || dashboardData?.write_t,
    DEFAULT_CATEGORY_TOTALS.writing,
  );
  const readingCounts = formatPracticeCount(
    dashboardData?.practice_data?.reading?.done ||
      dashboardData?.user_attempted_questions?.reading_questions,
    dashboardData?.practice_data?.reading?.total || dashboardData?.read_t,
    DEFAULT_CATEGORY_TOTALS.reading,
  );
  const listeningCounts = formatPracticeCount(
    dashboardData?.practice_data?.listening?.done ||
      dashboardData?.user_attempted_questions?.listening_questions,
    dashboardData?.practice_data?.listening?.total || dashboardData?.listen_t,
    DEFAULT_CATEGORY_TOTALS.listening,
  );

  const predicted_score = Number(dashboardData?.predicted_score) || 68;
  const speakingBreakdown = dashboardData?.breakdown?.speaking || 71;
  const listeningBreakdown = dashboardData?.breakdown?.listening || 64;
  const writingBreakdown = dashboardData?.breakdown?.writing || 73;
  const readingBreakdown = dashboardData?.breakdown?.reading || 68;

  const breakdownMeta: BreakdownMeta = useMemo(
    () => ({
      Overall: {
        label: 'Overall',
        score: predicted_score,
        color: '#85B82B',
        tint: '#F3FBF0',
      },
      Speaking: {
        label: 'Speaking',
        score: Number(speakingBreakdown),
        color: '#007AFF',
        tint: '#E5F1FF',
      },
      Listening: {
        label: 'Listening',
        score: Number(listeningBreakdown),
        color: '#AF52DE',
        tint: '#F6ECFB',
      },
      Writing: {
        label: 'Writing',
        score: Number(writingBreakdown),
        color: '#34C759',
        tint: '#E8F8EC',
      },
      Reading: {
        label: 'Reading',
        score: Number(readingBreakdown),
        color: '#FF9500',
        tint: '#FFF3E0',
      },
    }),
    [
      predicted_score,
      speakingBreakdown,
      listeningBreakdown,
      writingBreakdown,
      readingBreakdown,
    ],
  );
  const activeBreakdown = breakdownMeta[selectedBreakdown];

  // Backend uses singular `video` (not `videos`) and `type` is a numeric id (2..6).
  const rawVideos: DashboardVideoItem[] = dashboardData?.video ?? [];
  const allowedTypes = TAB_TO_TYPES[selectedVideoTab];
  const filteredVideos = useMemo(
    () =>
      rawVideos.filter(
        v => typeof v?.type === 'number' && allowedTypes.includes(v.type),
      ),
    [rawVideos, allowedTypes],
  );

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={['#1A2151']}
            tintColor="#1A2151"
          />
        }
      >
        {/* --- Shared Header Section --- */}
        <Header
          hasNotifications={hasNotifications}
          profileImage={profileImage}
          onNotificationPress={() => navigation.navigate('NotificationsList')}
          onProfilePress={() => navigation.navigate('Profile')}
        />

        {/* --- Welcome Card --- */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>
              {getGreeting()}, {first_name.toUpperCase()} 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>{examDaysText}</Text>
            <TouchableOpacity
              style={styles.examDateChip}
              onPress={() => setExamDatePickerVisible(true)}
              activeOpacity={0.7}
              disabled={examDateSaving}
            >
              <SmallCalendarIcon size={scale(12)} />
              <Text style={styles.examDateChipText}>
                {examDateSaving ? 'Saving…' : formatExamDateChip(exam_date)}
              </Text>
              <ChevronRightIcon size={scale(10)} color="#1A2151" />
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeActions}>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => handlePractice("Today's Practice")}
            >
              <Text style={styles.actionTextPrimary}>
                Start Today's Practice
              </Text>
              <PlayIcon size={scale(14)} color="#1A2151" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => handlePractice('Mock Test')}
            >
              <Text style={styles.actionTextSecondary}>
                {mocks_practiced > 0 ? 'Continue Mock Test' : 'Start First Mock'}
              </Text>
              <ChevronRightIcon size={scale(14)} color="#1A2151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Categories Grid --- */}
        <CategoriesGrid
          speakingCounts={speakingCounts}
          writingCounts={writingCounts}
          readingCounts={readingCounts}
          listeningCounts={listeningCounts}
          onPracticePress={handlePractice}
        />

        {/* --- Summary Stats Bar --- */}
        <View style={styles.statsBar}>
          {/* Total Mocks */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <BookIcon size={scale(18)} color="#34C759" />
              <View style={[styles.arrowBadge, styles.successBadge]}>
                <ArrowUpIcon size={scale(8)} color="#FFF" />
              </View>
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{mocks_practiced}</Text>
              <Text style={styles.statLabel}>
                Total Mocks{'\n'}Practiced
              </Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          {/* Total Questions */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <ClockCircleIcon size={scale(18)} />
              <View style={[styles.arrowBadge, styles.warningBadge]}>
                <ArrowUpIcon size={scale(8)} color="#FFF" />
              </View>
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{questions_practiced}</Text>
              <Text style={styles.statLabel}>
                Total Questions{'\n'}Practiced
              </Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          {/* Desired Score */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <TrianglePeakIcon size={scale(18)} />
              <View style={[styles.arrowBadge, styles.infoBadge]}>
                <ArrowUpIcon size={scale(8)} color="#FFF" />
              </View>
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{desired_score}</Text>
              <Text style={styles.statLabel}>Desired{'\n'}Score</Text>
            </View>
          </View>
        </View>

        {/* --- Microphone Setup Banner --- */}
        <View style={styles.micBanner}>
          <Text style={styles.micTitle}>Microphone Setup</Text>
          <TouchableOpacity style={styles.micButton} onPress={handleMicTest}>
            <Text style={styles.micButtonText}>Test Mic</Text>
            <ChevronRightIcon size={scale(12)} color="#85B82B" />
          </TouchableOpacity>
        </View>

        {/* --- Upcoming Classes Section --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('LiveSessions')}
          >
            <Text style={styles.viewAllText}>View All {'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.classCard}>
          <View style={styles.classLeft}>
            <View style={styles.classIndicator}>
              <InfoCircleFilledIcon size={scale(16)} />
            </View>
            <View style={styles.classDetails}>
              <Text style={styles.className}>
                Special Reading Class Monday
              </Text>
              <Text style={styles.classSubtitle} numberOfLines={1}>
                (7 PM Sydney time or 1:30 PM IST) only in English
              </Text>
              <View style={styles.timerBadge}>
                <View style={styles.timerDot} />
                <Text style={styles.timerText}>23:20:00</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* --- AI Predicted Score --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>AI Predicted Score</Text>
          <TouchableOpacity onPress={() => setInfoModalVisible(true)}>
            <Text style={styles.helperLink}>How is this calculated?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aiScoreCard}>
          <View style={styles.aiRow}>
            <View style={styles.chartColumn}>
              <CircularProgressBar
                progress={activeBreakdown.score}
                max={90}
                color={activeBreakdown.color}
              />
              <View
                style={[
                  styles.skillTag,
                  { backgroundColor: activeBreakdown.tint },
                ]}
              >
                <Text
                  style={[
                    styles.skillTagText,
                    { color: activeBreakdown.color },
                  ]}
                >
                  {activeBreakdown.label}
                </Text>
              </View>
            </View>

            <View style={styles.targetInfo}>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>Your Target</Text>
                <Text style={styles.targetValue}>{desired_score}</Text>
              </View>
              <View style={styles.targetAlert}>
                <Text style={styles.alertText}>
                  <Text style={styles.alertBold}>
                    {Number(desired_score) - activeBreakdown.score > 0
                      ? `${Number(desired_score) - activeBreakdown.score} points to your target`
                      : 'Target reached!'}
                    {'\n'}
                  </Text>
                  {selectedBreakdown === 'Overall'
                    ? 'Focus on Writing & Speaking for fastest gains'
                    : 'Tap any skill to focus; tap again for Overall'}
                </Text>
              </View>
            </View>
          </View>

          <BreakdownGrid
            breakdownMeta={breakdownMeta}
            selectedBreakdown={selectedBreakdown}
            onSelectBreakdown={handleBreakdownTap}
          />
        </View>

        {/* --- PTE Tutorial Videos --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>PTE Tutorial Videos</Text>
        </View>

        <View style={styles.tabsContainer}>
          {VIDEO_TABS.map(tab => {
            const isActive = selectedVideoTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setSelectedVideoTab(tab)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosContent}
          style={styles.videosContainer}
        >
          {filteredVideos.map(video => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => openVideo(video)}
            >
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{
                    uri: `https://img.youtube.com/vi/${getYoutubeVideoId(video.video)}/hqdefault.jpg`,
                  }}
                  style={styles.thumbnail}
                />
                <View style={styles.playBadge}>
                  <PlayIcon size={scale(16)} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {video.title}
              </Text>
            </TouchableOpacity>
          ))}
          {filteredVideos.length === 0 && (
            <View style={styles.emptyVideosContainer}>
              <Text style={styles.emptyVideosText}>
                No tutorial videos in this category.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* --- Help us grow: Share + Feedback --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Help us grow</Text>
        </View>

        <View style={styles.helpCard}>
          <TouchableOpacity
            style={styles.helpRow}
            onPress={handleShareApp}
            activeOpacity={0.7}
          >
            <View style={[styles.helpIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <ShareNodesIcon size={scale(20)} />
            </View>
            <View style={styles.helpTextWrap}>
              <Text style={styles.helpTitle}>Share with a friend</Text>
              <Text style={styles.helpSubtitle}>
                Help others crack PTE — share the app
              </Text>
            </View>
            <ChevronRightIcon size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.helpDivider} />

          <TouchableOpacity
            style={styles.helpRow}
            onPress={() => setFeedbackModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.helpIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <ChatBubbleDotsIcon size={scale(20)} />
            </View>
            <View style={styles.helpTextWrap}>
              <Text style={styles.helpTitle}>Send Feedback</Text>
              <Text style={styles.helpSubtitle}>
                Rate the app or tell us what to improve
              </Text>
            </View>
            <ChevronRightIcon size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <InfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
      />

      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        showToast={showToast}
      />

      <DatePickerModal
        visible={examDatePickerVisible}
        onClose={() => setExamDatePickerVisible(false)}
        onConfirm={handleSaveExamDate}
        initialDate={initialExamDate}
        minDate={new Date()}
        title={exam_date ? 'Update exam date' : 'Pick your exam date'}
      />

      {/* --- Fullscreen Video Player Modal --- */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={activeVideo !== null}
        onRequestClose={() => setActiveVideo(null)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <StatusBar hidden />
        <View style={styles.videoModalContainer}>
          {activeVideo && (
            <SmartVideoPlayer
              key={activeVideo.id}
              videoUrl={activeVideo.video}
              thumbnailUrl={`https://img.youtube.com/vi/${getYoutubeVideoId(activeVideo.video)}/hqdefault.jpg`}
              height={FULLSCREEN_PLAYER_HEIGHT}
              onPlaybackStart={() => markVideoViewed(activeVideo)}
              onError={msg => showToast(msg, 'error')}
            />
          )}
          <TouchableOpacity
            onPress={() => setActiveVideo(null)}
            style={styles.videoModalCloseFloating}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeftLineIcon size={scale(22)} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- Post-login YouTube popup (one-shot per sign-in) --- */}
      <Modal
        animationType="fade"
        transparent
        visible={popupVideoUrl !== null}
        onRequestClose={() => setPopupVideoUrl(null)}
      >
        <View style={styles.popupVideoOverlay}>
          <View style={styles.popupVideoCard}>
            <TouchableOpacity
              onPress={() => setPopupVideoUrl(null)}
              style={styles.popupVideoCloseBtn}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Text style={styles.popupVideoCloseLabel}>{'\u2715'}</Text>
            </TouchableOpacity>
            {popupVideoUrl && (
              <SmartVideoPlayer
                key={popupVideoUrl}
                videoUrl={popupVideoUrl}
                thumbnailUrl={`https://img.youtube.com/vi/${getYoutubeVideoId(popupVideoUrl)}/hqdefault.jpg`}
                height={Math.round((screenWidth - 40) * 0.56)}
                onError={msg => showToast(msg, 'error')}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DashboardScreen;
