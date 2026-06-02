import React from 'react';
import { Text, View } from 'react-native';
import { describeScoreBand } from '../helpers';
import { scoreColorForBand, styles } from '../styles';
import type { PteScore } from '../types';

interface Props {
  score: PteScore;
  // Optional metadata — both rendered as a single grey line under
  // the band pill. Hidden when neither is meaningful.
  attempted: PteScore;
  total: PteScore;
  submittedAtIso: string | null;
}

// Formats a small "30 of 30 questions · Submitted Jun 1" footer when
// metadata is available. Returns null when nothing useful resolves so
// the caller can skip the row entirely (avoids an empty hanging
// margin under the band pill).
const formatMeta = (
  attempted: PteScore,
  total: PteScore,
  submittedAtIso: string | null,
): string | null => {
  const parts: string[] = [];
  if (attempted != null && total != null) {
    parts.push(`${attempted} of ${total} questions`);
  } else if (total != null) {
    parts.push(`${total} questions`);
  }
  if (submittedAtIso) {
    try {
      const d = new Date(submittedAtIso);
      parts.push(
        `Submitted ${d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`,
      );
    } catch {
      // Ignore — better to drop the date than render "Invalid Date".
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const OverallScoreCard: React.FC<Props> = ({
  score,
  attempted,
  total,
  submittedAtIso,
}) => {
  const band = describeScoreBand(score);
  const pillColor = scoreColorForBand(score);
  const meta = formatMeta(attempted, total, submittedAtIso);

  return (
    <View style={styles.overallCard}>
      <Text style={styles.overallLabel}>Overall Score</Text>
      <Text
        style={styles.overallScoreValue}
        accessibilityLabel={
          score == null
            ? 'Overall score pending'
            : `Overall score ${score} out of 90`
        }
      >
        {score == null ? '—' : score}
        {score != null && (
          <Text style={styles.overallScoreMax}> /90</Text>
        )}
      </Text>
      <View style={[styles.overallBandPill, { backgroundColor: pillColor }]}>
        <Text style={styles.overallBandPillText}>{band}</Text>
      </View>
      {meta && <Text style={styles.overallMeta}>{meta}</Text>}
    </View>
  );
};

export default OverallScoreCard;
