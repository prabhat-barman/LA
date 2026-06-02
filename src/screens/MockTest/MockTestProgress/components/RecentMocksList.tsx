import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PastMock } from '../../MockTestResult/types';
import { colorForScore, styles } from '../styles';

interface Props {
  // Already sorted newest-first by the parent screen.
  mocks: PastMock[];
  // Max rows to render. Defaults to 10 — keeps the screen short
  // while still surfacing the user's "recent activity" without
  // forcing a navigation into the full history (Phase 5.1).
  limit?: number;
  onPress: (mock: PastMock) => void;
  // Phase 5.1 — "See all" CTA. When provided AND the dataset has
  // more than `limit` entries, the section header grows a right-
  // aligned link that opens the full paginated history. Optional
  // so other render contexts (a hypothetical future "compact"
  // embed) can suppress the affordance.
  onSeeAll?: () => void;
}

// Compact at-a-glance list of recent mocks. Each row has a
// color-coded score bar (instant visual scan for "best/worst") +
// title + meta line + numeric score.
export const RecentMocksList: React.FC<Props> = ({
  mocks,
  limit = 10,
  onPress,
  onSeeAll,
}) => {
  if (mocks.length === 0) return null;

  const visible = mocks.slice(0, limit);
  const hasMore = onSeeAll && mocks.length > limit;

  return (
    <View style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <Text style={styles.recentHeading}>Recent Activity</Text>
        {hasMore && (
          <TouchableOpacity
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel="See all mock tests"
          >
            <Text style={styles.recentSeeAll}>
              See all {mocks.length} ›
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {visible.map(mock => {
        const isPending = mock.overall == null;
        const color = colorForScore(mock.overall);
        const variantTag = mock.variant === 'extensive' ? 'Extensive' : 'Mock';
        const dateLabel = (() => {
          if (!mock.submittedAtIso) return '';
          try {
            const d = new Date(mock.submittedAtIso);
            return d.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          } catch {
            return '';
          }
        })();
        const meta = [`${variantTag} · ${mock.category}`, dateLabel]
          .filter(Boolean)
          .join(' · ');

        return (
          <TouchableOpacity
            key={`${mock.variant}-${mock.mockId}`}
            style={styles.recentRow}
            onPress={() => onPress(mock)}
            accessibilityRole="button"
            accessibilityLabel={
              isPending
                ? `${mock.title}, score pending`
                : `${mock.title}, score ${mock.overall} out of 90`
            }
          >
            <View style={[styles.recentScoreBar, { backgroundColor: color }]} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {mock.title}
              </Text>
              <Text style={styles.recentMeta} numberOfLines={1}>
                {meta}
              </Text>
            </View>
            <View style={styles.recentScoreCol}>
              {isPending ? (
                <Text style={styles.recentScorePending}>Pending</Text>
              ) : (
                <>
                  <Text style={styles.recentScore}>{mock.overall}</Text>
                  <Text style={styles.recentScoreMax}>/ 90</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default RecentMocksList;
