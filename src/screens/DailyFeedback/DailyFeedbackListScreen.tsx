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
import {
  SkeletonCircle,
  DailyFeedbackListSkeleton,
} from '../../components/atoms/Skeleton';
import {
  ChartIcon,
  CheckCircleIcon,
  OpenBookIcon,
  StackIcon,
} from '../../components/atoms/Icon';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Types ───────────────────────────────────────────────────────────────────

export interface FeedbackItem {
  id: string | number;
  category: 'Speaking' | 'Writing' | 'Reading' | 'Listening' | string;
  questionType: string; // e.g. "Read Aloud", "Speaking Fluency"
  questionTypeId?: number; // backend `type` number (1-22)
  attemptLabel?: string; // e.g. "AI 1"
  reviewed: boolean;
  title: string;
  description: string;
  score?: number | string;
  dateLabel?: string; // optional date string from API
  scoreBreakdown?: Record<string, number>; // e.g. { content: 75, fluency: 80, pronunciation: 65 }
  raw: any;
}

interface DailyStats {
  averageScore: number | string;
  reading: number | string;
  reviewed: number | string;
  questionsPracticed: number | string;
}

// Admin-suggested study plans shown on empty days.
interface StudyPlan {
  id: number;
  title: string;
}

// ── Question type id ⇄ name + category mapping ──────────────────────────────
// Mirrors the `question/<id>` routes in `src/config/URLS.ts`. The backend's
// `type` field on each feedback item points at one of these.

export const QUESTION_TYPE_META: Record<
  number,
  { name: string; category: 'Speaking' | 'Writing' | 'Reading' | 'Listening' }
> = {
  1: { name: 'Read Aloud', category: 'Speaking' },
  2: { name: 'Repeat Sentence', category: 'Speaking' },
  3: { name: 'Describe Image', category: 'Speaking' },
  4: { name: 'Re-tell Lecture', category: 'Speaking' },
  5: { name: 'Answer Short Question', category: 'Speaking' },
  6: { name: 'Summarize Written Text', category: 'Writing' },
  7: { name: 'Write Essay', category: 'Writing' },
  8: { name: 'Reading MCQ — Single Answer', category: 'Reading' },
  9: { name: 'Reading MCQ — Multiple Answers', category: 'Reading' },
  10: { name: 'Re-order Paragraph', category: 'Reading' },
  11: { name: 'Reading Fill in the Blanks', category: 'Reading' },
  12: { name: 'Reading & Writing Fill in the Blanks', category: 'Reading' },
  13: { name: 'Summarize Spoken Text', category: 'Listening' },
  14: { name: 'Listening MCQ — Single Answer', category: 'Listening' },
  15: { name: 'Listening MCQ — Multiple Answers', category: 'Listening' },
  16: { name: 'Listening Fill in the Blanks', category: 'Listening' },
  17: { name: 'Highlight Correct Summary', category: 'Listening' },
  18: { name: 'Select Missing Word', category: 'Listening' },
  19: { name: 'Highlight Incorrect Words', category: 'Listening' },
  20: { name: 'Write from Dictation', category: 'Listening' },
  21: { name: 'Respond to a Situation', category: 'Speaking' },
  22: { name: 'Re-tell Lecture (Extended)', category: 'Speaking' },
};

// ── `score_type` → component label (from the `remarks` catalog) ─────────────
// 0=Content 1=Fluency 2=Pronunciation 3=Default 4=Grammar 5=Form 6=Vocabulary
// 7=Spelling 8/9=Reserved.
export const SCORE_TYPE_LABEL: Record<number, string> = {
  0: 'Content',
  1: 'Fluency',
  2: 'Pronunciation',
  3: 'Overall',
  4: 'Grammar',
  5: 'Form',
  6: 'Vocabulary',
  7: 'Spelling',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, { bg: string; fg: string }> = {
  Speaking: { bg: '#E5F1FF', fg: '#007AFF' },
  Writing: { bg: '#E8F8EC', fg: '#34C759' },
  Reading: { bg: '#FFF3E0', fg: '#FF9500' },
  Listening: { bg: '#F6ECFB', fg: '#AF52DE' },
};

const getCategoryColor = (cat: string) =>
  CATEGORY_COLOR[cat] ?? { bg: '#F2F2F7', fg: '#1A2151' };

const formatDateLabel = (dateInput?: string | Date | null): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
};

