import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckIcon,
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
}

// Submit button has three visual states:
//   1. Idle / disabled - no recording yet (greyed out)
//   2. Active green   - recording present, ready to submit
//   3. Submitted      - score already received for this question
export const NavigationFooter: React.FC<Props> = ({
  isFirst,
  isLast,
  hasRecording,
  isSubmitting,
  hasSubmitted,
  onPrev,
  onNext,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const isDisabled = !hasRecording || isSubmitting || hasSubmitted;
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
          isDisabled && !hasSubmitted && styles.navFooterSubmitBtnDisabled,
          hasSubmitted && styles.navFooterSubmitBtnSubmitted,
        ]}
        onPress={onSubmit}
        disabled={isDisabled}
        activeOpacity={hasSubmitted ? 1 : 0.7}
      >
        {hasSubmitted ? (
          <View style={styles.navFooterSubmitContent}>
            <Text style={styles.navFooterSubmitText}>Submitted</Text>
            <CheckIcon size={scale(14)} color="#FFFFFF" strokeWidth={3} />
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
