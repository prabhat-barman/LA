import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  RefreshControl,
  Modal,
  Share,
  StatusBar,
} from 'react-native';
import { Header } from '../../components/organisms/Header';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToast } from '../../context/ToastContext';
import { useDashboardData } from '../../context/DashboardDataContext';
import { useUser } from '../../context/UserContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { DatePickerModal } from '../../components/molecules/DatePickerModal';
import {
  MicIcon,
  PenIcon,
  BookIcon,
  HeadphonesIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  PlayIcon,
  SmallCalendarIcon,
  ClockCircleIcon,
  TrianglePeakIcon,
  InfoCircleFilledIcon,
  ShareNodesIcon,
  ChatBubbleDotsIcon,
  CloseIcon,
  InfoOutlineIcon,
  ArrowLeftLineIcon,
} from '../../components/atoms/Icon';
import { CircularProgressBar } from '../../components/atoms/CircularProgressBar';
import { SmartVideoPlayer } from '../Videos/SmartVideoPlayer';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { DashboardSkeleton } from '../../components/atoms/Skeleton';
import { FeedbackModal } from './FeedbackModal';

// Backend `type` mapping for tutorial videos in `data.video[]` (verified):
//   2 = Speaking, 3 = Writing, 4 = Reading, 5 = Listening, 6 = Final Tips (Others)
type VideoSkillTab = 'Speaking' | 'Writing' | 'Reading' | 'Listening' | 'Others';
const TAB_TO_TYPES: Record<VideoSkillTab, number[]> = {
  Speaking: [2],
  Writing: [3],
  Reading: [4],
  Listening: [5],
  Others: [6],
};

interface DashboardVideoItem {
  id: number;
  title: string;
  video: string;
  description?: string;
  type?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;
// Cinema-mode player height — keeps the standard 16:9 YouTube aspect
const FULLSCREEN_PLAYER_HEIGHT = (screenWidth * 9) / 16;

export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const {
    dashboardData,
    loading,
    refreshing,
    hasNotifications,
    loadDashboardData,
  } = useDashboardData();
  const { updateExamDate } = useUser();

  const [selectedVideoTab, setSelectedVideoTab] = useState<VideoSkillTab>('Speaking');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [activeVideo, setActiveVideo] = useState<DashboardVideoItem | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [examDatePickerVisible, setExamDatePickerVisible] = useState(false);
  const [examDateSaving, setExamDateSaving] = useState(false);
  // Which breakdown skill is currently "focused" inside the AI score circle.
  // 'Overall' falls back to the global predicted_score; tapping a skill swaps
  // the circle to that skill's number + brand color, tapping again resets.
  type BreakdownSkill = 'Overall' | 'Speaking' | 'Listening' | 'Writing' | 'Reading';
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownSkill>('Overall');

  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleMicTest = () => {
    navigation.navigate('MicrophoneSetup');
  };

  const handleBooking = () => {
    showToast('Class booked successfully!', 'success');
  };

  const handlePractice = (category: string) => {
    showToast(`Navigating to ${category} section...`, 'success');
  };

