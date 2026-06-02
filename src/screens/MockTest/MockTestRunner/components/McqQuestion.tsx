import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { MCQOptions } from '../../../Practice/PracticeQuestionDetail/components/MCQOptions';
import type { MCQOption } from '../../../Practice/PracticeQuestionDetail/types';
import { styles } from '../styles';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Pulls the raw MCQ option list straight off `question.raw.option` so
// the practice MCQ component can render it with its existing layout +
// feedback styling. The runner doesn't normalize options into a
// runner-specific shape — that would just need an inverse mapping at
// render time.
const extractMcqOptions = (question: Question): MCQOption[] => {
  const raw = question.raw as { option?: unknown } | null;
  if (!raw || !Array.isArray(raw.option)) return [];
  return raw.option.flatMap((opt): MCQOption[] => {
    if (!opt || typeof opt !== 'object') return [];
    const o = opt as Record<string, unknown>;
    const id = o.id ?? o.option_id;
    const text = typeof o.options === 'string' ? o.options : '';
    if ((typeof id !== 'string' && typeof id !== 'number') || !text) {
      return [];
    }
    return [
      {
        id,
        options: text,
        // `correct` is hidden by the backend during the live attempt
        // (revealed only via the submission response). Pass 0 so the
        // option renders neutrally — feedback mode stays disabled.
        correct: typeof o.correct === 'string' || typeof o.correct === 'number'
          ? o.correct
          : 0,
        question_id:
          typeof o.question_id === 'string' || typeof o.question_id === 'number'
            ? o.question_id
            : undefined,
      },
    ];
  });
};

// Renders MCQ-single and MCQ-multi questions (subcategories 8, 9, 14,
// 15, 17, 18). Wraps the existing practice `MCQOptions` card and
// adapts its `Set<string>` selection model to the runner's
// discriminated-union `AnswerDraft`.
export const McqQuestion: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  const isMultiple = question.kind === 'mcq-multi';
  const options = useMemo(() => extractMcqOptions(question), [question]);

  const selectedIds = useMemo(() => {
    if (isMultiple) {
      return draft.kind === 'mcq-multi'
        ? new Set(draft.selectedIds)
        : new Set<string>();
    }
    if (draft.kind === 'mcq-single' && draft.selectedId) {
      return new Set([draft.selectedId]);
    }
    return new Set<string>();
  }, [draft, isMultiple]);

  const handleToggle = useCallback(
    (optionId: string) => {
      if (isMultiple) {
        const current =
          draft.kind === 'mcq-multi' ? new Set(draft.selectedIds) : new Set<string>();
        if (current.has(optionId)) {
          current.delete(optionId);
        } else {
          current.add(optionId);
        }
        onAnswerChange({ kind: 'mcq-multi', selectedIds: Array.from(current) });
        return;
      }
      // Single-pick: replace any previous selection.
      onAnswerChange({ kind: 'mcq-single', selectedId: optionId });
    },
    [draft, isMultiple, onAnswerChange],
  );

  return (
    <View style={styles.mcqWrapper}>
      {question.paragraph && (
        <Text style={styles.questionParagraph}>{question.paragraph}</Text>
      )}
      <MCQOptions
        questionPrompt={question.prompt ?? ''}
        options={options}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        showFeedback={false}
        isMultiple={isMultiple}
      />
    </View>
  );
};

export default McqQuestion;