// Extract the list of practice attempts. The real DAILY_REPORT shape returns
// the items under `data` at the top level. Older / alternate shapes are also
// tolerated so we don't break if the backend evolves.
const extractItemsList = (raw: any): any[] => {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.feedback)) return raw.feedback;
  if (Array.isArray(raw?.report)) return raw.report;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.daily_report)) return raw.daily_report;
  return [];
};

// Pull individual sub-scores out of an attempt. Different question types use
// different fields; the simplest is to scan for any numeric `*_score` keys.
const extractScoreBreakdown = (it: any): Record<string, number> => {
  const out: Record<string, number> = {};
  if (it && typeof it === 'object') {
    if (typeof it.content_score === 'number') out.content = it.content_score;
    if (typeof it.fluency_score === 'number') out.fluency = it.fluency_score;
    if (typeof it.pronunciation_score === 'number') out.pronunciation = it.pronunciation_score;
    if (typeof it.grammar_score === 'number') out.grammar = it.grammar_score;
    if (typeof it.form_score === 'number') out.form = it.form_score;
    if (typeof it.vocabulary_score === 'number') out.vocabulary = it.vocabulary_score;
    if (typeof it.spelling_score === 'number') out.spelling = it.spelling_score;
    // Nested `score` object variant
    if (it.score && typeof it.score === 'object' && !Array.isArray(it.score)) {
      for (const k of Object.keys(it.score)) {
        const v = it.score[k];
        if (typeof v === 'number') out[k.toLowerCase()] = v;
      }
    }
  }
  return out;
};

const extractFeedbackText = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.remarks ?? val.remark ?? val.feedback ?? val.comment ?? JSON.stringify(val);
  }
  return String(val);
};

const parseFeedbackItems = (raw: any): FeedbackItem[] => {
  const list = extractItemsList(raw);
  return list.map((it: any, idx: number) => {
    const id = it?.id ?? it?._id ?? `fb-${idx}`;
    const typeId = Number(it?.type ?? it?.question_type_id ?? it?.subcategory_id);
    const meta = !isNaN(typeId) ? QUESTION_TYPE_META[typeId] : undefined;
    const category =
      it?.category ??
      it?.skill ??
      it?.parent_category ??
      it?.questionCategory ??
      meta?.category ??
      'Speaking';
    const questionType =
      meta?.name ??
      it?.question_type ??
      it?.questionType ??
      it?.subcategory ??
      it?.title ??
      'Practice';
    const attemptLabel =
      it?.attempt_label ??
      it?.attemptLabel ??
      (it?.is_ai ? `AI ${it?.attempt ?? 1}` : undefined);
    const reviewed = Boolean(
      it?.reviewed ?? it?.is_reviewed ?? it?.viewed ?? false,
    );
    const title = extractFeedbackText(it?.feedback_title ?? it?.title ?? questionType);
    const description = extractFeedbackText(
      it?.summary ??
      it?.description ??
      it?.feedback ??
      it?.short_feedback ??
      ''
    );
    const score =
      it?.total_score ??
      it?.score ??
      it?.percentage ??
      undefined;
    const dateLabel = it?.date ?? it?.created_at ?? it?.attempt_date ?? undefined;
    return {
      id,
      category,
      questionType,
      questionTypeId: !isNaN(typeId) ? typeId : undefined,
      attemptLabel,
      reviewed,
      title,
      description,
      score: typeof score === 'object' ? undefined : score,
      dateLabel,
      scoreBreakdown: extractScoreBreakdown(it),
      raw: it,
    };
  });
};

// Build the top-of-screen stats. DAILY_REPORT exposes `user.average_score`
// directly; counts are derived from the items list since the backend does not
// (yet) return a separate aggregate block.
const parseStats = (raw: any, items: FeedbackItem[]): DailyStats => {
  const userAvg = raw?.user?.average_score;
  const avgNumeric =
    typeof userAvg === 'number'
      ? userAvg
      : userAvg == null
      ? items.length > 0
        ? Math.round(
            items.reduce((sum, i) => sum + (Number(i.score) || 0), 0) /
              items.length,
          )
        : 0
      : Number(userAvg) || 0;
  const reviewed = items.filter((i) => i.reviewed).length;
  // "Reading" tile in the mockup counts attempts in the Reading skill.
  const reading = items.filter(
    (i) => String(i.category).toLowerCase() === 'reading',
  ).length;
  return {
    averageScore: avgNumeric,
    reading,
    reviewed,
    questionsPracticed: items.length,
  };
};

