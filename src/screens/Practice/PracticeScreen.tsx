import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/organisms/Header';
import { colors } from '../../theme/colors';
import { isPteCore, getPdfPath } from '../../config/appVariantConfig';
import { useDashboardData } from '../../context/DashboardDataContext';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import {
  SparklesIcon,
  HeaderBookIcon,
  ReadAloudIcon,
  RepeatSentenceIcon,
  DescribeImageIcon,
  RetellLectureIcon,
  AnswerShortQuestionIcon,
  RespondSituationIcon,
  SummarizeWrittenTextIcon,
  ReadingIcon,
  ListeningIcon,
  ChevronRightIcon,
} from '../../components/atoms/Icon';
import { PracticeSkeleton } from '../../components/atoms/Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Icon resolver by subcategory id ──────────────────────────────────────────
const getIconForSubcategory = (id: number, color: string): React.ReactNode => {
  switch (id) {
    case 1:  return <ReadAloudIcon color={color} />;
    case 2:  return <RepeatSentenceIcon color={color} />;
    case 3:  return <DescribeImageIcon color={color} />;
    case 4:  return <RetellLectureIcon color={color} />;
    case 5:  return <AnswerShortQuestionIcon color={color} />;
    case 21: return <RespondSituationIcon color={color} />;
    case 6:
    case 7:  return <SummarizeWrittenTextIcon color={color} />;
    case 8:
    case 9:
    case 10:
    case 11:
    case 12: return <ReadingIcon color={color} />;
    default: return <ListeningIcon color={color} />;
  }
};

// Category name → accent colour
const CATEGORY_COLORS: Record<string, string> = {
  Speaking:  '#007AFF',
  Writing:   '#34C759',
  Reading:   '#FF9500',
  Listening: '#AF52DE',
};

interface ApiSubcategory {
  id: number;
  title: string;              // actual field from API is 'title', not 'name'
  pte_core_title?: string;
  category: string;           // 'Speaking' | 'Writing' | 'Reading' | 'Listening'
  total_questions?: number;
  attempted?: number;
}

interface CategoryGroup {
  name: string;              // 'Speaking' | 'Writing' | 'Reading' | 'Listening'
  subcategories: ApiSubcategory[];
}

interface TokensData {
  speaking_tokens?: number;
  writing_tokens?: number;
  [key: string]: any;
}

interface PracticeScreenProps {
  dashboardData: any;
  hasNotifications: boolean;
  profileImage: string;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PracticeScreen: React.FC<Partial<PracticeScreenProps>> = (props) => {
  const contextData = useDashboardData();
  const toastContext = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dashboardData     = props.dashboardData !== undefined ? props.dashboardData : contextData.dashboardData;
  const hasNotifications  = props.hasNotifications !== undefined ? props.hasNotifications : contextData.hasNotifications;
  const showToast         = props.showToast !== undefined ? props.showToast : toastContext.showToast;

  const getProfileImage = () => {
    if (props.profileImage !== undefined) return props.profileImage;
    const photoPath = dashboardData?.image || dashboardData?.user?.image;
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    }
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = getPdfPath();
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `${baseUrl}${separator}${cleanPath}`;
  };
  const profileImage        = getProfileImage();
  const onNotificationPress = props.onNotificationPress || (() => navigation.navigate('NotificationsList'));
  const onProfilePress      = props.onProfilePress || (() => navigation.navigate('Profile'));

  // ── API State ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [tokens, setTokens]         = useState<TokensData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected category tab by name
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Speaking');

