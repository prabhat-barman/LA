import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Reading "Fill in the Blanks" (subcategory 11). The user is shown
// a passage with N blanks and a shared word bank below it. Flow:
//   1. Tap a bank chip → it becomes the "armed" word.
//   2. Tap a blank → the armed word drops into that blank.
//   3. Tap a filled blank again (with no armed word) → clears it.
//   4. Tap a filled blank with a new armed word → swaps the word in
//      (the prior word returns to the bank automatically because
//      "used" is derived from `values.includes(word)`).
//   5. Tap an already-armed chip → un-arms it (lets the user back
//      out without making a selection).
//
// Used-state is computed from `values.includes(word)` rather than a
// separate state slice — that way a single source of truth (the
// draft `values`) drives both the blanks and the chip rail and the
// two can never drift out of sync.
export const FibBankQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const fib = question.fib;
  const [armedWord, setArmedWord] = useState<string | null>(null);

  // Seed an empty values array sized to the blank count the first
  // time the question mounts. Re-seed when the question id changes
  // so navigating questions doesn't smear state.
  useEffect(() => {
    if (!fib) return;
    const needsSeed =
      draft.kind !== 'fib-bank' || draft.values.length !== fib.blanks.length;
    if (!needsSeed) return;
    onAnswerChange({
      kind: 'fib-bank',
      values: fib.blanks.map(() => null),
    });
    setArmedWord(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fib?.blanks.length, question.id]);

  const values = useMemo<ReadonlyArray<string | null>>(() => {
    if (
      draft.kind === 'fib-bank' &&
      fib &&
      draft.values.length === fib.blanks.length
    ) {
      return draft.values;
    }
    return fib ? fib.blanks.map(() => null) : [];
  }, [draft, fib]);

  // Track which chips are currently sitting in a blank. We compare
  // by value (not by chip-index) because the bank may legitimately
  // contain duplicate words (PTE ships distractors). If "cat"
  // appears twice in the bank and once in a blank, only ONE chip
  // grays out — that's intentional and matches the reference.
  //
  // Implementation: walk the values once and decrement a per-word
  // counter as we encounter chips of that word. A chip is "used"
  // if there are still uses left for its word when it's visited.
  const usedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    values.forEach(v => {
      if (v === null) return;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    });
    return counts;
  }, [values]);

  const handleBlankTap = useCallback(
    (blankIndex: number) => {
      const current = values[blankIndex];
      const next = [...values];

      if (armedWord) {
        // Drop the armed word into the blank. If the slot already had
        // a value, the previous chip returns to the bank for free
        // because used-state is derived from values.
        next[blankIndex] = armedWord;
        onAnswerChange({ kind: 'fib-bank', values: next });
        setArmedWord(null);
        return;
      }

      if (current !== null) {
        // No armed word + tap on filled blank → clear it.
        next[blankIndex] = null;
        onAnswerChange({ kind: 'fib-bank', values: next });
      }
      // No armed word + tap on empty blank → no-op (UX nudge: bank
      // chip pulse / instruction text already tells the user to pick
      // a word first).
    },
    [armedWord, values, onAnswerChange],
  );

  // Identical-text duplicate chips share state by value (see
  // `usedCounts` above). We only need the word to arm — chip index
  // is captured at the press site for key identity but doesn't
  // matter here since the drop just writes the word into the blank.
  const handleChipTap = useCallback((word: string) => {
    setArmedWord(prev => (prev === word ? null : word));
  }, []);

  if (!fib || fib.blanks.length === 0) {
    return (
      <View style={styles.fibContainer}>
        <Text style={styles.placeholder}>
          This fill-in-the-blanks question is missing its blanks.
        </Text>
      </View>
    );
  }

  const bank = fib.bank ?? [];
  const filledCount = values.filter(v => v !== null && v.length > 0).length;

  return (
    <View style={styles.fibContainer}>
      {question.prompt && fib.parts.join('').trim().length === 0 ? (
        <Text style={styles.questionPrompt}>{question.prompt}</Text>
      ) : null}

      <Text style={styles.fibHelper}>
        {armedWord
          ? `Tap a blank to drop "${armedWord}" in.`
          : 'Tap a word below, then tap a blank to drop it in.'}
      </Text>

      <View style={styles.fibFlow}>
        {fib.parts.flatMap((part, partIndex) => {
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
              <BankBlank
                key={`b${partIndex}`}
                blankIndex={partIndex}
                value={values[partIndex] ?? null}
                ready={armedWord !== null}
                onPress={() => handleBlankTap(partIndex)}
              />
            ) : null;

          return blankNode ? [...wordNodes, blankNode] : wordNodes;
        })}
      </View>

      <Text style={styles.fibCounter}>
        {filledCount}/{fib.blanks.length} blanks filled
      </Text>

      {/* Word bank rail. Renders below the passage so the user's
          tap target is comfortably within thumb reach. We iterate
          a local copy of usedCounts and decrement as we go so
          duplicate chips with the same word distribute their
          "used" state across chip instances rather than greying
          all duplicates at once. */}
      <BankRail
        bank={bank}
        armedWord={armedWord}
        usedCounts={usedCounts}
        onChipPress={handleChipTap}
      />
    </View>
  );
};

