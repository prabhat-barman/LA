import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Fill-in-the-blank with per-blank dropdown options. Used for
// subcategories 11 (Reading FIB) and 12 (Reading & Writing FIB).
//
// Layout strategy: the parser pre-computed `parts` (text segments)
// and `blanks` (per-blank metadata). We render them interleaved in a
// `flexDirection: row, flexWrap: wrap` container — each word from a
// text segment is its own <Text> so the reflow places blanks
// naturally between words rather than only at segment boundaries.
//
// The dropdown UI is a `Modal` with a `FlatList` of options. The
// reference project uses an inline picker on iOS and a modal on
// Android; we use modal-only because it's a more predictable mobile
// pattern and avoids edge cases when a picker would overflow the
// scrollable runner body.
export const FibDropdownQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const fib = question.fib;
  // Currently-open blank, or null when no modal is shown. We track
  // by index instead of blank id so the modal close path can stay
  // local and not dirty the parent draft.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Seed an empty values array of the right length the first time a
  // dropdown question mounts (or when the draft is fresh / for a
  // different question kind). Without this seed, the parent's
  // `EMPTY_DRAFT` shows up here and we'd index into `values[i]`
  // before it exists.
  useEffect(() => {
    if (!fib) return;
    const needsSeed =
      draft.kind !== 'fib-dropdown' ||
      draft.values.length !== fib.blanks.length;
    if (!needsSeed) return;
    onAnswerChange({
      kind: 'fib-dropdown',
      values: fib.blanks.map(() => null),
    });
    // Run only when the question changes — re-seeding on every draft
    // tick would clobber the user's selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fib?.blanks.length, question.id]);

  const values = useMemo<ReadonlyArray<string | null>>(() => {
    if (draft.kind === 'fib-dropdown' && fib && draft.values.length === fib.blanks.length) {
      return draft.values;
    }
    return fib ? fib.blanks.map(() => null) : [];
  }, [draft, fib]);

  const handlePick = useCallback(
    (blankIndex: number, choice: string) => {
      const next = [...values];
      // Toggle-off when the user picks the already-selected option,
      // mirroring the reference behavior — useful when the candidate
      // changes their mind and wants to leave a blank empty before
      // moving on.
      next[blankIndex] = next[blankIndex] === choice ? null : choice;
      onAnswerChange({ kind: 'fib-dropdown', values: next });
      setOpenIndex(null);
    },
    [values, onAnswerChange],
  );

  if (!fib || fib.blanks.length === 0) {
    return (
      <View style={styles.fibContainer}>
        <Text style={styles.placeholder}>
          This fill-in-the-blanks question is missing its blanks.
        </Text>
      </View>
    );
  }

  const openBlank = openIndex !== null ? fib.blanks[openIndex] : null;
  const openValue = openIndex !== null ? values[openIndex] : null;

  const filledCount = values.filter(v => v !== null && v.length > 0).length;

  return (
    <View style={styles.fibContainer}>
      {question.prompt && fib.parts.join('').trim().length === 0 ? (
        // Only render the prompt when the parsed text segments are
        // empty — otherwise the parts already contain the prompt and
        // re-rendering it doubles up.
        <Text style={styles.questionPrompt}>{question.prompt}</Text>
      ) : null}

      <Text style={styles.fibHelper}>
        Tap each blank to choose the word that best fits.
      </Text>

      <View style={styles.fibFlow}>
        {fib.parts.flatMap((part, partIndex) => {
          // Split the segment into whitespace-preserving tokens so
          // each word lays out on its own line break opportunity.
          // Empty segments (e.g. blank at very start) contribute
          // nothing to the flow.
          const words = part.length > 0 ? part.split(/(\s+)/) : [];
          const wordNodes = words
            .filter(w => w.length > 0)
            .map((word, wIdx) => (
              <Text key={`p${partIndex}-w${wIdx}`} style={styles.fibText}>
                {word}
              </Text>
            ));

          const blankNode =
            partIndex < fib.blanks.length ? (
              <DropdownBlank
                key={`b${partIndex}`}
                blankIndex={partIndex}
                value={values[partIndex] ?? null}
                onPress={() => setOpenIndex(partIndex)}
                isActive={openIndex === partIndex}
              />
            ) : null;

          return blankNode ? [...wordNodes, blankNode] : wordNodes;
        })}
      </View>

      <Text style={styles.fibCounter}>
        {filledCount}/{fib.blanks.length} blanks filled
      </Text>

      {/* Single modal hoisted out of the inline blanks — only one can
          be open at a time, so it's cheaper than one Modal per blank
          and avoids stacking-order surprises on Android. */}
      <Modal
        visible={openIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenIndex(null)}
      >
        <Pressable
          style={styles.fibModalOverlay}
          onPress={() => setOpenIndex(null)}
        >
          <Pressable
            style={styles.fibModalCard}
            // Empty onPress consumes the bubbling tap so the overlay
            // dismiss only fires when the user taps OUTSIDE the card.
            onPress={() => {}}
          >
            <Text style={styles.fibModalTitle}>
              Choose a word
              {openIndex !== null
                ? ` for blank ${openIndex + 1} of ${fib.blanks.length}`
                : ''}
            </Text>
            <FlatList
              data={openBlank?.choices ?? []}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const isSelected = openValue === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.fibModalOption,
                      isSelected && styles.fibModalOptionSelected,
                    ]}
                    onPress={() =>
                      openIndex !== null && handlePick(openIndex, item)
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.fibModalOptionText,
                        isSelected && styles.fibModalOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.fibModalCancel}
              onPress={() => setOpenIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel option picker"
            >
              <Text style={styles.fibModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

interface DropdownBlankProps {
  blankIndex: number;
  value: string | null;
  isActive: boolean;
  onPress: () => void;
}

const DropdownBlank: React.FC<DropdownBlankProps> = ({
  blankIndex,
  value,
  isActive,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.fibDropdown, isActive && styles.fibDropdownActive]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={
      value
        ? `Blank ${blankIndex + 1}, currently ${value}`
        : `Blank ${blankIndex + 1}, no selection`
    }
  >
    <Text
      style={[
        styles.fibDropdownText,
        !value && styles.fibDropdownPlaceholder,
      ]}
      numberOfLines={1}
    >
      {value ?? 'Select'}
    </Text>
    <Text style={styles.fibDropdownArrow}>{isActive ? '▲' : '▼'}</Text>
  </TouchableOpacity>
);

export default FibDropdownQuestion;