  // ── Fetch: Categories + Tokens (parallel) ────────────────────────────────
  const fetchPracticeData = useCallback(async (isPullToRefresh = false) => {
    isPullToRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [catRes, tokRes] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.CATEGORIES),
        apiClient.get(API_ENDPOINTS.GET_TOKENS),
      ]);

      if (catRes.status === 'fulfilled') {
        const raw = catRes.value.data?.data ?? catRes.value.data ?? {};

        // API returns flat subcategories array with 'category' field
        const flatSubs: ApiSubcategory[] = raw.subcategories ?? [];

        // Group into the 4 main categories preserving order
        const ORDER = ['Speaking', 'Writing', 'Reading', 'Listening'];
        const grouped: CategoryGroup[] = ORDER.map((catName) => ({
          name: catName,
          subcategories: flatSubs.filter((s) => s.category === catName),
        }));

        setCategories(grouped);
        // Use the functional updater so this callback doesn't have to depend
        // on `selectedCategoryName` (and re-create on every selection change).
        setSelectedCategoryName((curr) => curr || 'Speaking');
      } else {
        showToast('Could not load practice categories', 'error');
      }

      if (tokRes.status === 'fulfilled') {
        const t = tokRes.value.data?.data ?? tokRes.value.data ?? null;
        setTokens(t);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load practice data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPracticeData();
  }, [fetchPracticeData]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const selectedCategory    = categories.find((c) => c.name === selectedCategoryName) ?? null;
  const selectedColor       = CATEGORY_COLORS[selectedCategoryName] ?? '#007AFF';
  const subcategories       = selectedCategory?.subcategories ?? [];

  // isPteCore — use pte_core_title if applicable
  const isCore = isPteCore();

  // ── Navigate to Question List ──────────────────────────────────────────────
  const handlePracticeNow = (sub: ApiSubcategory) => {
    try {
      (navigation as any).navigate('PracticeCommonList', {
        categoryId:     sub.id,
        categoryName:   isCore ? (sub.pte_core_title ?? sub.title) : sub.title,
        parentCategory: selectedCategoryName,
      });
    } catch {
      showToast(`Opening ${sub.title}...`, 'info');
    }
  };

  // ── Token display helper ──────────────────────────────────────────────────
  const getTokensLabel = (): string | null => {
    if (!tokens) return null;
    if (selectedCategoryName === 'Speaking' && tokens.speaking_tokens !== undefined) {
      return `${tokens.speaking_tokens} attempts left`;
    }
    if (selectedCategoryName === 'Writing' && tokens.writing_tokens !== undefined) {
      return `${tokens.writing_tokens} attempts left`;
    }
    return null;
  };
  const tokensLabel = getTokensLabel();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
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
            onRefresh={() => fetchPracticeData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Title Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.titleText}>Practice Material</Text>
            <View style={styles.togglePill}>
              <Text style={styles.togglePillText}>Questions</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerBookButton}>
            <HeaderBookIcon />
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading ? (
          <PracticeSkeleton />
        ) : (
          <>
            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
              {categories.map((cat) => {
                const isActive  = cat.name === selectedCategoryName;
                const dotColor  = CATEGORY_COLORS[cat.name] ?? '#007AFF';
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryPill,
                      isActive
                        ? { borderColor: colors.primary, backgroundColor: colors.white, borderWidth: 1 }
                        : { borderColor: 'transparent', backgroundColor: '#E5E5EA' },
                    ]}
                    onPress={() => setSelectedCategoryName(cat.name)}
                  >
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    <Text
                      style={[
                        styles.categoryPillText,
                        isActive ? { color: colors.primary, fontWeight: '700' } : { color: colors.gray },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Token badge for Speaking / Writing */}
            {tokensLabel && (
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenText}>🎯 {tokensLabel}</Text>
              </View>
            )}

            {/* Subcategory Cards (from API) */}
            <View style={styles.cardListContainer}>
              {subcategories.length === 0 ? (
                <Text style={styles.emptyText}>No subcategories found.</Text>
              ) : (
                subcategories.map((sub) => {
                  const attempted = sub.attempted ?? 0;
                  const total     = sub.total_questions ?? 0;
                  const ratio     = total > 0 ? Math.min(attempted / total, 1) : 0;
                  // Display title — use pte_core_title when on PTE Core variant
                  const displayName = isCore ? (sub.pte_core_title ?? sub.title) : sub.title;

                  return (
                    <View key={sub.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: `${selectedColor}1A` }]}>
                          {getIconForSubcategory(sub.id, selectedColor)}
                        </View>
                        <View style={styles.sparkleContainer}>
                          <SparklesIcon color={selectedColor} />
                        </View>
                      </View>

                      <Text style={styles.taskName}>{displayName}</Text>

                      <View style={styles.progressRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>
                          {attempted.toLocaleString()} / {total.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${ratio * 100}%`, backgroundColor: colors.success },
                          ]}
                        />
                      </View>

                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          style={styles.practiceButton}
                          onPress={() => handlePracticeNow(sub)}
                        >
                          <Text style={[styles.practiceButtonText, { color: colors.primary }]}>
                            Practice Now
                          </Text>
                          <ChevronRightIcon size={scale(12)} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.todayText}>Today</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8F9FC' },
  scrollView:      { flex: 1 },
  scrollContent:   { paddingBottom: scale(20) },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: scale(30),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  titleLeft:       { flexDirection: 'row', alignItems: 'center' },
  titleText: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  togglePill: {
    backgroundColor: '#0D112B',
    borderRadius: scale(15),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    marginLeft: scale(8),
  },
  togglePillText: {
    color: colors.white,
    fontSize: scale(10),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  headerBookButton: { padding: scale(6) },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
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
  tokenBadge: {
    marginHorizontal: scale(16),
    marginBottom: scale(10),
    backgroundColor: '#FFF9E6',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE58F',
  },
  tokenText: {
    fontSize: scale(11),
    color: '#856404',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  cardListContainer:  { paddingHorizontal: scale(16) },
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(6),
    backgroundColor: '#F3F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskName: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1A2151',
    marginBottom: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  progressLabel: {
    fontSize: scale(11),
    color: colors.gray,
    fontFamily: 'BricolageGrotesque-Regular',
  },
  progressValue: {
    fontSize: scale(11),
    color: colors.gray,
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  progressTrack: {
    height: scale(8),
    backgroundColor: '#E5E5EA',
    borderRadius: scale(4),
    overflow: 'hidden',
    marginBottom: scale(16),
  },
  progressFill:    { height: '100%', borderRadius: scale(4) },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  practiceButton:      { flexDirection: 'row', alignItems: 'center' },
  practiceButtonText: {
    fontSize: scale(12),
    fontWeight: 'bold',
    marginRight: scale(4),
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  todayText: {
    fontSize: scale(10),
    color: colors.gray,
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
