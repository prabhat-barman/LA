import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { FOOTER_PADDING_BOTTOM, styles } from '../styles';

interface Props {
  isLastQuestion: boolean;
  // True when this is the last question of a non-last section. Used
  // ONLY to relabel the primary CTA ("End Section" instead of "Next")
  // so the user understands tapping forfeits any remaining time on
  // this section's clock. The runner's `handleNext` is responsible
  // for the actual section-break overlay; this prop just affects the
  // label.
  isEndOfSection?: boolean;
  // True when the current draft is "complete enough" to submit — see
  // `isAnswerComplete` in helpers. Disables the primary CTA otherwise.
  canSubmit: boolean;
  // Set while the queue is draining the final-submit batch. Locks the
  // CTA, swaps the label for a spinner, and prevents double-taps.
  isSubmitting: boolean;
  // Set while the Save & Exit handler is enqueuing / flushing the
  // pending submission. Locks BOTH CTAs (primary and secondary) so
  // we can't double-submit the same draft.
  isSavingExit?: boolean;
  onNext: () => void;
  onFinalSubmit: () => void;
  // Optional — when provided, renders the Save & Exit secondary
  // button alongside the primary CTA. Hidden entirely when omitted
  // (e.g. for flows where save-and-resume isn't supported, like
  // section-break interstitials in Phase 3.0).
  onSaveExit?: () => void;
  // Safe-area inset for the home indicator. Added to the footer's
  // own bottom padding so the CTA never overlaps the gesture handle.
  bottomInset: number;
}

// Bottom-pinned footer with the advance / submit primary CTA and an
// optional Save & Exit secondary. Save & Exit posts the current draft
// to SUBMIT_MOCK with `pending=1` so the backend stashes the attempt
// for later resume via PENDING_TEST_LIST.
export const RunnerFooter: React.FC<Props> = ({
  isLastQuestion,
  isEndOfSection = false,
  canSubmit,
  isSubmitting,
  isSavingExit = false,
  onNext,
  onFinalSubmit,
  onSaveExit,
  bottomInset,
}) => {
  const anyBusy = isSubmitting || isSavingExit;
  const primaryDisabled = !canSubmit || anyBusy;
  // Label precedence: Submit Test (whole-test end) > End Section
  // (mid-test section boundary) > Next. `isLastQuestion` wins because
  // by definition the last question of the last section is BOTH the
  // end of the section AND the end of the test.
  const label = isLastQuestion
    ? 'Submit Test'
    : isEndOfSection
      ? 'End Section'
      : 'Next';
  const handlePress = isLastQuestion ? onFinalSubmit : onNext;

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: FOOTER_PADDING_BOTTOM + bottomInset },
      ]}
    >
      <View style={styles.footerRow}>
        {onSaveExit && (
          <TouchableOpacity
            style={[
              styles.footerSecondaryBtn,
              anyBusy && styles.footerSecondaryBtnDisabled,
            ]}
            onPress={onSaveExit}
            disabled={anyBusy}
            accessibilityRole="button"
            accessibilityLabel="Save and exit the test"
            accessibilityHint="Saves your progress so you can resume from the pending tests list later"
          >
            {isSavingExit ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <Text style={styles.footerSecondaryBtnText}>Save & Exit</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.footerPrimaryBtn,
            primaryDisabled && styles.footerPrimaryBtnDisabled,
          ]}
          onPress={handlePress}
          disabled={primaryDisabled}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.footerPrimaryBtnText}>{label}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RunnerFooter;
