import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { SubHeader } from '../../components/molecules/SubHeader';
import { API_ENDPOINTS } from '../../config/apiConfig';
import apiClient from '../../services/apiClient';
import { logger } from '../../services/logger';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import {
  DAILY_GOAL_SKILLS,
  type DailyGoalSkill,
  SKILL_LABELS,
} from '../DailyGoals/types';

const { width } = Dimensions.get('window');
const scale = (s: number) => (width / 375) * s;

interface DaySummary {
  total: number;
  perSkill: Partial<Record<DailyGoalSkill, number>>;
}

// One row in the per-question-type breakdown. `count` is normalised
// across the heterogeneous shapes the `practiceDetail` endpoint can
// emit (number, `{attempt}`, `{total}`, array length…).
interface PerTypeRow {
  questionTypeId: string;
  count: number;
}

const todayApi = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// `practiceDetail` keys days as `dd-mm-yyyy`; the calendar's
// selected value is the api-shaped `yyyy-mm-dd`. Two formats
// because that's what the backend ships, not a design choice.
const apiToDetailKey = (apiDate: string): string => {
  const [y, m, d] = apiDate.split('-');
  if (!y || !m || !d) return apiDate;
  return `${d}-${m}-${y}`;
};

// Friendly labels for the 22 question-type ids the practice detail
// endpoint returns. Mirrors the legacy app's `baseDailyTasksItems`
// table. Unknown ids fall back to "Type {id}" so the UI never
// crashes on new question categories.
const QUESTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Read Aloud',
  '2': 'Repeat Sentence',
  '3': 'Describe Image',
  '4': 'Re-tell Lecture',
  '5': 'Answer Short Questions',
  '6': 'Summarize Written Text',
  '7': 'Write Essay',
  '8': 'Reading MCQ Single',
  '9': 'Reading MCQ Multiple',
  '10': 'Re-order Paragraphs',
  '11': 'Reading FIB',
  '12': 'R&W FIB',
  '13': 'Summarize Spoken Text',
  '14': 'Listening MCQ Single',
  '15': 'Listening MCQ Multiple',
  '16': 'Listening FIB',
  '17': 'Highlight Correct Summary',
  '18': 'Select Missing Word',
  '19': 'Highlight Incorrect Words',
  '20': 'Write From Dictation',
  '21': 'Respond to Situation',
  '22': 'Summarize Group Discussion',
};

// `practiceDetail` payloads are shaped inconsistently — sometimes a
// raw count, sometimes a record with `attempt`/`total` keys,
// sometimes a list of attempts. This unwraps them all to a single
// integer.
const normaliseCount = (raw: unknown): number => {
  if (typeof raw === 'number') return raw;
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.attempt === 'number') return obj.attempt;
    if (typeof obj.total === 'number') return obj.total;
    if (typeof obj.count === 'number') return obj.count;
    return Object.keys(obj).length;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

// Pull a single day's report. Same endpoint the Daily Goals screen
// uses — re-queried per selected date.
const fetchDay = async (date: string): Promise<DaySummary> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.DAILY_REPORT, {
      params: { date },
    });
    const payload = res.data?.data ?? res.data ?? {};
    const data = (payload?.data && typeof payload.data === 'object'
      ? payload.data
      : {}) as Record<string, unknown>;
    const perSkill: Partial<Record<DailyGoalSkill, number>> = {};
    let total = 0;
    for (const skill of DAILY_GOAL_SKILLS) {
      const n = Number(data[skill]) || 0;
      perSkill[skill] = n;
      total += n;
    }
    return { total, perSkill };
  } catch (err) {
    logger.warn('[PracticeHistory] fetchDay failed', err);
    return { total: 0, perSkill: {} };
  }
};

// Per-question-type breakdown via the legacy `practiceDetail`
// endpoint. The returned shape is
//   { data: { "<dd-mm-yyyy>": { "<questionTypeId>": <count|obj|array> } } }
// We tolerate variations and silently swallow failures — the
// breakdown is a nice-to-have on top of the DAILY_REPORT summary.
const fetchPerType = async (apiDate: string): Promise<PerTypeRow[]> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.PRACTICE_DETAIL, {
      params: { date: apiDate },
    });
    const root = res.data?.data ?? res.data ?? {};
    const detailKey = apiToDetailKey(apiDate);
    const dayBucket = (root as Record<string, unknown>)[detailKey];
    if (!dayBucket || typeof dayBucket !== 'object') return [];
    const rows: PerTypeRow[] = [];
    for (const [questionTypeId, raw] of Object.entries(
      dayBucket as Record<string, unknown>,
    )) {
      const count = normaliseCount(raw);
      if (count > 0) rows.push({ questionTypeId, count });
    }
    rows.sort((a, b) => b.count - a.count);
    return rows;
  } catch (err) {
    logger.warn('[PracticeHistory] fetchPerType failed', err);
    return [];
  }
};

export const PracticeHistoryCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<string>(() => todayApi());
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [perType, setPerType] = useState<PerTypeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [day, types] = await Promise.all([
        fetchDay(selected),
        fetchPerType(selected),
      ]);
      if (!cancelled) {
        setSummary(day);
        setPerType(types);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelected(day.dateString);
  }, []);

  const marked = useMemo(() => {
    return {
      [selected]: {
        selected: true,
        selectedColor: '#007AFF',
      },
    };
  }, [selected]);

  const niceDate = useMemo(() => {
    const d = new Date(selected);
    if (Number.isNaN(d.getTime())) return selected;
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selected]);

  return (
    <View style={styles.container}>
      <SubHeader
        title="Practice History"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Calendar
          current={selected}
          markedDates={marked}
          onDayPress={handleDayPress}
          // Past dates only — the user can't have practised in the
          // future, and the calendar otherwise lets you scroll into
          // months that will never have any data.
          maxDate={todayApi()}
          theme={{
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
          }}
          style={styles.calendar}
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{niceDate}</Text>
          {loading ? (
            <ActivityIndicator color="#007AFF" style={{ marginVertical: scale(14) }} />
          ) : summary && summary.total > 0 ? (
            <>
              <Text style={styles.summaryTotal}>
                {summary.total} {summary.total === 1 ? 'attempt' : 'attempts'}
              </Text>
              {DAILY_GOAL_SKILLS.map(skill => {
                const n = summary.perSkill[skill] ?? 0;
                if (n === 0) return null;
                return (
                  <View key={skill} style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>
                      {SKILL_LABELS[skill]}
                    </Text>
                    <Text style={styles.summaryRowValue}>{n}</Text>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.summaryEmpty}>
              No practice activity on this day.
            </Text>
          )}
        </View>

        {!loading && perType.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>By question type</Text>
            {perType.map(row => (
              <View key={row.questionTypeId} style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>
                  {QUESTION_TYPE_LABELS[row.questionTypeId] ??
                    `Type ${row.questionTypeId}`}
                </Text>
                <Text style={styles.summaryRowValue}>{row.count}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PracticeHistoryCalendarScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: scale(40),
  },
  calendar: {
    margin: scale(12),
  },
  summaryCard: {
    marginHorizontal: scale(16),
    marginBottom: scale(12),
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#1C1F2A',
    marginBottom: scale(8),
  },
  summaryTotal: {
    fontSize: scale(13),
    color: '#48484A',
    marginBottom: scale(10),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(4),
  },
  summaryRowLabel: {
    fontSize: scale(13),
    color: '#1C1F2A',
  },
  summaryRowValue: {
    fontSize: scale(13),
    color: '#48484A',
    fontWeight: '700',
  },
  summaryEmpty: {
    fontSize: scale(12),
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: scale(10),
  },
});
