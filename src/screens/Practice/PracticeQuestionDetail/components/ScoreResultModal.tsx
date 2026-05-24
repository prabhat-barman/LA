import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CircularProgressBar } from '../../../../components/atoms/CircularProgressBar';
import { CloseIcon } from '../../../../components/atoms/Icon';
import { extractFeedbackText, getOverlayScoreColor, getWordColor } from '../helpers';
import { HeaderGraphIcon } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';
import type {
  OverallRawAndMax,
  ResolvedSubscore,
} from '../hooks/useScoreBreakdown';
import type { ScoreResult } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  scoreResult: ScoreResult | null;
  overallRawAndMax: OverallRawAndMax;
  overallPercentage: number;
  resolvedSubscores: ResolvedSubscore[];
  wordsListToShow: any[];
}

// Lazy-mount guard: bail out before building the (heavy) JSX subtree if the
// modal is not visible — saves rendering ~3 lists per scoreResult change.
export const ScoreResultModal: React.FC<Props> = ({
  visible,
  onClose,
  scoreResult,
  overallRawAndMax,
  overallPercentage,
  resolvedSubscores,
  wordsListToShow,
}) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderTitleBlock}>
              <View style={styles.modalHeaderIconContainer}>
                <HeaderGraphIcon size={scale(16)} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.modalTitleText}>Score Info</Text>
                <Text style={styles.modalSubtitleText}>
                  In-depth breakdown of your evaluation
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseIconBtn} onPress={onClose}>
              <CloseIcon size={scale(18)} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.topScoreInfoCard}>
              <View style={styles.topLeftProgressColumn}>
                <CircularProgressBar
                  size={scale(110)}
                  strokeWidth={scale(10)}
                  progress={overallRawAndMax.score}
                  max={overallRawAndMax.max}
                  color={getOverlayScoreColor(overallPercentage)}
                />
              </View>

              <View style={styles.topRightBreakdownColumn}>
                {resolvedSubscores.map((item, idx) => {
                  const IconComponent = item.icon;
                  return (
                    <View key={idx} style={styles.topBreakdownRow}>
                      <View style={styles.topBreakdownLabelGroup}>
                        <IconComponent color={item.color} size={scale(14)} />
                        <Text style={styles.topBreakdownLabel}>{item.name}</Text>
                      </View>
                      <Text style={styles.topBreakdownValue}>
                        {item.score}/{item.max}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsTitle}>AI ANALYTICS</Text>
              <Text style={styles.analyticsBody}>
                {extractFeedbackText(
                  scoreResult?.tutor_summary ??
                    scoreResult?.summary ??
                    scoreResult?.feedback,
                ) ||
                  'Significant improvement needed. Focus on reading every word accurately and maintaining a steady, natural pace. Your Speed was too slow, fast up and pronounce word endings clearly.'}
              </Text>
            </View>

            <View style={styles.wordHighlightCard}>
              <View style={styles.wordsListWrap}>
                {wordsListToShow.map((w, idx) => {
                  const wordText =
                    typeof w === 'string'
                      ? w
                      : typeof w?.word === 'string'
                      ? w.word
                      : String(w?.word ?? '');
                  return (
                    <Text
                      key={idx}
                      style={[styles.wordText, { color: getWordColor(w) }]}
                    >
                      {wordText}
                    </Text>
                  );
                })}
              </View>
              <View style={styles.colorGuideRow}>
                <View style={styles.guideItem}>
                  <View style={[styles.guideDot, { backgroundColor: '#34C759' }]} />
                  <Text style={styles.guideText}>Good</Text>
                </View>
                <View style={styles.guideItem}>
                  <View style={[styles.guideDot, { backgroundColor: '#FF9500' }]} />
                  <Text style={styles.guideText}>Average</Text>
                </View>
                <View style={styles.guideItem}>
                  <View style={[styles.guideDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={styles.guideText}>Needs practice</Text>
                </View>
              </View>
            </View>

            {resolvedSubscores.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <View key={idx} style={styles.detailRemarkCard}>
                  <View style={styles.detailRemarkHeader}>
                    <View
                      style={[
                        styles.detailIconBox,
                        { backgroundColor: `${item.color}1A` },
                      ]}
                    >
                      <IconComponent color={item.color} size={scale(16)} />
                    </View>
                    <View style={styles.detailRemarkTitleGroup}>
                      <Text style={styles.detailRemarkTitle}>{item.name}</Text>
                      <Text style={styles.detailRemarkDesc}>{item.description}</Text>
                    </View>
                    <Text style={styles.detailRemarkScore}>
                      {item.score}/{item.max}
                    </Text>
                  </View>

                  <View style={styles.detailRemarkDivider} />

                  <View style={styles.detailRemarkBullets}>
                    {item.remarks.map((bullet: string, bulletIdx: number) => (
                      <View key={bulletIdx} style={styles.detailBulletRow}>
                        <View
                          style={[
                            styles.detailBulletDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text style={styles.detailBulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeOverlayBtn} onPress={onClose}>
            <Text style={styles.closeOverlayBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