const parseStudyPlans = (raw: any): StudyPlan[] => {
  const list = Array.isArray(raw?.admin_task_arr) ? raw.admin_task_arr : [];
  return list.map((t: any, idx: number) => ({
    id: Number(t?.id ?? idx),
    title: String(t?.title ?? `Plan ${idx + 1}`),
  }));
};

// ── Screen ──────────────────────────────────────────────────────────────────

export const DailyFeedbackListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();

  const [stats, setStats] = useState<DailyStats>({
    averageScore: 0,
    reading: 0,
    reviewed: 0,
    questionsPracticed: 0,
  });
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [serverDate, setServerDate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | number | null>(null);

  const fetchData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.DAILY_REPORT);
      // Keep the full envelope — DAILY_REPORT returns sibling top-level keys
      // (data, user, remarks, admin_task_arr, date) that we need to read
      // independently.
      const raw = res.data ?? {};
      const parsedItems = parseFeedbackItems(raw);
      setItems(parsedItems);
      setStats(parseStats(raw, parsedItems));
      setStudyPlans(parseStudyPlans(raw));
      setRemarks(Array.isArray(raw?.remarks) ? raw.remarks : []);
      setServerDate(typeof raw?.date === 'string' ? raw.date : undefined);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load daily feedback', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkReviewed = async (item: FeedbackItem) => {
    if (item.reviewed) return;
    setMarkingId(item.id);
    // Optimistic update so the UI feels snappy even when the network is slow.
    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, reviewed: true } : p)),
    );
    try {
      await apiClient.post(API_ENDPOINTS.SET_TAG, {
        id: item.id,
        type: 'reviewed',
        value: 1,
      });
      showToast('Marked as reviewed', 'success');
    } catch (err: any) {
      // Revert optimistic update on failure
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, reviewed: false } : p)),
      );
      showToast(err?.message || 'Failed to mark as reviewed', 'error');
    } finally {
      setMarkingId(null);
    }
  };

  const handleOpenDetail = (item: FeedbackItem) => {
    (navigation as any).navigate('DailyFeedbackDetail', {
      itemId: item.id,
      title: item.title,
      category: item.category,
      raw: item.raw,
      questionTypeId: item.questionTypeId,
      scoreBreakdown: item.scoreBreakdown,
      remarks,
    });
  };

  const dateLabel = useMemo(
    () => formatDateLabel(serverDate),
    [serverDate],
  );

  return (
    <View style={styles.container}>
      <SubHeader title="Daily Feedback" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats Bar */}
        <View style={styles.statsGrid}>
          <View style={[styles.statTile, { backgroundColor: '#E5F1FF' }]}>
            <View style={styles.statHeader}>
              <ChartIcon />
              <Text style={styles.statValueBlue}>
                {loading ? '–' : stats.averageScore}
              </Text>
            </View>
            <Text style={styles.statLabel}>Average Score</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: '#E8F8EC' }]}>
            <View style={styles.statHeader}>
              <CheckCircleIcon />
              <Text style={styles.statValueGreen}>
                {loading ? '–' : stats.reviewed}
              </Text>
            </View>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: '#FFF3E0' }]}>
            <View style={styles.statHeader}>
              <OpenBookIcon />
              <Text style={styles.statValueOrange}>
                {loading ? '–' : stats.reading}
              </Text>
            </View>
            <Text style={styles.statLabel}>Reading</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: '#F6ECFB' }]}>
            <View style={styles.statHeader}>
              <StackIcon />
              <Text style={styles.statValuePurple}>
                {loading ? '–' : stats.questionsPracticed}
              </Text>
            </View>
            <Text style={styles.statLabel}>Questions Practiced</Text>
          </View>
        </View>

        {/* Date label */}
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        {/* Cards */}
        <View style={styles.listContainer}>
          {loading ? (
            <DailyFeedbackListSkeleton count={3} />
          ) : items.length === 0 ? (
            <View>
              <View style={styles.emptyContainer}>
                <SkeletonCircle size={scale(64)} />
                <Text style={styles.emptyText}>No feedback yet for today.</Text>
                <Text style={styles.emptySubText}>
                  Complete a practice attempt to see your feedback here.
                </Text>
              </View>

              {studyPlans.length > 0 ? (
                <View style={styles.plansSection}>
                  <Text style={styles.plansHeading}>Recommended Study Plans</Text>
                  {studyPlans.map((plan, idx) => {
                    const accent = ['#007AFF', '#34C759', '#FF9500', '#AF52DE'][idx % 4];
                    return (
                      <View
                        key={plan.id}
                        style={[styles.planRow, { borderLeftColor: accent }]}
                      >
                        <View style={[styles.planBullet, { backgroundColor: accent }]} />
                        <Text style={styles.planTitle}>{plan.title}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : (
            items.map((item) => {
              const catColor = getCategoryColor(item.category);
              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => handleOpenDetail(item)}
                >
                  {/* Tags row */}
                  <View style={styles.tagsRow}>
                    <View style={[styles.tagPill, { backgroundColor: catColor.bg }]}>
                      <Text style={[styles.tagPillText, { color: catColor.fg }]}>
                        {String(item.category).toUpperCase()}
                      </Text>
                    </View>
                    {item.attemptLabel ? (
                      <View style={[styles.tagPill, { backgroundColor: '#F2F2F7' }]}>
                        <Text style={[styles.tagPillText, { color: '#1A2151' }]}>
                          {item.attemptLabel}
                        </Text>
                      </View>
                    ) : null}
                    {item.reviewed ? (
                      <View
                        style={[
                          styles.tagPill,
                          { backgroundColor: '#E8F8EC' },
                        ]}
                      >
                        <Text
                          style={[styles.tagPillText, { color: '#34C759' }]}
                        >
                          REVIEWED
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Title */}
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  {/* Description */}
                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.scoreText}>
                      Score: <Text style={styles.scoreValue}>{item.score ?? '–'}</Text>
                    </Text>
                    {item.reviewed ? (
                      <View style={styles.reviewedPill}>
                        <Text style={styles.reviewedPillText}>Reviewed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.reviewBtn,
                          markingId === item.id && { opacity: 0.6 },
                        ]}
                        onPress={() => handleMarkReviewed(item)}
                        disabled={markingId === item.id}
                      >
                        <Text style={styles.reviewBtnText}>
                          {markingId === item.id ? 'Marking…' : 'Mark As Reviewed'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: scale(30) },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(12),
    paddingTop: scale(14),
    gap: scale(8),
  },
  statTile: {
    width: (screenWidth - scale(24) - scale(8)) / 2,
    borderRadius: scale(14),
    padding: scale(12),
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(6),
  },
  statValueBlue: {
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#007AFF',
  },
  statValueGreen: {
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#34C759',
  },
  statValueOrange: {
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#FF9500',
  },
  statValuePurple: {
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#AF52DE',
  },
  statLabel: {
    fontSize: scale(11),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  dateLabel: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#8E8E93',
    marginHorizontal: scale(16),
    marginTop: scale(20),
    marginBottom: scale(10),
    letterSpacing: 0.8,
  },
  listContainer: {
    paddingHorizontal: scale(16),
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
  tagsRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: scale(10),
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingVertical: scale(3),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
  },
  tagPillText: {
    fontSize: scale(9),
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    marginBottom: scale(6),
  },
  cardDesc: {
    fontSize: scale(11.5),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(16),
    marginBottom: scale(12),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: scale(10),
  },
  scoreText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  scoreValue: {
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
  },
  reviewBtn: {
    backgroundColor: '#94C23C',
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
  },
  reviewBtnText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    color: colors.white,
  },
  reviewedPill: {
    backgroundColor: '#E8F8EC',
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
  },
  reviewedPillText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#34C759',
  },
  emptyContainer: {
    paddingVertical: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  emptyText: {
    fontSize: scale(14),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  emptySubText: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  plansSection: {
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  plansHeading: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    marginBottom: scale(10),
    letterSpacing: 0.3,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderLeftWidth: scale(4),
  },
  planBullet: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(10),
  },
  planTitle: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1A2151',
  },
});

export default DailyFeedbackListScreen;