interface BankBlankProps {
  blankIndex: number;
  value: string | null;
  ready: boolean;
  onPress: () => void;
}

const BankBlank: React.FC<BankBlankProps> = ({
  blankIndex,
  value,
  ready,
  onPress,
}) => {
  const filled = value !== null && value.length > 0;
  return (
    <TouchableOpacity
      style={[
        styles.fibBankBlank,
        filled && styles.fibBankBlankFilled,
        !filled && ready && styles.fibBankBlankReady,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        filled
          ? `Blank ${blankIndex + 1}, contains ${value}. Tap to remove or replace.`
          : `Blank ${blankIndex + 1}, empty. Tap to drop the selected word here.`
      }
    >
      <Text
        style={[
          styles.fibBankBlankText,
          !filled && styles.fibBankBlankPlaceholder,
        ]}
        numberOfLines={1}
      >
        {value ?? '\u00A0\u00A0\u00A0\u00A0'}
      </Text>
    </TouchableOpacity>
  );
};

interface BankRailProps {
  bank: ReadonlyArray<string>;
  armedWord: string | null;
  usedCounts: Map<string, number>;
  onChipPress: (word: string) => void;
}

const BankRail: React.FC<BankRailProps> = ({
  bank,
  armedWord,
  usedCounts,
  onChipPress,
}) => {
  // Walk a mutable clone of `usedCounts` so each duplicate chip in
  // the bank can claim one "used" slot in order, leaving its
  // siblings clickable. Without this clone, all chips for the same
  // word would gray out the moment any one of them is placed.
  const remaining = useMemo(() => new Map(usedCounts), [usedCounts]);

  return (
    <View style={styles.fibBankRail}>
      {bank.map((word, chipIndex) => {
        const remainingUses = remaining.get(word) ?? 0;
        const isUsed = remainingUses > 0;
        if (isUsed) remaining.set(word, remainingUses - 1);
        const isArmed = !isUsed && armedWord === word;

        return (
          <TouchableOpacity
            key={`${word}-${chipIndex}`}
            style={[
              styles.fibBankChip,
              isArmed && styles.fibBankChipSelected,
              isUsed && styles.fibBankChipUsed,
            ]}
            disabled={isUsed}
            onPress={() => onChipPress(word)}
            accessibilityRole="button"
            accessibilityState={{ selected: isArmed, disabled: isUsed }}
            accessibilityLabel={
              isUsed ? `${word}, already placed in a blank` : word
            }
          >
            <Text
              style={[
                styles.fibBankChipText,
                isArmed && styles.fibBankChipTextSelected,
              ]}
            >
              {word}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FibBankQuestion;
