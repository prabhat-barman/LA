import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { HtmlText } from '../../../../components/atoms/HtmlText';
import { AudioPlayer } from '../../../../modules/audio';
import { tokenizeHighlightAnswer } from '../helpers';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Highlight Incorrect Words (subcategory 19, Listening). The user
// hears an audio recording, then taps every word in the displayed
// transcript that doesn't match what was said.
//
// The displayable transcript lives in `question.answerMarkup` —
// backend ships it with `<span id='cAns'>…</span>` markers around
// the intended-correct word. We strip the markup for display (the
// user shouldn't see the markers) and keep the tokenized words as
// the canonical "what the user sees" list.
//
// Submission shape (handled centrally by `buildSelectedString`):
//   • `selected[]` = comma-joined picked words
//   • `selectedIndices` is kept in the draft purely for re-rendering
//     the toggled state.
export const HighlightQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const tokens = useMemo(
    () => tokenizeHighlightAnswer(question.answerMarkup),
    [question.answerMarkup],
  );

  const selectedIndices = useMemo<ReadonlySet<number>>(() => {
    if (draft.kind !== 'highlight') return new Set();
    return new Set(draft.selectedIndices);
  }, [draft]);

  const toggleIndex = useCallback(
    (index: number) => {
      const current =
        draft.kind === 'highlight' ? draft.selectedIndices : [];
      const wasSelected = current.includes(index);

      const nextIndices = wasSelected
        ? current.filter(i => i !== index)
        : [...current, index].sort((a, b) => a - b);

      // Recompute `selectedWords` from the canonical token list each
      // time. Storing words alongside indices means the submit layer
      // doesn't need to re-tokenize — it just reads the draft.
      const nextWords = nextIndices.map(i => tokens[i] ?? '');

      onAnswerChange({
        kind: 'highlight',
        selectedIndices: nextIndices,
        selectedWords: nextWords,
      });
    },
    [draft, tokens, onAnswerChange],
  );

  const audioUrl = question.audioUrl ?? '';

  return (
    <View style={styles.highlightContainer}>
      {question.prompt ? (
        <HtmlText content={question.prompt} style={styles.questionPrompt} />
      ) : null}

      {audioUrl.length > 0 ? (
        <AudioPlayer
          id={`mock-highlight-${question.id}`}
          audioUrl={audioUrl}
          autoPlay="auto"
          playOnce
        />
      ) : null}

      <Text style={styles.highlightHelper}>
        Tap each word that does not match what you heard.
      </Text>

      {tokens.length === 0 ? (
        <Text style={styles.placeholder}>
          Transcript unavailable for this question.
        </Text>
      ) : (
        <View style={styles.highlightWordGrid}>
          {tokens.map((word, index) => {
            const isSelected = selectedIndices.has(index);
            return (
              <TouchableOpacity
                // Tokens can repeat (e.g. "the the") so we suffix the
                // index — guarantees a stable, unique key without
                // relying on word identity.
                key={`${word}-${index}`}
                style={[
                  styles.highlightWord,
                  isSelected && styles.highlightWordSelected,
                ]}
                onPress={() => toggleIndex(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${word}${isSelected ? ', marked incorrect' : ''}`}
              >
                <Text
                  style={[
                    styles.highlightWordText,
                    isSelected && styles.highlightWordTextSelected,
                  ]}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.highlightCounter}>
        {selectedIndices.size}{' '}
        {selectedIndices.size === 1 ? 'word' : 'words'} marked
      </Text>
    </View>
  );
};

export default HighlightQuestion;
