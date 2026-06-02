import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { logger } from '../../../services/logger';
import type { MockSection } from '../MockTestRunner/types';
import { QuestionAnalysisCard } from './components/QuestionAnalysisCard';
import { RawResponseSheet } from './components/RawResponseSheet';
import { SectionGroupHeader } from './components/SectionGroupHeader';
import { useMockAnalysis } from './hooks/useMockAnalysis';
import { styles } from './styles';
import type { QuestionAnalysis } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'MockTestAnalysis'>;

// Canonical section order — drives the order of SectionList sections
// so Full Mocks always read Speaking → Writing → Reading → Listening
// regardless of how the backend ordered the questions array.
const SECTION_ORDER: MockSection[] = [
  'Speaking',
  'Writing',
  'Reading',
  'Listening',
];

interface SectionListData {
  title: MockSection;
  data: QuestionAnalysis[];
}

// Per-question analysis screen. Mounted from the result screen's
// "Question Breakdown" CTA. SectionList over the normalized data
// gives us free section grouping + good performance for the 75-ish
// items a Full Mock can produce.
export const MockTestAnalysisScreen: React.FC<Props> = () => {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const insets = useSafeAreaInsets();

  const { mockId, variant, category, title: routeTitle } = route.params;

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useMockAnalysis({ mockId });

  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Group questions by section. We pre-sort the normalizer's output
  // by questionNumber, so the grouped order also reads as test
  // order within each section.
  const sections: SectionListData[] = useMemo(() => {
    const list = data?.questions ?? [];
    if (list.length === 0) return [];
    const buckets = new Map<MockSection, QuestionAnalysis[]>();
    for (const q of list) {
      const arr = buckets.get(q.section) ?? [];
      arr.push(q);
      buckets.set(q.section, arr);
    }
    return SECTION_ORDER.filter(s => buckets.has(s)).map(s => ({
      title: s,
      data: buckets.get(s) ?? [],
    }));
  }, [data]);

  const subtitleParts: string[] = [];
  subtitleParts.push(variant === 'full' ? 'Full Mock' : 'Extensive Mock');
  if (category !== 'Full Mock') subtitleParts.push(category);
  subtitleParts.push(`#${mockId}`);
  const subtitle = subtitleParts.join(' · ');

  const handleTitleLongPress = () => {
    logger.info('[MockTestAnalysis] raw payload inspector opened', {
      mockId,
      hasData: !!data,
      questionCount: data?.questions.length ?? 0,
    });
    setIsDebugOpen(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2151" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to result"
          >
            <Text style={styles.headerBackBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            onLongPress={handleTitleLongPress}
            delayLongPress={800}
            accessibilityRole="header"
            accessibilityLabel="Question Breakdown"
            accessibilityHint="Long press to inspect the raw API response"
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {routeTitle ?? 'Question Breakdown'}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRightSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1A2151" />
          <Text style={styles.centerStateTitle}>Loading your breakdown…</Text>
          <Text style={styles.centerStateSubtitle}>
            Pulling per-question scores from the server.
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.centerStateTitle}>
            We couldn&apos;t load the breakdown
          </Text>
          <Text style={styles.centerStateSubtitle}>
            {error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.centerStateBtn}
            onPress={() => {
              refetch().catch(() => {});
            }}
            disabled={isRefetching}
            accessibilityRole="button"
            accessibilityLabel="Retry loading the breakdown"
          >
            <Text style={styles.centerStateBtnText}>
              {isRefetching ? 'Retrying…' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.centerStateTitle}>No breakdown available</Text>
          <Text style={styles.centerStateSubtitle}>
            We received a response from the server but couldn&apos;t parse a
            per-question breakdown out of it. Long-press the title to inspect
            the raw payload.
          </Text>
        </View>
      ) : (
        <SectionList<QuestionAnalysis, SectionListData>
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <QuestionAnalysisCard entry={item} />}
          renderSectionHeader={({ section }) => (
            <SectionGroupHeader section={section.title} count={section.data.length} />
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          // Modest initial batch keeps first-paint fast even on a
          // 75-question Full Mock; the rest stream in on scroll.
          initialNumToRender={8}
          windowSize={6}
        />
      )}

      {isDebugOpen && data && (
        <RawResponseSheet
          payload={data.raw}
          onClose={() => setIsDebugOpen(false)}
        />
      )}
    </View>
  );
};

export default MockTestAnalysisScreen;
