import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CircularProgressBar } from '../../components/atoms/CircularProgressBar';
import { TutorIcon, TipIcon, PathIcon } from '../../components/atoms/Icon';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Types ───────────────────────────────────────────────────────────────────

type RouteParams = RouteProp<RootStackParamList, 'DailyFeedbackDetail'>;

interface BulletSection {
  title: string;
  bullets: string[];
  accentColor: string;
  iconPath: string;
}

interface FeedbackDetail {
  tutorSummary: string;
  keyTip?: string;
  scorePercent?: number;
  sections: BulletSection[];
}

// Bullet dot is a plain View, not an SVG — keep it inline since there's no
// glyph to centralize.
const BulletDot = ({ color }: { color: string }) => (
  <View style={[styles.bulletDot, { backgroundColor: color }]} />
);

// SVG path data for section glyphs. Mapped per `score_type` so the detail
// screen can render any component the backend returns (Content, Fluency,
// Pronunciation, Grammar, Form, Vocabulary, Spelling).
const ICON_CONTENT = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2zM14 2v6h6M16 13H8M16 17H8M10 9H8';
const ICON_FLUENCY = 'M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9zM12 7v5l3 2';
const ICON_PRONUNCIATION = 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8';
const ICON_GRAMMAR = 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5';
const ICON_FORM = 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11';
const ICON_VOCABULARY = 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z';
const ICON_SPELLING = 'M3 21h18M7 17l5-13 5 13M9 13h6';

// `score_type` from the backend remarks catalog → display config.
const SCORE_TYPE_CONFIG: Record<
  number,
  { title: string; color: string; iconPath: string }
> = {
  0: { title: 'Content', color: '#007AFF', iconPath: ICON_CONTENT },
  1: { title: 'Fluency', color: '#FF9500', iconPath: ICON_FLUENCY },
  2: { title: 'Pronunciation', color: '#AF52DE', iconPath: ICON_PRONUNCIATION },
  3: { title: 'Overall', color: '#85B82B', iconPath: ICON_CONTENT },
  4: { title: 'Grammar', color: '#FF3B30', iconPath: ICON_GRAMMAR },
  5: { title: 'Form', color: '#34C759', iconPath: ICON_FORM },
  6: { title: 'Vocabulary', color: '#5856D6', iconPath: ICON_VOCABULARY },
  7: { title: 'Spelling', color: '#FF2D55', iconPath: ICON_SPELLING },
};

// Field name on the feedback item that holds the numeric score for a given
// `score_type`. Used when building sections from the remarks catalog so we
// can pick the right remark band for each component.
const SCORE_TYPE_FIELD: Record<number, string[]> = {
  0: ['content', 'content_score'],
  1: ['fluency', 'fluency_score'],
  2: ['pronunciation', 'pronunciation_score'],
  3: ['overall', 'total_score', 'score'],
  4: ['grammar', 'grammar_score'],
  5: ['form', 'form_score'],
  6: ['vocabulary', 'vocabulary_score'],
  7: ['spelling', 'spelling_score'],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const ensureArray = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/\n|\u2022|•|;/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === 'object') return Object.values(v).map(String).filter(Boolean);
  return [];
};

// Walk the `remarks` catalog and return all entries that match the given
// question `type` and `score_type` whose [min, max) range contains `score`.
const findRemark = (
  remarks: any[],
  questionType: number,
  scoreType: number,
  score: number,
): string | undefined => {
  if (!Array.isArray(remarks) || remarks.length === 0) return undefined;
  const matches = remarks.filter(
    (r: any) =>
      Number(r?.type) === questionType &&
      Number(r?.score_type) === scoreType &&
      Number(r?.min) <= score &&
      Number(r?.max) >= score,
  );
  // Prefer the band whose max is >= score and min is <= score; if several
  // overlap, take the most-specific (smallest span) and skip empty remarks.
  const ranked = matches
    .map((r: any) => ({ remark: String(r.remarks || '').trim(), span: r.max - r.min }))
    .filter((r) => r.remark.length > 0)
    .sort((a, b) => a.span - b.span);
  return ranked[0]?.remark;
};

