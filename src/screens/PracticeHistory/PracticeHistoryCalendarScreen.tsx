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

const todayApi = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export const PracticeHistoryCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<string>(() => todayApi());
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = await fetchDay(selected);
      if (!cancelled) {
        setSummary(next);
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
