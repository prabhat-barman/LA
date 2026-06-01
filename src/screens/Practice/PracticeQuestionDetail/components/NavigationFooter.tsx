import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  hasRecording: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onShowScore?: () => void;
  // Label shown on the submit button after submission. Defaults to
  // "Score Info" (re-opens score modal). Pass "Submitted" for flows like
  // MCQ that don't have a re-openable result screen.
  submittedLabel?: string;
  // When true, the submitted-state button is rendered as a static label
  // (no press handler) – used for MCQ where there's nothing to reopen.
  submittedReadOnly?: boolean;
}

// Submit button has three visual states:
//   1. Idle / disabled - no recording yet (greyed out)
//   2. Active green   - recording present, ready to submit
//   3. Submitted      - score already received for this question, becomes clickable "Score Info"
export const NavigationFooter: React.FC<Props> = ({
  isFirst,
  isLast,
  hasRecording,
  isSubmitting,
  hasSubmitted,
  onPrev,
  onNext,
  onSubmit,
  onShowScore,
  submittedLabel = 'Score Info',
  submittedReadOnly = false,
}) => {
  const insets = useSafeAreaInsets();
  const isDisabled = isSubmitting || (!hasSubmitted && !hasRecording);
  const submittedTapHandler = submittedReadOnly ? undefined : onShowScore;
  return (
    <View style={[styles.navigationFooter, { paddingBottom: insets.bottom, height: scale(64) + insets.bottom }]}>
      <TouchableOpacity
        style={[styles.navFooterOutlineBtn, isFirst && styles.navFooterOutlineBtnDisabled]}
        onPress={onPrev}
        disabled={isFirst}
      >
        <ChevronLeftIcon
          size={scale(14)}
          color={isFirst ? '#C8C7CC' : '#48484A'}
          strokeWidth={3}
        />
        <Text style={[styles.navFooterOutlineText, isFirst && styles.navFooterOutlineTextDisabled]}>
          Previous
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navFooterSubmitBtn,
          !hasSubmitted && isDisabled && styles.navFooterSubmitBtnDisabled,
          hasSubmitted && styles.navFooterSubmitBtnSubmitted,
        ]}
        onPress={hasSubmitted ? submittedTapHandler : onSubmit}
        disabled={(!hasSubmitted && isDisabled) || (hasSubmitted && submittedReadOnly)}
        activeOpacity={0.7}
      >
        {hasSubmitted ? (
          <View style={styles.navFooterSubmitContent}>
            <Text style={styles.navFooterSubmitText}>{submittedLabel}</Text>
          </View>
        ) : (
          <Text style={styles.navFooterSubmitText}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navFooterOutlineBtn, isLast && styles.navFooterOutlineBtnDisabled]}
        onPress={onNext}
        disabled={isLast}
      >
        <Text style={[styles.navFooterOutlineText, isLast && styles.navFooterOutlineTextDisabled]}>
          Next
        </Text>
        <ChevronRightIcon
          size={scale(14)}
          color={isLast ? '#C8C7CC' : '#48484A'}
          strokeWidth={3}
        />
      </TouchableOpacity>
    </View>
  );
};
