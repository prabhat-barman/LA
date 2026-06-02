import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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
import { EnablingSkillsCard } from './components/EnablingSkillsCard';
import { OverallScoreCard } from './components/OverallScoreCard';
import { RawResponseSheet } from './components/RawResponseSheet';
import { SectionScoreCard } from './components/SectionScoreCard';
import { useMockResult } from './hooks/useMockResult';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'MockTestResult'>;

// Mock-test result screen. Mounted by the runner after a successful
// finalize (replaces the runner in the nav stack so back-swipe goes
// to the mock-test list, not back into the now-stale runner).
//
// Three render branches:
//   • loading  → spinner + headline
//   • error    → friendly message + Retry CTA
//   • content  → overall score + section breakdown + enabling skills
//
// The header title is long-pressable to surface the raw API response
// — undocumented developer affordance for debugging unfamiliar
// payload shapes without rebuilding the app.
export const MockTestResultScreen: React.FC<Props> = () => {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const insets = useSafeAreaInsets();

  const { mockId, variant, category, title: routeTitle } = route.params;

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useMockResult({
      mockId,
      variant,
      category,
      fallbackTitle: routeTitle,
    });

  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const subtitleParts: string[] = [];
  subtitleParts.push(variant === 'full' ? 'Full Mock' : 'Extensive Mock');
  if (category !== 'Full Mock') subtitleParts.push(category);
  subtitleParts.push(`#${mockId}`);
  const subtitle = subtitleParts.join(' · ');

  const headerTitle = data?.title ?? routeTitle ?? subtitle;

  // Long-press on the header title opens the raw payload inspector.
  // We log the trigger so devs can correlate against backend logs
  // when reviewing screenshots from users / QA.
  const handleTitleLongPress = () => {
    logger.info('[MockTestResult] raw payload inspector opened', {
      mockId,
      hasData: !!data,
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
            accessibilityLabel="Back to mock tests"
          >
            <Text style={styles.headerBackBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            onLongPress={handleTitleLongPress}
            delayLongPress={800}
            accessibilityRole="header"
            accessibilityLabel={headerTitle}
            accessibilityHint="Long press to inspect the raw API response"
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRightSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1A2151" />
          <Text style={styles.centerStateTitle}>Loading your result…</Text>
          <Text style={styles.centerStateSubtitle}>
            Grading can take a moment after a mock test is submitted.
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.centerStateTitle}>We couldn&apos;t load your result</Text>
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
            accessibilityLabel="Retry loading the result"
          >
            <Text style={styles.centerStateBtnText}>
              {isRefetching ? 'Retrying…' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <OverallScoreCard
            score={data.overall}
            attempted={data.attemptedQuestions}
            total={data.totalQuestions}
            submittedAtIso={data.submittedAtIso}
          />
          <SectionScoreCard sections={data.sections} />
          <EnablingSkillsCard skills={data.enablingSkills} />
          {/* Drill-in to the per-question analysis. `navigate` (NOT
              replace) — the user expects back-swipe to return to the
              overall score, then again to the mock list. */}
          <TouchableOpacity
            style={styles.breakdownBtn}
            onPress={() =>
              navigation.navigate('MockTestAnalysis', {
                mockId,
                variant,
                category,
                title: data.title,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="View per-question breakdown"
            accessibilityHint="Opens a list of every question with the score, your answer, and the correct answer"
          >
            <Text style={styles.breakdownBtnText}>Question Breakdown</Text>
            <Text style={styles.breakdownBtnArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Done — back to mock tests"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {isDebugOpen && data && (
        <RawResponseSheet
          payload={data.raw}
          onClose={() => setIsDebugOpen(false)}
        />
      )}
    </View>
  );
};

export default MockTestResultScreen;
