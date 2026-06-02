import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../styles';
import type { MockTestGoal } from '../types';

interface Props {
  visible: boolean;
  // The currently-active goal, if any. When provided the modal opens
  // pre-selecting the matching chip + relabels itself as "Edit goal".
  // When null we render the "Set a goal" flow.
  existingGoal: MockTestGoal | null;
  onConfirm: (input: { targetScore: number; targetDateIso: string }) => void;
  onClear?: () => void;
  onClose: () => void;
  // Disables the confirm/clear buttons while the parent's mutation
  // is in-flight. Prevents a double-tap from queueing two saves
  // (the second of which would race the first's AsyncStorage write).
  isBusy?: boolean;
}

// PTE band thresholds commonly tied to real outcomes — chosen so
// every preset is recognizable to the target user (visa/uni
// applicant) without needing explanation. The subtitles double as
// "what does this score get me" reminders that make the chips
// self-explanatory.
const SCORE_PRESETS: Array<{ value: number; subtext: string }> = [
  { value: 50, subtext: 'Basic' },
  { value: 58, subtext: 'AU skilled' },
  { value: 65, subtext: 'Most unis' },
  { value: 70, subtext: 'AU competent' },
  { value: 79, subtext: 'Superior' },
];

// Deadline presets in weeks. Anchored to "how much prep time" since
// that's how PTE candidates naturally think about exam dates ("I'm
// taking the test in 6 weeks") vs picking a calendar date directly.
// 1 week feels too short to set a goal around; 16+ weeks is too far
// out to keep meaningful momentum — capped at 12.
const WEEK_PRESETS: Array<{ weeks: number; label: string }> = [
  { weeks: 2, label: '2w' },
  { weeks: 4, label: '4w' },
  { weeks: 6, label: '6w' },
  { weeks: 8, label: '8w' },
  { weeks: 12, label: '12w' },
];

// Adds N weeks to today's local date and returns the ISO string.
// Anchored at local midnight (via Date.UTC on year/month/day) so
// the resulting target date doesn't drift across timezones when
// round-tripped to JSON.
const isoFromWeeksFromNow = (weeks: number): string => {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  target.setUTCDate(target.getUTCDate() + weeks * 7);
  return target.toISOString();
};

// Inverse of `isoFromWeeksFromNow` — finds the preset (if any) that
// matches the supplied ISO. Used to pre-select the deadline chip
// when editing an existing goal. We tolerate ±3 days of slop so a
// goal set "8 weeks ago + 3 days" still highlights the 8w chip.
const weeksPresetFromIso = (iso: string): number | null => {
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return null;
  const now = Date.now();
  const days = Math.round((target - now) / (24 * 60 * 60 * 1000));
  const SLOP = 3;
  for (const p of WEEK_PRESETS) {
    if (Math.abs(days - p.weeks * 7) <= SLOP) return p.weeks;
  }
  return null;
};

// Human-readable deadline summary for the modal preview row.
// Returns e.g. "Sat, Aug 28, 2026" so the user can sanity-check
// the preset chip before confirming.
const formatDeadline = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const SetGoalModal: React.FC<Props> = ({
  visible,
  existingGoal,
  onConfirm,
  onClear,
  onClose,
  isBusy = false,
}) => {
  // Both pieces of state default to the existing goal's values when
  // editing, OR sensible defaults (65 / 6 weeks) when setting fresh.
  // 65 = most common university requirement, 6 weeks = realistic
  // prep window for a motivated candidate.
  const [score, setScore] = useState<number>(existingGoal?.targetScore ?? 65);
  const [weeks, setWeeks] = useState<number>(
    existingGoal ? weeksPresetFromIso(existingGoal.targetDateIso) ?? 6 : 6,
  );

  // Re-seed the state when the modal opens with a different
  // existingGoal (e.g. user dismissed then re-opened in a session).
  // Without this the state persists across opens, which would be a
  // small but confusing footgun.
  useEffect(() => {
    if (visible) {
      setScore(existingGoal?.targetScore ?? 65);
      setWeeks(
        existingGoal ? weeksPresetFromIso(existingGoal.targetDateIso) ?? 6 : 6,
      );
    }
  }, [visible, existingGoal]);

  const targetDateIso = useMemo(() => isoFromWeeksFromNow(weeks), [weeks]);
  const isEditing = existingGoal != null;
  // Disabled when chips somehow have no selection (defensive — chips
  // always have one in the current preset-only flow) OR when the
  // parent mutation is in-flight. The in-flight check prevents a
  // double-tap from queueing two saves that would race each other's
  // AsyncStorage write.
  const canConfirm = score > 0 && weeks > 0 && !isBusy;

  const handleConfirm = () => {
    onConfirm({ targetScore: score, targetDateIso });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {/* Inner Pressable captures touches inside the sheet so they
            don't bubble to the backdrop and accidentally dismiss the
            modal mid-interaction. The empty `onPress` is
            load-bearing — RN's responder system only lets Pressable
            claim a touch when it has at least one of onPress / Press
            In / PressOut / LongPress. Without it, the inner element
            would behave like a plain View and the backdrop's dismiss
            would fire on every chip tap. */}
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalGrabber} />
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit your goal' : 'Set a goal'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {isEditing
              ? 'Update your target score or deadline'
              : 'Pick a target score and how long you have to get there'}
          </Text>

          <Text style={styles.modalSectionLabel}>Target score</Text>
          <View style={styles.modalChipRow}>
            {SCORE_PRESETS.map(preset => {
              const active = preset.value === score;
              return (
                <TouchableOpacity
                  key={preset.value}
                  style={[styles.modalChip, active && styles.modalChipActive]}
                  onPress={() => setScore(preset.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Target score ${preset.value} — ${preset.subtext}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      active && styles.modalChipTextActive,
                    ]}
                  >
                    {preset.value}
                  </Text>
                  <Text
                    style={[
                      styles.modalChipSubtext,
                      active && styles.modalChipSubtextActive,
                    ]}
                  >
                    {preset.subtext}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalSectionLabel}>Target date</Text>
          <View style={styles.modalChipRow}>
            {WEEK_PRESETS.map(preset => {
              const active = preset.weeks === weeks;
              return (
                <TouchableOpacity
                  key={preset.weeks}
                  style={[styles.modalChip, active && styles.modalChipActive]}
                  onPress={() => setWeeks(preset.weeks)}
                  accessibilityRole="button"
                  accessibilityLabel={`Target in ${preset.weeks} weeks`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      active && styles.modalChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalSubtitle}>
            Target: {score} by {formatDeadline(targetDateIso)}
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                !canConfirm && styles.modalConfirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Save goal' : 'Set goal'}
            >
              <Text style={styles.modalConfirmBtnText}>
                {isEditing ? 'Save' : 'Set goal'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing && onClear && (
            <TouchableOpacity
              style={styles.modalClearBtn}
              onPress={onClear}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Clear goal"
              accessibilityState={{ disabled: isBusy }}
            >
              <Text style={styles.modalClearBtnText}>Clear goal</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SetGoalModal;