  const openVideo = useCallback((video: DashboardVideoItem) => {
    if (!video?.video) {
      showToast('Video link not available', 'error');
      return;
    }
    setActiveVideo(video);
  }, [showToast]);

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
    } catch (err: any) {
      showToast(err?.message || 'Could not open share sheet', 'error');
    }
  }, [showToast]);

  // Extract youtube video ID from URLs
  const getYoutubeVideoId = (url: string) => {
    if (!url) return '';
    const embedMatch = url.match(/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
    const watchMatch = url.match(/v=([^&]+)/);
    if (watchMatch) return watchMatch[1];
    return '';
  };

  // Profile Image URL formatting
  const getProfileImage = () => {
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

  // Extract statistics and handle API mapping
  const first_name = dashboardData?.first_name || dashboardData?.user?.first_name || 'Olivia';
  const exam_date = dashboardData?.exam_date || dashboardData?.user?.exam_date;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'GOOD MORNING';
    } else if (hour >= 12 && hour < 17) {
      return 'GOOD AFTERNOON';
    } else {
      return 'GOOD EVENING';
    }
  };
  
  let examDaysText = 'Set your exam date to start the countdown.';
  if (exam_date) {
    const examDateObj = new Date(exam_date);
    const today = new Date();
    const diffTime = examDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      examDaysText = `${diffDays} days until your exam.`;
    } else if (diffDays === 0) {
      examDaysText = 'Exam is today! Good luck!';
    } else {
      examDaysText = 'Exam completed.';
    }
  }

  const initialExamDate = exam_date ? new Date(exam_date) : null;

  const handleSaveExamDate = useCallback(async (date: Date) => {
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save exam date';
      showToast(msg, 'error');
    } finally {
      setExamDateSaving(false);
    }
  }, [updateExamDate, showToast, loadDashboardData]);

  const desired_score = dashboardData?.score || dashboardData?.user?.score || 72;
  const mocks_practiced = dashboardData?.user_attempted_questions?.total_mock_practiced || 0;
  const questions_practiced = dashboardData?.user_attempted_questions?.total_ques_practiced || dashboardData?.practice_history?.questions || 0;

  const formatCount = (done: number | string | undefined, total: number | string | undefined, defaultTotal: string) => {
    const doneStr = done !== undefined ? Number(done).toLocaleString() : '0';
    const totalStr = total !== undefined ? Number(total).toLocaleString() : defaultTotal;
    return { done: doneStr, total: totalStr };
  };

  const speakingCounts = formatCount(
    dashboardData?.practice_data?.speaking?.done || dashboardData?.user_attempted_questions?.speaking_questions,
    dashboardData?.practice_data?.speaking?.total || dashboardData?.speak_t,
    '8,637'
  );
  
  const writingCounts = formatCount(
    dashboardData?.practice_data?.writing?.done || dashboardData?.user_attempted_questions?.writing_questions,
    dashboardData?.practice_data?.writing?.total || dashboardData?.write_t,
    '2,642'
  );
  
  const readingCounts = formatCount(
    dashboardData?.practice_data?.reading?.done || dashboardData?.user_attempted_questions?.reading_questions,
    dashboardData?.practice_data?.reading?.total || dashboardData?.read_t,
    '4,151'
  );
  
  const listeningCounts = formatCount(
    dashboardData?.practice_data?.listening?.done || dashboardData?.user_attempted_questions?.listening_questions,
    dashboardData?.practice_data?.listening?.total || dashboardData?.listen_t,
    '6,819'
  );

  const predicted_score = Number(dashboardData?.predicted_score) || 68;
  const speakingBreakdown = dashboardData?.breakdown?.speaking || 71;
  const listeningBreakdown = dashboardData?.breakdown?.listening || 64;
  const writingBreakdown = dashboardData?.breakdown?.writing || 73;
  const readingBreakdown = dashboardData?.breakdown?.reading || 68;

  const breakdownMeta: Record<BreakdownSkill, { label: string; score: number; color: string; tint: string }> = {
    Overall: { label: 'Overall', score: predicted_score, color: '#85B82B', tint: '#F3FBF0' },
    Speaking: { label: 'Speaking', score: Number(speakingBreakdown), color: '#007AFF', tint: '#E5F1FF' },
    Listening: { label: 'Listening', score: Number(listeningBreakdown), color: '#AF52DE', tint: '#F6ECFB' },
    Writing: { label: 'Writing', score: Number(writingBreakdown), color: '#34C759', tint: '#E8F8EC' },
    Reading: { label: 'Reading', score: Number(readingBreakdown), color: '#FF9500', tint: '#FFF3E0' },
  };
  const activeBreakdown = breakdownMeta[selectedBreakdown];
  const handleBreakdownTap = (skill: BreakdownSkill) => {
    setSelectedBreakdown((prev) => (prev === skill ? 'Overall' : skill));
  };

  // Backend uses singular `video` (not `videos`) and `type` is a numeric id (2..6).
  const rawVideos: DashboardVideoItem[] = dashboardData?.video ?? [];
  const allowedTypes = TAB_TO_TYPES[selectedVideoTab];
  const filteredVideos = rawVideos.filter(
    (v) => typeof v?.type === 'number' && allowedTypes.includes(v.type),
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
          profileImage={getProfileImage()}
          onNotificationPress={() => navigation.navigate('NotificationsList')}
          onProfilePress={() => navigation.navigate('Profile')}
        />

        {/* --- Welcome Card --- */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>{getGreeting()}, {first_name.toUpperCase()} 👋</Text>
            <Text style={styles.welcomeSubtitle}>
              {examDaysText}
            </Text>
            <TouchableOpacity
              style={styles.examDateChip}
              onPress={() => setExamDatePickerVisible(true)}
              activeOpacity={0.7}
              disabled={examDateSaving}
            >
              <SmallCalendarIcon size={scale(12)} />
              <Text style={styles.examDateChipText}>
                {examDateSaving
                  ? 'Saving…'
                  : exam_date
                  ? `Exam: ${new Date(exam_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} • Change`
                  : 'Set Exam Date'}
              </Text>
              <ChevronRightIcon size={scale(10)} color="#1A2151" />
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeActions}>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => handlePractice('Today\'s Practice')}
            >
              <Text style={styles.actionTextPrimary}>Start Today's Practice</Text>
              <PlayIcon size={scale(14)} color="#1A2151" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => handlePractice('Mock Test')}
            >
              <Text style={styles.actionTextSecondary}>Start First Mock</Text>
              <ChevronRightIcon size={scale(14)} color="#1A2151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Categories Grid --- */}
        <View style={styles.categoriesGrid}>
          <View style={styles.row}>
            {/* Speaking */}
            <TouchableOpacity style={styles.categoryCard} onPress={() => handlePractice('Speaking')}>
              <View style={styles.categoryHeader}>
                <MicIcon size={scale(24)} color="#007AFF" />
                <View style={styles.viewRow}>
                  <Text style={styles.viewText}>View</Text>
                  <ChevronRightIcon size={scale(12)} color="#007AFF" />
                </View>
              </View>
              <Text style={styles.categoryTitle}>Speaking</Text>
              <View style={styles.countContainer}>
                <Text style={styles.boldCount}>{speakingCounts.done}</Text>
                <Text style={styles.totalCount}> / {speakingCounts.total}</Text>
              </View>
              <Text style={styles.categorySubText}>Questions Practiced</Text>
            </TouchableOpacity>

            {/* Writing */}
            <TouchableOpacity style={styles.categoryCard} onPress={() => handlePractice('Writing')}>
              <View style={styles.categoryHeader}>
                <PenIcon size={scale(24)} color="#34C759" />
                <View style={styles.viewRow}>
                  <Text style={styles.viewText}>View</Text>
                  <ChevronRightIcon size={scale(12)} color="#34C759" />
                </View>
              </View>
              <Text style={styles.categoryTitle}>Writing</Text>
              <View style={styles.countContainer}>
                <Text style={styles.boldCount}>{writingCounts.done}</Text>
                <Text style={styles.totalCount}> / {writingCounts.total}</Text>
              </View>
              <Text style={styles.categorySubText}>Questions Practiced</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            {/* Reading */}
            <TouchableOpacity style={styles.categoryCard} onPress={() => handlePractice('Reading')}>
              <View style={styles.categoryHeader}>
                <BookIcon size={scale(24)} color="#FF9500" />
                <View style={styles.viewRow}>
                  <Text style={styles.viewText}>View</Text>
                  <ChevronRightIcon size={scale(12)} color="#FF9500" />
                </View>
              </View>
              <Text style={styles.categoryTitle}>Reading</Text>
              <View style={styles.countContainer}>
                <Text style={styles.boldCount}>{readingCounts.done}</Text>
                <Text style={styles.totalCount}> / {readingCounts.total}</Text>
              </View>
              <Text style={styles.categorySubText}>Questions Practiced</Text>
            </TouchableOpacity>

            {/* Listening */}
            <TouchableOpacity style={styles.categoryCard} onPress={() => handlePractice('Listening')}>
              <View style={styles.categoryHeader}>
                <HeadphonesIcon size={scale(24)} color="#AF52DE" />
                <View style={styles.viewRow}>
                  <Text style={styles.viewText}>View</Text>
                  <ChevronRightIcon size={scale(12)} color="#AF52DE" />
                </View>
              </View>
              <Text style={styles.categoryTitle}>Listening</Text>
              <View style={styles.countContainer}>
                <Text style={styles.boldCount}>{listeningCounts.done}</Text>
                <Text style={styles.totalCount}> / {listeningCounts.total}</Text>
              </View>
              <Text style={styles.categorySubText}>Questions Practiced</Text>
            </TouchableOpacity>
          </View>
        </View>

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
              <Text style={styles.statLabel}>Total Mocks{'\n'}Practiced</Text>
            </View>
          </View>

          {/* Divider */}
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
              <Text style={styles.statLabel}>Total Questions{'\n'}Practiced</Text>
            </View>
          </View>

          {/* Divider */}
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
          <TouchableOpacity onPress={() => navigation.navigate('LiveSessions')}>
            <Text style={styles.viewAllText}>View All {'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.classCard}>
          <View style={styles.classLeft}>
            <View style={styles.classIndicator}>
              <InfoCircleFilledIcon size={scale(16)} />
            </View>
            <View style={styles.classDetails}>
              <Text style={styles.className}>Special Reading Class Monday</Text>
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
            {/* Chart */}
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
                <Text style={[styles.skillTagText, { color: activeBreakdown.color }]}>
                  {activeBreakdown.label}
                </Text>
              </View>
            </View>

            {/* Target info */}
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
                    : `Tap any skill to focus; tap again for Overall`}
                </Text>
              </View>
            </View>
          </View>

          {/* Breakdown Grid */}
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownRow}>
              <TouchableOpacity
                style={[
                  styles.breakdownItem,
                  selectedBreakdown === 'Speaking' && {
                    backgroundColor: breakdownMeta.Speaking.tint,
                    borderColor: breakdownMeta.Speaking.color,
                  },
                ]}
                onPress={() => handleBreakdownTap('Speaking')}
                activeOpacity={0.7}
              >
                <MicIcon size={scale(18)} color={breakdownMeta.Speaking.color} />
                <Text style={styles.breakdownLabel}>Speaking</Text>
                <Text style={styles.breakdownValue}>{speakingBreakdown}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.breakdownItem,
                  selectedBreakdown === 'Listening' && {
                    backgroundColor: breakdownMeta.Listening.tint,
                    borderColor: breakdownMeta.Listening.color,
                  },
                ]}
                onPress={() => handleBreakdownTap('Listening')}
                activeOpacity={0.7}
              >
                <HeadphonesIcon size={scale(18)} color={breakdownMeta.Listening.color} />
                <Text style={styles.breakdownLabel}>Listening</Text>
                <Text style={styles.breakdownValue}>{listeningBreakdown}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.breakdownRow}>
              <TouchableOpacity
                style={[
                  styles.breakdownItem,
                  selectedBreakdown === 'Writing' && {
                    backgroundColor: breakdownMeta.Writing.tint,
                    borderColor: breakdownMeta.Writing.color,
                  },
                ]}
                onPress={() => handleBreakdownTap('Writing')}
                activeOpacity={0.7}
              >
                <PenIcon size={scale(18)} color={breakdownMeta.Writing.color} />
                <Text style={styles.breakdownLabel}>Writing</Text>
                <Text style={styles.breakdownValue}>{writingBreakdown}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.breakdownItem,
                  selectedBreakdown === 'Reading' && {
                    backgroundColor: breakdownMeta.Reading.tint,
                    borderColor: breakdownMeta.Reading.color,
                  },
                ]}
                onPress={() => handleBreakdownTap('Reading')}
                activeOpacity={0.7}
              >
                <BookIcon size={scale(18)} color={breakdownMeta.Reading.color} />
                <Text style={styles.breakdownLabel}>Reading</Text>
                <Text style={styles.breakdownValue}>{readingBreakdown}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- PTE Tutorial Videos --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>PTE Tutorial Videos</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['Speaking', 'Writing', 'Reading', 'Listening', 'Others'] as VideoSkillTab[]).map((tab) => {
            const isActive = selectedVideoTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setSelectedVideoTab(tab)}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Videos Horizontal List */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosContent}
          style={styles.videosContainer}
        >
          {filteredVideos.map((video) => (
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
              <Text style={styles.emptyVideosText}>No tutorial videos in this category.</Text>
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

      {/* --- Custom Premium Info Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Methodology</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.closeButton}>
                <CloseIcon size={scale(20)} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoIconWrapper}>
                <InfoOutlineIcon size={scale(24)} />
              </View>
              <Text style={styles.modalText}>
                Your AI Predicted Score is calculated based on your performance in the last 5 mock tests
                and target practice metrics, comparing them directly against actual PTE exam standards.
              </Text>
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setInfoModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- Feedback Modal --- */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        showToast={showToast}
      />

      {/* --- Exam Date Picker --- */}
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
              onError={(msg) => showToast(msg, 'error')}
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
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: scale(20),
  },
  welcomeInfo: {
    marginBottom: scale(15),
  },
  welcomeText: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  welcomeSubtitle: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  examDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingVertical: scale(5),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    marginTop: scale(8),
  },
  examDateChipText: {
    fontSize: scale(10.5),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginHorizontal: scale(6),
  },
  welcomeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButtonPrimary: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFFFA0',
    paddingVertical: scale(10),
    borderRadius: scale(12),
    marginRight: scale(8),
  },
  actionTextPrimary: {
    fontSize: scale(10.5),
    fontWeight: 'bold',
    color: '#1A2151',
    marginRight: scale(6),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  actionButtonSecondary: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: scale(10),
    borderRadius: scale(12),
  },
  actionTextSecondary: {
    fontSize: scale(10.5),
    fontWeight: 'bold',
    color: '#1A2151',
    marginRight: scale(4),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  categoriesGrid: {
    paddingHorizontal: scale(12),
    marginBottom: scale(10),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(14),
    marginHorizontal: scale(4),
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: scale(10),
    color: '#8E8E93',
    marginRight: scale(2),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  categoryTitle: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: scale(2),
  },
  boldCount: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  totalCount: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  categorySubText: {
    fontSize: scale(9.5),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(10),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: scale(20),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(4),
  },
  statIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(6),
    position: 'relative',
  },
  arrowBadge: {
    position: 'absolute',
    bottom: scale(-2),
    right: scale(-2),
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: '#34C759',
  },
  warningBadge: {
    backgroundColor: '#FF9500',
  },
  infoBadge: {
    backgroundColor: '#007AFF',
  },
  statInfo: {
    justifyContent: 'center',
  },
  statValue: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  statLabel: {
    fontSize: scale(9),
    color: '#8E8E93',
    lineHeight: scale(11),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  statsDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E5EA',
  },
  micBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: scale(20),
  },
  micTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DFFFA0',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(15),
  },
  micButtonText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#85B82B',
    marginRight: scale(4),
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  viewAllText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: '#85B82B',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  helperLink: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  classCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: scale(20),
  },
  classLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classIndicator: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  classDetails: {
    flex: 1,
  },
  className: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1A2151',
    marginBottom: scale(2),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  classSubtitle: {
    fontSize: scale(10),
    color: '#8E8E93',
    marginBottom: scale(6),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    alignSelf: 'flex-start',
    paddingVertical: scale(3),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
  },
  timerDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#FF3B30',
    marginRight: scale(5),
  },
  timerText: {
    fontSize: scale(10),
    color: '#555',
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: scale(8),
    paddingHorizontal: scale(15),
    borderRadius: scale(18),
  },
  bookButtonText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#1c1c1e',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  aiScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: scale(20),
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(15),
  },
  targetInfo: {
    flex: 1,
    marginLeft: scale(20),
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  targetLabel: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  targetValue: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  targetAlert: {
    backgroundColor: '#FFFBEA',
    borderRadius: scale(8),
    padding: scale(10),
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  alertText: {
    fontSize: scale(9.5),
    color: '#D97706',
    lineHeight: scale(13),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  alertBold: {
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  breakdownGrid: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: scale(15),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: scale(10),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    marginHorizontal: scale(4),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chartColumn: {
    alignItems: 'center',
  },
  skillTag: {
    marginTop: scale(8),
    paddingVertical: scale(3),
    paddingHorizontal: scale(10),
    borderRadius: scale(10),
    alignSelf: 'center',
  },
  skillTagText: {
    fontSize: scale(10),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: scale(11),
    color: '#8E8E93',
    marginLeft: scale(8),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  breakdownValue: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
  },
  tabButton: {
    flex: 1,
    paddingVertical: scale(6),
    borderRadius: scale(16),
    backgroundColor: '#F2F2F7',
    marginHorizontal: scale(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1A2151',
  },
  tabButtonText: {
    fontSize: scale(10),
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  videosContainer: {
    marginBottom: scale(20),
  },
  videosContent: {
    paddingHorizontal: scale(16),
  },
  videoCard: {
    width: scale(160),
    marginRight: scale(12),
  },
  thumbnailContainer: {
    width: '100%',
    height: scale(100),
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  playBadge: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(26, 33, 81, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: scale(11),
    fontWeight: '600',
    color: '#1A2151',
    marginTop: scale(6),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  emptyVideosContainer: {
    paddingVertical: scale(20),
    paddingHorizontal: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyVideosText: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: '#EAECEF',
    overflow: 'hidden',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  helpIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  helpTextWrap: {
    flex: 1,
  },
  helpTitle: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
  },
  helpSubtitle: {
    fontSize: scale(11),
    color: '#64748B',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  helpDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: scale(70),
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  videoModalCloseFloating: {
    position: 'absolute',
    top: scale(50),
    left: scale(16),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 43, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    width: '90%',
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: scale(15),
  },
  modalTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  closeButton: {
    padding: scale(5),
  },
  modalBody: {
    alignItems: 'center',
    marginBottom: scale(20),
    paddingHorizontal: scale(10),
  },
  infoIconWrapper: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    backgroundColor: '#F3FBF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(15),
  },
  modalText: {
    fontSize: scale(14),
    color: '#555555',
    textAlign: 'center',
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  modalCloseButton: {
    backgroundColor: '#1A2151',
    paddingVertical: scale(12),
    width: '100%',
    borderRadius: scale(14),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: scale(13),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});

export default DashboardScreen;
