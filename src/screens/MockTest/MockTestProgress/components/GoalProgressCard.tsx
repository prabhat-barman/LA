import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colorForScore, styles } from '../styles';
import type { GoalProgress } from '../types';

interface Props {
  // Null = no goal set. The card renders an empty-state CTA.
  // Non-null = an active goal; the card renders the progress
  // breakdown + actions.
  progress: GoalProgress | null;
  onSetGoal: () => void;
  onEditGoal: () => void;
}

// Format the deadline date the same way the modal does so what the
// user picks is what the user sees. Defensive against an
// unparseable ISO (returns empty string — the surrounding sentence
// still reads okay without it).
const formatDeadline = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Human-readable countdown. "Today" / "Tomorrow" beat raw numerics
// when we're near the deadline; "8 weeks" beats "56 days" once the
// gap is large enough to matter. Negative values get a "ago" suffix
// so the user sees the deadline already slipped (only rendered in
// the expired state — achieved goals hide this entirely since the
// deadline is no longer interesting).
const formatDaysRemaining = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  if (days === -1) return '1 day ago';
  if (days > 0) {
    if (days < 14) return `${days} days left`;
    return `${Math.floor(days / 7)} weeks left`;
  }
  // days < -1
  const ago = Math.abs(days);
  if (ago < 14) return `${ago} days ago`;
  return `${Math.floor(ago / 7)} weeks ago`;
};

export const GoalProgressCard: React.FC<Props> = ({
  progress,
  onSetGoal,
  onEditGoal,
}) => {
  // ── Empty state ─────────────────────────────────────────────────
  // No goal set yet — show a single CTA that opens the set-goal
  // modal. Same card chrome as the active state so the dashboard's
  // visual rhythm stays consistent.
  if (!progress) {
    return (
      <View style={styles.goalCard}>
        <Text style={styles.goalEyebrow}>Goal</Text>
        <Text style={styles.goalEmptyTitle}>Set a target score</Text>
        <Text style={styles.goalEmptySubtitle}>
          Pick a target score and a deadline. We&apos;ll track how close
          you are after every graded mock.
        </Text>
        <TouchableOpacity
          style={styles.goalSetCta}
          onPress={onSetGoal}
          accessibilityRole="button"
          accessibilityLabel="Set a goal"
        >
          <Text style={styles.goalSetCtaText}>Set a goal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Active states ───────────────────────────────────────────────
  const {
    goal,
    currentScore,
    pointsToGoal,
    isAchieved,
    daysRemaining,
    isExpired,
    progressRatio,
  } = progress;

  const fillColor = colorForScore(currentScore);
  // Progress bar width — at least 4% so the fill is always visible
  // (otherwise a "0 score" goal looks like the bar is broken).
  // Typed as `DimensionValue` so RN accepts the template-literal
  // percent without an `@ts-ignore`. The pct-string union RN exports
  // is `${number}%`, which a `Math.max` result doesn't narrow to —
  // the cast bridges that.
  const fillWidthPct =
    `${Math.max(4, (progressRatio ?? 0.04) * 100)}%` as `${number}%`;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalActiveHeader}>
        <View style={styles.goalActiveHeaderText}>
          <Text style={styles.goalEyebrow}>Goal</Text>
          <Text style={styles.goalTarget}>
            Target {goal.targetScore}
          </Text>
          <Text style={styles.goalDeadline}>
            by {formatDeadline(goal.targetDateIso)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.goalEditBtn}
          onPress={onEditGoal}
          accessibilityRole="button"
          accessibilityLabel="Edit goal"
        >
          <Text style={styles.goalEditBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.goalProgressBarTrack}>
        <View
          style={[
            styles.goalProgressBarFill,
            { width: fillWidthPct, backgroundColor: fillColor },
          ]}
        />
      </View>

      <View style={styles.goalProgressRow}>
        {currentScore != null ? (
          <View style={styles.goalProgressCurrentRow}>
            <Text style={styles.goalProgressCurrent}>{currentScore}</Text>
            <Text style={styles.goalProgressOfTarget}>
              / {goal.targetScore}
            </Text>
          </View>
        ) : (
          <Text style={styles.goalNoScoreText}>
            Take a mock to see progress
          </Text>
        )}

        <View style={styles.goalProgressMetaCol}>
          {currentScore != null && !isAchieved && (
            <Text
              style={[styles.goalProgressMetaPrimary, { color: fillColor }]}
            >
              {pointsToGoal} pt{pointsToGoal === 1 ? '' : 's'} to go
            </Text>
          )}
          <Text style={styles.goalProgressMetaSecondary}>
            {formatDaysRemaining(daysRemaining)}
          </Text>
        </View>
      </View>

      {isAchieved && (
        <View style={styles.goalAchievedBadge}>
          <Text style={styles.goalAchievedBadgeText}>Goal reached</Text>
        </View>
      )}

      {isExpired && (
        <View style={styles.goalExpiredBadge}>
          <Text style={styles.goalExpiredBadgeText}>
            Deadline passed — tap Edit to extend
          </Text>
        </View>
      )}
    </View>
  );
};

export default GoalProgressCard;
