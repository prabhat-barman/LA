import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { MonthlyPredictionSkeleton } from '../../components/atoms/Skeleton';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';
import { isPteCore } from '../../config/appVariantConfig';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import {
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

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Constants ────────────────────────────────────────────────────────────────

type Skill = 'Speaking' | 'Writing' | 'Reading' | 'Listening';
const SKILLS: Skill[] = ['Speaking', 'Writing', 'Reading', 'Listening'];

const SKILL_COLORS: Record<Skill, string> = {
  Speaking: '#007AFF',
  Writing: '#34C759',
  Reading: '#FF9500',
  Listening: '#AF52DE',
};

const SKILL_TINTS: Record<Skill, string> = {
  Speaking: '#E5F1FF',
  Writing: '#E8F8EC',
  Reading: '#FFF3E0',
  Listening: '#F6ECFB',
};

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

// Map a practice rate (0..1) to a difficulty label. This is purely a UX
// heuristic — when the backend provides explicit `difficulty` we use that
// directly. Otherwise: low practice rate ⇒ Hard (people aren't doing it),
// medium ⇒ Medium, high ⇒ Easy.
const deriveDifficulty = (
  ratio: number,
  backendDifficulty?: string,
): { label: string; color: string; tint: string } => {
  const provided = (backendDifficulty || '').toString().toLowerCase();
  if (provided.startsWith('easy')) {
    return { label: 'Easy', color: '#34C759', tint: '#E8F8EC' };
  }
  if (provided.startsWith('med') || provided.startsWith('inter')) {
    return { label: 'Medium', color: '#FF9500', tint: '#FFF3E0' };
  }
  if (provided.startsWith('hard') || provided.startsWith('adv')) {
    return { label: 'Hard', color: '#FF3B30', tint: '#FFE5E5' };
  }
  if (ratio >= 0.66) return { label: 'Easy', color: '#34C759', tint: '#E8F8EC' };
  if (ratio >= 0.33) return { label: 'Medium', color: '#FF9500', tint: '#FFF3E0' };
  return { label: 'Hard', color: '#FF3B30', tint: '#FFE5E5' };
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiSubcategory {
  id: number;
  title: string;
  pte_core_title?: string;
  category: string;
  total_questions?: number;
  attempted?: number;
  difficulty?: string;
  // Some response shapes might include prediction-specific counts; pick them
  // up defensively if present, otherwise we fall back to attempted/total.
  prediction_total?: number;
  prediction_attempted?: number;
}

interface GroupedSkill {
  name: Skill;
  subcategories: ApiSubcategory[];
}

// ── Screen ──────────────────────────────────────────────────────────────────

export const MonthlyPredictionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const isCore = isPteCore();

  const [grouped, setGrouped] = useState<GroupedSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill>('Speaking');

  // Parse a flat subcategory list out of CATEGORIES — same defensive shape
  // handling we use across the app.
  const parseSubcategories = (raw: any): ApiSubcategory[] => {
    if (Array.isArray(raw?.subcategories)) return raw.subcategories;
    if (Array.isArray(raw?.data?.subcategories)) return raw.data.subcategories;
    if (Array.isArray(raw)) return raw;
    return [];
  };

  const fetchData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true); else setLoading(true);
    try {
      // CATEGORIES is the canonical source of attempted/total per question
      // type. The MONTHLY_PREDICTION endpoint returns the per-question list,
      // which we navigate into when the user taps a row.
      const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
      const subs = parseSubcategories(res.data?.data ?? res.data);
      const groupedSkills: GroupedSkill[] = SKILLS.map((s) => ({
        name: s,
        subcategories: subs.filter((sub) => sub.category === s),
      }));
      setGrouped(groupedSkills);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load prediction data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => fetchData(true);

  const activeSubs = useMemo(() => {
    return grouped.find((g) => g.name === selectedSkill)?.subcategories ?? [];
  }, [grouped, selectedSkill]);

  const handleOpenQuestionType = (sub: ApiSubcategory) => {
    (navigation as any).navigate('PracticeCommonList', {
      categoryId: sub.id,
      categoryName: isCore ? (sub.pte_core_title ?? sub.title) : sub.title,
      parentCategory: selectedSkill,
    });
  };

  const skillColor = SKILL_COLORS[selectedSkill];
  const skillTint = SKILL_TINTS[selectedSkill];

  return (
    <View style={styles.container}>
      <SubHeader title="Monthly Prediction" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Skill Tabs */}
        <View style={styles.tabsContainer}>
          {SKILLS.map((skill) => {
            const isActive = skill === selectedSkill;
            const dotColor = SKILL_COLORS[skill];
            return (
              <TouchableOpacity
                key={skill}
                style={[
                  styles.tabPill,
                  isActive
                    ? { borderColor: colors.primary, backgroundColor: colors.white, borderWidth: 1 }
                    : { borderColor: 'transparent', backgroundColor: '#E5E5EA' },
                ]}
                onPress={() => setSelectedSkill(skill)}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <Text
                  style={[
                    styles.tabPillText,
                    isActive ? { color: colors.primary, fontWeight: '700' } : { color: colors.gray },
                  ]}
                  numberOfLines={1}
                >
                  {skill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loading state */}
        {loading ? (
          <View style={styles.listContainer}>
            <MonthlyPredictionSkeleton count={4} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeSubs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No prediction question types available.</Text>
              </View>
            ) : (
              activeSubs.map((sub) => {
                const attempted = Number(sub.prediction_attempted ?? sub.attempted ?? 0);
                const total = Number(sub.prediction_total ?? sub.total_questions ?? 0);
                const progressRatio = total > 0 ? Math.min(attempted / total, 1) : 0;
                // "Practice Rate" expresses how actively this question type is
                // being practised in the prediction set — same metric, but
                // surfaced separately because the backend may eventually split
                // these into distinct numbers.
                const practiceRate = progressRatio;
                const difficulty = deriveDifficulty(progressRatio, sub.difficulty);
                const displayName = isCore ? (sub.pte_core_title ?? sub.title) : sub.title;

                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => handleOpenQuestionType(sub)}
                  >
                    {/* Top row: icon + title + difficulty badge */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: skillTint }]}>
                        {getIconForSubcategory(sub.id, skillColor)}
                      </View>
                      <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {attempted.toLocaleString()} / {total.toLocaleString()} practiced
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.difficultyBadge,
                          { backgroundColor: difficulty.tint },
                        ]}
                      >
                        <Text style={[styles.difficultyText, { color: difficulty.color }]}>
                          {difficulty.label}
                        </Text>
                      </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Progress</Text>
                      <Text style={styles.metricValue}>{Math.round(progressRatio * 100)}%</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${progressRatio * 100}%`, backgroundColor: skillColor },
                        ]}
                      />
                    </View>

                    {/* Practice Rate */}
                    <View style={[styles.metricRow, { marginTop: scale(10) }]}>
                      <Text style={styles.metricLabel}>Practice Rate</Text>
                      <Text style={styles.metricValue}>{Math.round(practiceRate * 100)}%</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${practiceRate * 100}%`, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={[styles.practiceCta, { color: skillColor }]}>
                        Practice Now
                      </Text>
                      <ChevronRightIcon size={scale(12)} color={skillColor} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(30),
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    marginBottom: scale(12),
    gap: scale(6),
  },
  tabPill: {
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
  tabPillText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  listContainer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(4),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  iconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    marginBottom: scale(2),
  },
  cardSubtitle: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  difficultyBadge: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(10),
  },
  difficultyText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  metricLabel: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  metricValue: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
  },
  track: {
    height: scale(6),
    backgroundColor: '#F2F2F7',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: scale(3),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: scale(12),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  practiceCta: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-SemiBold',
    marginRight: scale(4),
  },
  emptyContainer: {
    paddingVertical: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
});

export default MonthlyPredictionScreen;
