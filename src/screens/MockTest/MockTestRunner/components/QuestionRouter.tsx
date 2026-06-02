import React from 'react';
import { FibBankQuestion } from './FibBankQuestion';
import { FibDropdownQuestion } from './FibDropdownQuestion';
import { FibInputQuestion } from './FibInputQuestion';
import { HighlightQuestion } from './HighlightQuestion';
import { McqQuestion } from './McqQuestion';
import { ReorderQuestion } from './ReorderQuestion';
import { SpeakingQuestion } from './SpeakingQuestion';
import { WritingQuestion } from './WritingQuestion';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
}

// Single switch on `question.kind`. Every `AnswerKind` has a
// dedicated component — TypeScript's exhaustive check on the switch
// guarantees no kind silently falls through. New kinds are added by
// extending the `AnswerKind` union, adding a case here, and shipping
// the corresponding component.
//
// `key={question.id}` on each branch ensures that swapping questions
// remounts the leaf — recorders / option pickers / FIB inputs get a
// fresh internal state and don't leak the previous question's draft.
export const QuestionRouter: React.FC<Props> = ({
  question,
  draft,
  onAnswerChange,
}) => {
  switch (question.kind) {
    case 'speaking':
      return (
        <SpeakingQuestion
          key={question.id}
          question={question}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'mcq-single':
    case 'mcq-multi':
      return (
        <McqQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'writing':
      return (
        <WritingQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'reorder':
      return (
        <ReorderQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'highlight':
      return (
        <HighlightQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'fib-bank':
      return (
        <FibBankQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'fib-dropdown':
      return (
        <FibDropdownQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
    case 'fib-input':
      return (
        <FibInputQuestion
          key={question.id}
          question={question}
          draft={draft}
          onAnswerChange={onAnswerChange}
        />
      );
  }
};

export default QuestionRouter;
