import React, { useCallback, useEffect, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { HtmlText } from '../../../../components/atoms/HtmlText';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Renders the paragraph list in the user's current arrangement and
// exposes per-row up/down arrows that swap a paragraph with its
// neighbour. We use arrow-based reordering instead of native
// drag-and-drop for two reasons:
//   • RN drag-and-drop libraries are heavyweight and noisy in a long
//     scrollable runner — we'd have to coordinate gestures with the
//     parent KeyboardAwareScrollView.
//   • The PTE web client itself ships an arrow-based reorder UI on
//     touch devices, so candidates aren't surprised by ours.
//
// The draft is seeded on first mount to mirror the backend's shipped
// order so the user always has *some* arrangement (rather than the
// runner thinking the answer is "incomplete" before they've moved a
// single paragraph).
export const ReorderQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const paragraphs = useMemo(() => question.options ?? [], [question.options]);

  // Pull the current ordered ids out of the draft, falling back to
  // the question's natural order. We don't include `paragraphs` in
  // the dependency list of useMemo — it changes by reference when
  // the question switches, but the per-question `key` on the parent
  // remounts this component fresh, so React already re-runs the
  // initial layout via the seeding effect below.
  const orderedIds = useMemo(() => {
    if (draft.kind === 'reorder' && draft.orderedIds.length > 0) {
      return draft.orderedIds;
    }
    return paragraphs.map(p => p.id);
  }, [draft, paragraphs]);

  // Seed an initial reorder draft once the paragraphs are known so
  // the parent runner sees a populated draft even before the user
  // makes their first move. Guarded so we only seed when the
  // current draft is empty / for a different kind (e.g. the runner
  // restored an `empty` draft on remount).
  useEffect(() => {
    if (paragraphs.length === 0) return;
    if (draft.kind === 'reorder' && draft.orderedIds.length === paragraphs.length) {
      return;
    }
    onAnswerChange({
      kind: 'reorder',
      orderedIds: paragraphs.map(p => p.id),
    });
    // The seeding effect intentionally fires on paragraph identity
    // only — re-running on every draft tick would clobber the user's
    // edits with the natural order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphs]);

  // O(n) lookup table — paragraph text by id. Avoids re-scanning the
  // options array on every render of the list.
  const textById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of paragraphs) map.set(p.id, p.text);
    return map;
  }, [paragraphs]);

  const swap = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= orderedIds.length || from === to) return;
      const next = [...orderedIds];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onAnswerChange({ kind: 'reorder', orderedIds: next });
    },
    [orderedIds, onAnswerChange],
  );

  return (
    <View style={styles.reorderContainer}>
      {question.prompt ? (
        <HtmlText content={question.prompt} style={styles.questionPrompt} />
      ) : null}

      <Text style={styles.reorderHelper}>
        Use the arrows to arrange the paragraphs in the correct order.
      </Text>

      {paragraphs.length === 0 ? (
        <Text style={styles.placeholder}>
          No paragraphs to reorder for this question.
        </Text>
      ) : null}

      {orderedIds.map((id, index) => {
        const isFirst = index === 0;
        const isLast = index === orderedIds.length - 1;
        const text = textById.get(id) ?? '(missing paragraph)';

        return (
          <View key={id} style={styles.reorderItem}>
            <View style={styles.reorderIndexPill}>
              <Text style={styles.reorderIndexText}>{index + 1}</Text>
            </View>

            <Text style={styles.reorderText}>{text}</Text>

            <View style={styles.reorderArrowCol}>
              <TouchableOpacity
                style={[
                  styles.reorderArrowBtn,
                  isFirst && styles.reorderArrowBtnDisabled,
                ]}
                onPress={() => swap(index, index - 1)}
                disabled={isFirst}
                accessibilityRole="button"
                accessibilityLabel={`Move paragraph ${index + 1} up`}
              >
                <Text
                  style={[
                    styles.reorderArrowText,
                    isFirst && styles.reorderArrowTextDisabled,
                  ]}
                >
                  ↑
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reorderArrowBtn,
                  isLast && styles.reorderArrowBtnDisabled,
                ]}
                onPress={() => swap(index, index + 1)}
                disabled={isLast}
                accessibilityRole="button"
                accessibilityLabel={`Move paragraph ${index + 1} down`}
              >
                <Text
                  style={[
                    styles.reorderArrowText,
                    isLast && styles.reorderArrowTextDisabled,
                  ]}
                >
                  ↓
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default ReorderQuestion;
