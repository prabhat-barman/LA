import React, { useCallback, useEffect, useMemo } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AudioPlayer } from '../../../../modules/audio';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Fill-in-the-blank with text inputs. Used for subcategory 16
// (Listening "Fill in the blanks") — the candidate hears the audio
// and types the words that are missing from the transcript.
//
// Layout mirrors `FibDropdownQuestion`: pre-parsed text segments
// interleaved with the blank widgets, here a `TextInput` per blank
// instead of a dropdown picker.
export const FibInputQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const fib = question.fib;

  useEffect(() => {
    if (!fib) return;
    const needsSeed =
      draft.kind !== 'fib-input' || draft.values.length !== fib.blanks.length;
    if (!needsSeed) return;
    onAnswerChange({
      kind: 'fib-input',
      values: fib.blanks.map(() => ''),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fib?.blanks.length, question.id]);

  const values = useMemo<ReadonlyArray<string>>(() => {
    if (draft.kind === 'fib-input' && fib && draft.values.length === fib.blanks.length) {
      return draft.values;
    }
    return fib ? fib.blanks.map(() => '') : [];
  }, [draft, fib]);

  const handleChange = useCallback(
    (blankIndex: number, text: string) => {
      const next = [...values];
      next[blankIndex] = text;
      onAnswerChange({ kind: 'fib-input', values: next });
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

  const audioUrl = question.audioUrl ?? '';
  const filledCount = values.filter(v => v.trim().length > 0).length;

  return (
    <View style={styles.fibContainer}>
      {question.prompt && fib.parts.join('').trim().length === 0 ? (
        <Text style={styles.questionPrompt}>{question.prompt}</Text>
      ) : null}

      {audioUrl.length > 0 ? (
        <AudioPlayer
          id={`mock-fib-input-${question.id}`}
          audioUrl={audioUrl}
          autoPlay="auto"
          playOnce
        />
      ) : null}

      <Text style={styles.fibHelper}>
        Listen to the audio, then type the missing word for each blank.
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
              <View
                key={`b${partIndex}`}
                style={styles.fibInputWrapper}
              >
                <TextInput
                  style={styles.fibInput}
                  value={values[partIndex] ?? ''}
                  onChangeText={text => handleChange(partIndex, text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  // `selectTextOnFocus` makes it easy to overwrite a
                  // mis-spelled attempt without manually clearing first.
                  selectTextOnFocus
                  accessibilityLabel={`Blank ${partIndex + 1} of ${fib.blanks.length}`}
                  placeholder="…"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            ) : null;

          return blankNode ? [...wordNodes, blankNode] : wordNodes;
        })}
      </View>

      <Text style={styles.fibCounter}>
        {filledCount}/{fib.blanks.length} blanks filled
      </Text>
    </View>
  );
};

export default FibInputQuestion;
