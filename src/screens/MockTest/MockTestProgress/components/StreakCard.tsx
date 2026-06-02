import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';
import type { StreakSummary } from '../types';

interface Props {
  summary: StreakSummary;
}

// Human-readable phrasing for "days since last mock" — drives the
// right-tile secondary line. Same phrasing convention as the goal
// card's daysRemaining so the two cards read with one voice.
const formatDaysSince = (days: number): string => {
  if (days === 0) return 'Took one today';
  if (days === 1) return 'Last mock: yesterday';
  if (days < 7) return `Last mock: ${days} days ago`;
  if (days < 30) return `Last mock: ${Math.floor(days / 7)} weeks ago`;
  return `Last mock: ${Math.floor(days / 30)} months ago`;
};

// Streak surface. Two tiles in a row:
//   • Left  — current streak (big number + "DAY STREAK" eyebrow)
//   • Right — longest streak + "days since last mock" context
// Plus an optional nudge banner below when the streak is one day
// away from breaking.
//
// We deliberately don't hide the card when streak == 0 — showing
// "0 day streak" with a "take a mock to start one" subtitle is
// more useful (and visible-affordance) than no card at all. Users
// who never see this surface won't know the system tracks streaks.
export const StreakCard: React.FC<Props> = ({ summary }) => {
  const {
    currentStreak,
    longestStreak,
    daysSinceLastMock,
    needsTodayToExtend,
  } = summary;

  // Right tile primary line. Two states:
  //   • Has a longest streak → "Best: N days" (gives a target to beat)
  //   • Never streaked → "Best: —" (visual placeholder; signals
  //     the field exists without lying about data)
  const longestPrimary =
    longestStreak > 0
      ? `Best: ${longestStreak} day${longestStreak === 1 ? '' : 's'}`
      : 'Best: —';

  // Right tile secondary line — context about last activity.
  // Hidden when no mocks exist; otherwise routes through formatDaysSince.
  const secondaryText =
    daysSinceLastMock != null ? formatDaysSince(daysSinceLastMock) : null;

  return (
    <View style={styles.streakCard}>
      <View style={styles.streakRow}>
        <View style={styles.streakLeftTile}>
          <View style={styles.streakNumberRow}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakNumberUnit}>
              {currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <Text style={styles.streakLabel}>Current streak</Text>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakRightTile}>
          <Text style={styles.streakRightPrimary}>{longestPrimary}</Text>
          {secondaryText && (
            <Text style={styles.streakRightSecondary}>{secondaryText}</Text>
          )}
        </View>
      </View>

      {/* Nudge — only renders when the user took a mock yesterday
          (streak is alive but needs today's mock to extend).
          Soft amber, not alarming red — this is a gentle prompt,
          not an error state. */}
      {needsTodayToExtend && (
        <View style={styles.streakNudge}>
          <Text style={styles.streakNudgeText}>
            Take a mock today to keep your streak alive
          </Text>
        </View>
      )}
    </View>
  );
};

export default StreakCard;