// Build sections from the `remarks` catalog when the API hasn't returned a
// pre-baked content/fluency/pronunciation breakdown. We use the item's
// per-component scores to look up the corresponding tutor remark band.
const buildSectionsFromRemarks = (
  remarks: any[],
  questionTypeId: number | undefined,
  scoreBreakdown: Record<string, number> | undefined,
): BulletSection[] => {
  if (!questionTypeId || !scoreBreakdown || Object.keys(scoreBreakdown).length === 0) {
    return [];
  }
  const sections: BulletSection[] = [];
  // Iterate score types in display order so the UI stays predictable.
  const ORDER = [0, 1, 2, 4, 5, 6, 7];
  for (const scoreType of ORDER) {
    const config = SCORE_TYPE_CONFIG[scoreType];
    if (!config) continue;
    const fields = SCORE_TYPE_FIELD[scoreType] || [];
    let val: number | undefined;
    for (const f of fields) {
      if (typeof scoreBreakdown[f] === 'number') {
        val = scoreBreakdown[f];
        break;
      }
    }
    if (typeof val !== 'number') continue;
    const remark = findRemark(remarks, questionTypeId, scoreType, val);
    if (!remark) continue;
    sections.push({
      title: `${config.title} — ${val}%`,
      bullets: [remark],
      accentColor: config.color,
      iconPath: config.iconPath,
    });
  }
  return sections;
};

const extractFeedbackText = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.remarks ?? val.remark ?? val.feedback ?? val.comment ?? JSON.stringify(val);
  }
  return String(val);
};

const parseDetail = (raw: any): FeedbackDetail => {
  const summary = extractFeedbackText(
    raw?.tutor_summary ??
    raw?.tutorSummary ??
    raw?.summary ??
    raw?.feedback_summary ??
    raw?.feedback
  );
  const tipVal =
    raw?.key_tip ??
    raw?.keyTip ??
    raw?.tip ??
    raw?.daily_tip ??
    undefined;
  const tip = tipVal ? extractFeedbackText(tipVal) : undefined;
  // Score may come as 0-1 ratio, 0-100, or 0-90. Normalise to %.
  let scoreValue: number | undefined;
  const rawScore =
    raw?.score_percent ??
    raw?.percentage ??
    raw?.score ??
    raw?.total_score;
  if (rawScore !== undefined && rawScore !== null) {
    const n = Number(rawScore);
    if (!isNaN(n)) {
      if (n > 0 && n <= 1) scoreValue = Math.round(n * 100);
      else if (n > 90) scoreValue = Math.min(100, Math.round(n));
      else if (n >= 0 && n <= 90) scoreValue = Math.round((n / 90) * 100);
      else scoreValue = Math.round(n);
    }
  }

  const content =
    raw?.content ?? raw?.content_feedback ?? raw?.content_points ?? raw?.contentBullets;
  const fluency =
    raw?.fluency ?? raw?.fluency_feedback ?? raw?.fluency_points;
  const pronunciation =
    raw?.pronunciation ??
    raw?.pronunciation_feedback ??
    raw?.pronunciation_points;

  const sections: BulletSection[] = [];
  const contentBullets = ensureArray(content);
  if (contentBullets.length > 0) {
    sections.push({
      title: 'Content',
      bullets: contentBullets,
      accentColor: '#007AFF',
      iconPath: ICON_CONTENT,
    });
  }
  const fluencyBullets = ensureArray(fluency);
  if (fluencyBullets.length > 0) {
    sections.push({
      title: 'Fluency',
      bullets: fluencyBullets,
      accentColor: '#FF9500',
      iconPath: ICON_FLUENCY,
    });
  }
  const pronBullets = ensureArray(pronunciation);
  if (pronBullets.length > 0) {
    sections.push({
      title: 'Pronunciation',
      bullets: pronBullets,
      accentColor: '#AF52DE',
      iconPath: ICON_PRONUNCIATION,
    });
  }

  return {
    tutorSummary: String(summary || ''),
    keyTip: tip ? String(tip) : undefined,
    scorePercent: scoreValue,
    sections,
  };
};

// ── Screen ──────────────────────────────────────────────────────────────────

