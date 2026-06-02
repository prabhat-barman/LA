import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { QueueItem } from '../types';

// How many failed-item rows to preview on the overlay before
// truncating with a "+N more" footer. Three keeps the modal compact
// on small devices; anything past that risks pushing the actions row
// below the fold.
const MAX_PREVIEW_ITEMS = 3;

interface Props {
  // Snapshot of the queue's failed items at the moment the overlay
  // opened. Used only for the preview list — the retry handler
  // pulls fresh state from the queue itself, so this can be stale
  // without affecting correctness.
  failedItems: ReadonlyArray<QueueItem>;
  // Total items the queue tried to send during the flush that
  // triggered this overlay. Powers the "X of Y submissions failed"
  // headline so users see the failure in proportion.
  totalItems: number;
  // Tap "Retry Failed" — the runner re-runs `submitQueue.retryFailed()`
  // and either re-shows this overlay (with the remaining failures)
  // or proceeds to the success exit path.
  onRetry: () => void;
  // Tap "Exit Anyway" — the runner abandons the failed submissions
  // and navigates back. In a follow-up phase (2.2) we'll persist
  // these failures so the user can retry from MockTestScreen even
  // after the runner unmounts; for now exiting forfeits them.
  onExit: () => void;
  // True while `retryFailed()` is in flight. Locks both CTAs and
  // swaps the retry label for a spinner so the user knows the tap
  // landed.
  isRetrying: boolean;
}

// Describes a single failed item for the preview list. We deliberately
// avoid leaning on full question metadata (title, prompt) here — the
// queue only carries `SubmitContext`, and showing question numbers is
// both shorter and consistent with PTE's own end-of-test summary UX.
const describeItem = (item: QueueItem): string => {
  const qn = item.context.questionNumber;
  const sub = item.context.answer.subcategoryId;
  const errorTail = item.lastError ? ` — ${item.lastError}` : '';
  return `Q${qn} (type ${sub})${errorTail}`;
};

export const SubmissionRetryOverlay: React.FC<Props> = ({
  failedItems,
  totalItems,
  onRetry,
  onExit,
  isRetrying,
}) => {
  const previewItems = failedItems.slice(0, MAX_PREVIEW_ITEMS);
  const overflow = failedItems.length - previewItems.length;

  return (
    <View
      style={styles.retryOverlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.retryCard}>
        <Text style={styles.retryEyebrow}>Submission issue</Text>
        <Text style={styles.retryTitle}>
          {failedItems.length} of {totalItems}{' '}
          {totalItems === 1 ? 'answer' : 'answers'} didn&apos;t reach the server
        </Text>
        <Text style={styles.retrySubtitle}>
          Most likely a network blip. Tap Retry to resend just the failed
          items — your other answers have already been saved.
        </Text>

        {failedItems.length > 0 && (
          <View style={styles.retryFailedList}>
            <Text style={styles.retryFailedListLabel}>Failed answers</Text>
            {previewItems.map(item => (
              <Text
                key={item.id}
                style={styles.retryFailedListItem}
                numberOfLines={1}
              >
                • {describeItem(item)}
              </Text>
            ))}
            {overflow > 0 && (
              <Text style={styles.retryFailedListItem}>
                + {overflow} more
              </Text>
            )}
          </View>
        )}

        <View style={styles.retryActionsRow}>
          <TouchableOpacity
            style={styles.retryExitBtn}
            onPress={onExit}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel="Exit anyway without retrying"
          >
            <Text style={styles.retryExitBtnText}>Exit Anyway</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.retryRetryBtn,
              isRetrying && styles.retryRetryBtnDisabled,
            ]}
            onPress={onRetry}
            disabled={isRetrying || failedItems.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Retry ${failedItems.length} failed ${
              failedItems.length === 1 ? 'submission' : 'submissions'
            }`}
          >
            {isRetrying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.retryRetryBtnText}>
                Retry Failed ({failedItems.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SubmissionRetryOverlay;
