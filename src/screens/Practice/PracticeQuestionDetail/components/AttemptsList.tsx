import React, { useEffect, useState } from 'react';
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
    }

    return (
      <View style={styles.attemptLogItem}>
        <View style={styles.attemptLogItemMain}>
          <Text style={styles.attemptDate}>{aDate}</Text>
          <Text style={styles.attemptSubscores}>
            C: {contentScore} | F: {fluencyScore} | P: {pronScore}
          </Text>
        </View>
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
  },
);
AttemptItem.displayName = 'AttemptItem';

export const MemoizedAttemptsList = React.memo(
  ({
    attempts,
    isOthers,
    playingAttemptId,
    isAttemptPlaying,
    onToggleAttemptAudio,
  }: MemoizedAttemptsListProps) => {
    const [limit, setLimit] = useState(10);

    // Reset paging when the list identity changes (switch tab / question).
    useEffect(() => {
      setLimit(10);
    }, [attempts]);

    if (attempts.length === 0) {
      return (
        <Text style={styles.noAttemptsText}>
          {isOthers ? 'No attempts from other students.' : 'No previous attempts recorded.'}
        </Text>
      );
    }

    const visibleAttempts = attempts.slice(0, limit);

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
            onPress={() => setLimit(prev => prev + 20)}
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
