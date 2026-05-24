import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  computeOverallPercent,
  computeOverallRaw,
  formatAttemptDate,
  getAttemptAudioFile,
  getAttemptUserName,
  getOverlayScoreColor,
  getSubscoreByType,
  resolveSubscore,
} from '../helpers';
import { PlayGlyph, StopGlyph } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';

interface AttemptItemProps {
  attempt: any;
  isOthers?: boolean;
  isThisPlaying?: boolean;
  onToggleAudio?: (attempt: any) => void;
}

interface MemoizedAttemptsListProps {
  attempts: any[];
  isOthers?: boolean;
  playingAttemptId?: string | number | null;
  isAttemptPlaying?: boolean;
  onToggleAttemptAudio?: (attempt: any) => void;
}

// Small inline play/stop button used inside an attempt row. Renders nothing
// when the attempt has no associated recording file.
const AttemptAudioButton: React.FC<{
  hasFile: boolean;
  isPlaying: boolean;
  onPress: () => void;
}> = ({ hasFile, isPlaying, onPress }) => {
  if (!hasFile) return null;
  return (
    <TouchableOpacity
      style={[styles.attemptPlayBtn, isPlaying && styles.attemptPlayBtnActive]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Stop attempt audio' : 'Play attempt audio'}
    >
      {isPlaying ? <StopGlyph size={scale(10)} /> : <PlayGlyph size={scale(10)} />}
    </TouchableOpacity>
  );
};

const AttemptItem = React.memo(
  ({ attempt, isOthers, isThisPlaying, onToggleAudio }: AttemptItemProps) => {
    const flatOverall =
      attempt.score_percent ?? attempt.percentage ?? attempt.overall_score;
    const aPercent =
      typeof flatOverall === 'number' && !isNaN(flatOverall)
        ? Math.round(flatOverall)
        : computeOverallPercent(attempt.score);
    const aRaw =
      typeof flatOverall === 'number' && !isNaN(flatOverall)
        ? Math.round((flatOverall / 100) * 90)
        : computeOverallRaw(attempt.score);

    const contentScore =
      getSubscoreByType(attempt.score, 0) || resolveSubscore(attempt.content);
    const fluencyScore =
      getSubscoreByType(attempt.score, 1) || resolveSubscore(attempt.fluency);
    const pronScore =
      getSubscoreByType(attempt.score, 2) ||
      resolveSubscore(attempt.pronunciation);
    const aDate = formatAttemptDate(attempt.created_at ?? attempt.date);

    const audioFile = getAttemptAudioFile(attempt);
    const hasAudioFile = Boolean(audioFile);
    const handlePlay = () => onToggleAudio?.(attempt);

    // Right-side controls (play + score badge) rendered as a tight
    // cluster so they read as a single unit instead of two separate
    // floating elements scattered across the row.
    const rightCluster = (
      <View style={styles.attemptRightCluster}>
        <AttemptAudioButton
          hasFile={hasAudioFile}
          isPlaying={!!isThisPlaying}
          onPress={handlePlay}
        />
        <View
          style={[
            styles.attemptScoreBadge,
            { backgroundColor: getOverlayScoreColor(aPercent) },
          ]}
        >
          <Text style={styles.attemptScoreBadgeText}>{aRaw}</Text>
        </View>
      </View>
    );

    if (isOthers) {
      const attemptName = getAttemptUserName(attempt.user);
      return (
        <View style={styles.attemptLogItem}>
          <View style={styles.attemptLogItemMain}>
            <Text style={styles.attemptDate}>
              {attemptName} — {aDate}
            </Text>
            <Text style={styles.attemptSubscores}>
              C: {contentScore} | F: {fluencyScore} | P: {pronScore}
            </Text>
          </View>
          {rightCluster}
        </View>
      );
    }

    return (
      <View style={styles.attemptLogItem}>
        <View style={styles.attemptLogItemMain}>
          <Text style={styles.attemptDate}>{aDate}</Text>
          <Text style={styles.attemptSubscores}>
            C: {contentScore} | F: {fluencyScore} | P: {pronScore}
          </Text>
        </View>
        {rightCluster}
      </View>
    );
  },
);
AttemptItem.displayName = 'AttemptItem';

// Page size for the inline "Show More" pager. We don't use a real
// FlatList here because this list renders inside the parent screen's
// ScrollView and nesting a FlatList would either fight virtualization
// or trigger the well-known warning. The .map() pattern is correct
// for embedded short lists; the optimisations below ensure
// AttemptItem rows only re-render when their actual data changes.
const INITIAL_PAGE_SIZE = 10;
const PAGE_INCREMENT = 20;

export const MemoizedAttemptsList = React.memo(
  ({
    attempts,
    isOthers,
    playingAttemptId,
    isAttemptPlaying,
    onToggleAttemptAudio,
  }: MemoizedAttemptsListProps) => {
    const [limit, setLimit] = useState(INITIAL_PAGE_SIZE);

    // Reset paging when the list identity changes (switch tab / question).
    useEffect(() => {
      setLimit(INITIAL_PAGE_SIZE);
    }, [attempts]);

    // Stable `Show More` handler so the TouchableOpacity below doesn't
    // get a new function reference on every parent re-render.
    const handleLoadMore = useCallback(() => {
      setLimit(prev => prev + PAGE_INCREMENT);
    }, []);

    // Memoize the visible slice + per-row playback flag so AttemptItem
    // (already React.memo'd) sees stable props and skips re-rendering
    // for unrelated state changes (e.g. other rows toggling).
    const visibleAttempts = useMemo(
      () => attempts.slice(0, limit),
      [attempts, limit],
    );

    if (attempts.length === 0) {
      return (
        <Text style={styles.noAttemptsText}>
          {isOthers ? 'No attempts from other students.' : 'No previous attempts recorded.'}
        </Text>
      );
    }

    return (
      <>
        {visibleAttempts.map((attempt, index) => {
          const aFile = getAttemptAudioFile(attempt);
          const aId = attempt?.id ?? aFile ?? index;
          const isThisPlaying =
            !!isAttemptPlaying &&
            playingAttemptId != null &&
            (playingAttemptId === attempt?.id || playingAttemptId === aFile);
          return (
            <AttemptItem
              key={aId}
              attempt={attempt}
              isOthers={isOthers}
              isThisPlaying={isThisPlaying}
              onToggleAudio={onToggleAttemptAudio}
            />
          );
        })}
        {attempts.length > limit && (
          <TouchableOpacity
            style={styles.loadMoreAttemptsBtn}
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreAttemptsText}>
              Show More Attempts ({attempts.length - limit} remaining)
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
);
MemoizedAttemptsList.displayName = 'MemoizedAttemptsList';