export const DailyFeedbackDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteParams>();
  const { showToast } = useToast();

  const {
    itemId,
    title,
    raw,
    questionTypeId,
    scoreBreakdown,
    remarks,
  } = (route.params ?? {}) as any;

  // Hydrate immediately from the raw payload passed via navigation params.
  // If the API returns richer data the section list is replaced. When the
  // API has no per-component breakdown but we know the question type + score
  // breakdown, we fall back to the catalog of tutor remarks shipped with the
  // DAILY_REPORT response.
  const [detail, setDetail] = useState<FeedbackDetail>(() => {
    const initial = parseDetail(raw ?? {});
    if (initial.sections.length === 0) {
      const fallback = buildSectionsFromRemarks(
        remarks || [],
        questionTypeId,
        scoreBreakdown,
      );
      if (fallback.length > 0) {
        return { ...initial, sections: fallback };
      }
    }
    return initial;
  });
  const [loading, setLoading] = useState<boolean>(!raw);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async (isPullToRefresh = false) => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    if (isPullToRefresh) setRefreshing(true); else if (!raw) setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.SINGLE_PRACTICE_DETAIL, {
        params: { id: itemId },
      });
      const data = res.data?.data ?? res.data ?? {};
      // Only overwrite if the response actually carries data we recognise.
      const next = parseDetail(data);
      // Apply the remarks-catalog fallback to the freshly-fetched data too,
      // so the user still gets per-component bullets even when the response
      // only includes the raw numeric breakdown.
      if (next.sections.length === 0) {
        const fallback = buildSectionsFromRemarks(
          remarks || [],
          questionTypeId,
          scoreBreakdown,
        );
        if (fallback.length > 0) {
          next.sections = fallback;
        }
      }
      if (
        next.tutorSummary ||
        next.sections.length > 0 ||
        next.scorePercent !== undefined
      ) {
        setDetail(next);
      }
    } catch (err: any) {
      // Be silent on first load when we already have raw data — don't show
      // a scary toast if the secondary detail fetch failed.
      if (isPullToRefresh || !raw) {
        showToast(err?.message || 'Could not load full feedback', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId, raw, questionTypeId, scoreBreakdown, remarks, showToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const scoreColor =
    typeof detail.scorePercent === 'number' && detail.scorePercent >= 60
      ? '#85B82B'
      : typeof detail.scorePercent === 'number' && detail.scorePercent >= 40
      ? '#FF9500'
      : '#FF3B30';

  return (
    <View style={styles.container}>
      <SubHeader title={title || 'Feedback'} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDetail(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Tutor Summary */}
        <View style={styles.summaryHeader}>
          <TutorIcon />
          <Text style={styles.summaryHeading}>TUTOR SUMMARY</Text>
        </View>
        {loading && !detail.tutorSummary ? (
          <View style={styles.skeletonBlock}>
            <Skeleton width="100%" height={scale(11)} />
            <Skeleton width="100%" height={scale(11)} style={{ marginTop: scale(6) }} />
            <Skeleton width="80%" height={scale(11)} style={{ marginTop: scale(6) }} />
          </View>
        ) : detail.tutorSummary ? (
          <Text style={styles.summaryText}>{detail.tutorSummary}</Text>
        ) : (
          <Text style={styles.emptyHint}>No tutor summary available for this item.</Text>
        )}

        {/* Key Tip */}
        {detail.keyTip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <TipIcon />
              <Text style={styles.tipHeaderText}>KEY TIP</Text>
            </View>
            <Text style={styles.tipText}>{detail.keyTip}</Text>
          </View>
        ) : null}

        {/* Score */}
        {typeof detail.scorePercent === 'number' ? (
          <View style={styles.scoreCard}>
            <CircularProgressBar
              progress={detail.scorePercent}
              max={100}
              color={scoreColor}
              size={scale(96)}
              strokeWidth={scale(9)}
            />
            <View style={styles.scoreCopy}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreNote}>
                {detail.scorePercent >= 70
                  ? 'Excellent work — keep this momentum.'
                  : detail.scorePercent >= 50
                  ? 'Solid effort. A few targeted tweaks will lift this further.'
                  : 'Lots of room to grow — focus on the highlighted areas below.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Sections */}
        {loading && detail.sections.length === 0 ? (
          <View style={styles.skeletonBlock}>
            <Skeleton width="40%" height={scale(13)} />
            <Skeleton width="100%" height={scale(11)} style={{ marginTop: scale(8) }} />
            <Skeleton width="92%" height={scale(11)} style={{ marginTop: scale(6) }} />
          </View>
        ) : detail.sections.length === 0 ? (
          <Text style={[styles.emptyHint, { marginTop: scale(12) }]}>
            No detailed breakdown available yet.
          </Text>
        ) : (
          detail.sections.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: `${section.accentColor}1A` }]}>
                  <PathIcon d={section.iconPath} color={section.accentColor} size={scale(16)} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.bullets.map((b, idx) => (
                <View key={`${section.title}-${idx}`} style={styles.bulletRow}>
                  <BulletDot color={section.accentColor} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(40),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  summaryHeading: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: scale(13),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(20),
    marginBottom: scale(14),
  },
  emptyHint: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(14),
  },
  tipCard: {
    backgroundColor: '#1A2151',
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(16),
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(8),
  },
  tipHeaderText: {
    fontSize: scale(10.5),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#85B82B',
    letterSpacing: 1,
  },
  tipText: {
    fontSize: scale(12.5),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Medium',
    lineHeight: scale(18),
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
    gap: scale(14),
  },
  scoreCopy: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Medium',
    marginBottom: scale(4),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scoreNote: {
    fontSize: scale(12),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(17),
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(10),
  },
  sectionIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(8),
  },
  bulletDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginTop: scale(7),
    marginRight: scale(10),
  },
  bulletText: {
    flex: 1,
    fontSize: scale(12),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },
  skeletonBlock: {
    marginBottom: scale(14),
  },
});

export default DailyFeedbackDetailScreen;
