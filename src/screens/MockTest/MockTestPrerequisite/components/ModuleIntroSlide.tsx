import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { MockSession } from '../../MockTestRunner/types';
import { buildQuestionBreakdown, formatTimeAllowed } from '../helpers';
import { styles } from '../styles';

export interface ModuleIntroSlideProps {
  session: MockSession;
  mockTitle: string;
  // This slide has no verification step — the user just reads it —
  // so it eagerly flips Next to enabled on mount. We still emit the
  // callback (rather than hardcoding `true` in the parent) so the
  // parent's gating model stays uniform across all slide kinds.
  onReadyChange: (ready: boolean) => void;
}

const ModuleIntroSlide: React.FC<ModuleIntroSlideProps> = ({
  session,
  mockTitle,
  onReadyChange,
}) => {
  // Fire ready once on mount. `onReadyChange` should be stable from
  // the parent (memoized) so this effect doesn't re-run on every
  // render.
  React.useEffect(() => {
    onReadyChange(true);
  }, [onReadyChange]);

  const breakdown = useMemo(
    () => buildQuestionBreakdown(session.questions),
    [session.questions],
  );

  const timeAllowed = useMemo(
    () => formatTimeAllowed(session.totalDurationSec),
    [session.totalDurationSec],
  );

  const footerCopy =
    session.category === 'Full Mock'
      ? 'All modules contribute to your overall PTE score.'
      : `All questions in this section contribute to your ${session.category} score.`;

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>{mockTitle}</Text>
      <Text style={styles.slideDescription}>
        This mock test will contain the following questions. Make sure you
        are in a quiet space and ready to begin — once you tap Start Test
        the timer will begin counting down.
      </Text>

      <View style={styles.introMetaBox}>
        <View style={styles.introMetaRow}>
          <Text style={styles.introMetaLabel}>Category</Text>
          <Text style={styles.introMetaValue}>{session.category}</Text>
        </View>
        <View style={styles.introMetaRow}>
          <Text style={styles.introMetaLabel}>Total questions</Text>
          <Text style={styles.introMetaValue}>{session.questions.length}</Text>
        </View>
        <View style={styles.introMetaRow}>
          <Text style={styles.introMetaLabel}>
            {session.startIndex > 0 ? 'Time remaining' : 'Time allowed'}
          </Text>
          <Text style={styles.introMetaValue}>{timeAllowed}</Text>
        </View>

        <Text style={styles.introBreakdownTitle}>Question breakdown</Text>
        {breakdown.length === 0 ? (
          <Text style={styles.introBreakdownText}>No questions available.</Text>
        ) : (
          breakdown.map(entry => (
            <View key={entry.label} style={styles.introBreakdownItem}>
              <Text style={styles.introBreakdownBullet}>○</Text>
              <Text style={styles.introBreakdownText}>
                {entry.label} ({entry.count}{' '}
                {entry.count === 1 ? 'question' : 'questions'})
              </Text>
            </View>
          ))
        )}

        <Text style={styles.introFooter}>{footerCopy}</Text>
      </View>
    </ScrollView>
  );
};

export default ModuleIntroSlide;
