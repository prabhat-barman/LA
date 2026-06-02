import React, { useCallback, useMemo } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AudioPlayer } from '../../../../modules/audio';
import { countWords } from '../helpers';
import { styles } from '../styles';
import type { AnswerDraft, Question, SubcategoryId } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Per-subcategory rules for writing prompts. Keeps the runtime
// rendering logic uniform and the per-type quirks (word limits,
// whether to play audio, whether to show source paragraph) reduced to
// data instead of branches.
interface WritingConfig {
  minWords?: number;
  maxWords?: number;
  // Where the source material comes from:
  //   - 'paragraph' → render `question.paragraph` above the input
  //   - 'audio'     → auto-play `question.audioUrl` once
  //   - 'none'      → essay-style, only the prompt is shown
  source: 'paragraph' | 'audio' | 'none';
  // User-facing instruction summary shown beneath the prompt — gives
  // candidates a quick reminder of expected response length without
  // having to re-read the official rubric.
  helperText: string;
}

const WRITING_CONFIGS: Partial<Record<SubcategoryId, WritingConfig>> = {
  // Summarize Written Text — 5-75 words off a source paragraph.
  6: {
    minWords: 5,
    maxWords: 75,
    source: 'paragraph',
    helperText: 'Summarize the passage in one sentence (5 – 75 words).',
  },
  // Write Essay — 200-300 words. No source paragraph; prompt is the
  // essay topic itself.
  7: {
    minWords: 200,
    maxWords: 300,
    source: 'none',
    helperText: 'Write an essay of 200 – 300 words on the topic above.',
  },
  // Summarize Spoken Text — listen, then 50-70 words summary.
  13: {
    minWords: 50,
    maxWords: 70,
    source: 'audio',
    helperText:
      'Listen to the recording, then summarize it in 50 – 70 words.',
  },
  // Write From Dictation — listen, then type the sentence verbatim.
  // No strict word range; the answer is what the user heard.
  20: {
    source: 'audio',
    helperText: 'Listen to the sentence, then type exactly what you heard.',
  },
};

// Default config for any subcategory that lands here without a
// dedicated entry (defensive — `QuestionRouter` only delegates the
// four supported kinds today). Allows a wide-open input + a permissive
// helper string so the user isn't blocked.
const DEFAULT_CONFIG: WritingConfig = {
  source: 'none',
  helperText: 'Type your response below.',
};

// Renders writing-type questions (subcategories 6, 7, 13, 20). Lifts
// the typed text into the draft on every keystroke; the parent runner
// uses `isAnswerComplete` to gate the Next button.
export const WritingQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const config = WRITING_CONFIGS[question.subcategory_id] ?? DEFAULT_CONFIG;

  const value = draft.kind === 'writing' ? draft.text : '';
  const wordCount = useMemo(() => countWords(value), [value]);

  // Classify the live word count vs the prescribed range so the
  // counter can flip colour to nudge the user toward compliance.
  const wordCountVariant: 'good' | 'over' | 'under' = useMemo(() => {
    const { minWords, maxWords } = config;
    if (maxWords != null && wordCount > maxWords) return 'over';
    if (minWords != null && wordCount > 0 && wordCount < minWords) return 'under';
    return 'good';
  }, [config, wordCount]);

  const handleChangeText = useCallback(
    (text: string) => {
      onAnswerChange({ kind: 'writing', text });
    },
    [onAnswerChange],
  );

  const counterLabel = useMemo(() => {
    const { minWords, maxWords } = config;
    if (minWords != null && maxWords != null) {
      return `${wordCount} / ${minWords}–${maxWords} words`;
    }
    if (maxWords != null) {
      return `${wordCount} / ${maxWords} words`;
    }
    return `${wordCount} words`;
  }, [config, wordCount]);

  return (
    <View style={styles.writingContainer}>
      {config.source === 'paragraph' && question.paragraph && (
        <View style={styles.writingParagraphBox}>
          <Text style={styles.writingParagraphText}>{question.paragraph}</Text>
        </View>
      )}
      {config.source === 'audio' && question.audioUrl && (
        <AudioPlayer
          id={`writing-${question.id}`}
          audioUrl={question.audioUrl}
          autoPlay
          playOnce
          clickable={false}
        />
      )}
      {question.prompt && (
        <Text style={styles.questionPrompt}>{question.prompt}</Text>
      )}
      <Text style={styles.writingHelperText}>{config.helperText}</Text>

      <TextInput
        style={styles.writingInput}
        multiline
        value={value}
        onChangeText={handleChangeText}
        placeholder="Type your response here…"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="sentences"
        autoCorrect
        textAlignVertical="top"
      />

      <Text
        style={[
          styles.writingCounter,
          wordCountVariant === 'over' && styles.writingCounterOver,
          wordCountVariant === 'under' && styles.writingCounterUnder,
        ]}
      >
        {counterLabel}
      </Text>
    </View>
  );
};

export default WritingQuestion;
