import React from 'react';
import { Text, View } from 'react-native';
import { subcategoryLabel } from '../helpers';
import { styles, VERDICT_COLORS } from '../styles';
import type { QuestionAnalysis, QuestionVerdict } from '../types';

interface Props {
  entry: QuestionAnalysis;
}

const VERDICT_LABEL: Record<NonNullable<QuestionVerdict>, string> = {
  correct: 'Correct',
  partial: 'Partial',
  incorrect: 'Incorrect',
};

// Pulls the appropriate { bg, text } palette for the row's status
// header pill. We use the verdict directly when present, falling
// back to `pending` for unscored / free-response items so the pill
// still renders (and reads "Scored" when score data exists).
const pillPaletteForRow = (entry: QuestionAnalysis) => {
  if (entry.verdict) return VERDICT_COLORS[entry.verdict];
  // No verdict but a numeric score => free-response item that's
  // been graded; show a neutral "Scored" pill rather than a verdict.
  if (entry.score != null) return VERDICT_COLORS.pending;
  return VERDICT_COLORS.pending;
};

const pillLabelForRow = (entry: QuestionAnalysis): string => {
  if (entry.verdict) return VERDICT_LABEL[entry.verdict];
  if (entry.score != null) return 'Scored';
  return 'Pending';
};

// Trims displayable text for the user/correct answer rows. Caps each
// to 200 chars — long Writing essays would push everything below the
// fold otherwise. The full text is always available through the
// raw-response debug sheet.
const trim = (text: string | null, max = 200): string | null => {
  if (text == null) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
};

export const QuestionAnalysisCard: React.FC<Props> = ({ entry }) => {
  const palette = pillPaletteForRow(entry);
  const pillLabel = pillLabelForRow(entry);
  const typeLabel = subcategoryLabel(entry.subcategoryId);
  const trimmedTitle = trim(entry.title, 140);
  const trimmedUser = trim(entry.userAnswer);
  const trimmedCorrect = trim(entry.correctAnswer);
  const hasAnswerBlock = trimmedUser != null || trimmedCorrect != null;
  const hasComponents = entry.componentScores.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTypeRow}>
          <Text style={styles.cardQuestionNumber}>Q{entry.questionNumber}</Text>
          <Text style={styles.cardTypeLabel} numberOfLines={1}>
            {typeLabel}
          </Text>
        </View>
        <View style={[styles.verdictPill, { backgroundColor: palette.bg }]}>
          <Text style={[styles.verdictPillText, { color: palette.text }]}>
            {pillLabel}
          </Text>
        </View>
      </View>

      <View style={styles.cardScoreRow}>
        <Text
          style={[
            styles.cardScoreValue,
            entry.score == null && styles.cardScorePending,
          ]}
          accessibilityLabel={
            entry.score == null
              ? 'Score pending'
              : `Score ${entry.score} out of ${entry.maxScore ?? 'unknown'}`
          }
        >
          {entry.score == null ? '—' : entry.score}
        </Text>
        {entry.score != null && entry.maxScore != null && (
          <Text style={styles.cardScoreMax}>/ {entry.maxScore}</Text>
        )}
      </View>

      {trimmedTitle && (
        <Text style={styles.cardTitle} numberOfLines={3}>
          {trimmedTitle}
        </Text>
      )}

      {hasAnswerBlock && (
        <>
          {trimmedUser != null && (
            <View style={styles.answerBlock}>
              <Text style={styles.answerLabel}>Your answer</Text>
              <Text style={styles.answerText}>{trimmedUser}</Text>
            </View>
          )}
          {trimmedCorrect != null && (
            <View style={[styles.answerBlock, styles.answerBlockCorrect]}>
              <Text style={styles.answerLabel}>Correct answer</Text>
              <Text style={styles.answerText}>{trimmedCorrect}</Text>
            </View>
          )}
        </>
      )}

      {hasComponents && (
        <>
          <View style={styles.componentsDivider} />
          <Text style={styles.componentsLabel}>Score breakdown</Text>
          {entry.componentScores.map((comp, idx) => (
            <View key={`${comp.name}-${idx}`} style={styles.componentRow}>
              <Text style={styles.componentName} numberOfLines={1}>
                {comp.name}
              </Text>
              <Text
                style={[
                  styles.componentScore,
                  comp.score == null && styles.componentScorePending,
                ]}
              >
                {comp.score == null ? '—' : comp.score} / {comp.max}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

export default QuestionAnalysisCard;
