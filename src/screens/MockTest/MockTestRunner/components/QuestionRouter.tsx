import React, { forwardRef } from 'react';
import { FibBankQuestion } from './FibBankQuestion';
import { FibDropdownQuestion } from './FibDropdownQuestion';
import { FibInputQuestion } from './FibInputQuestion';
import { HighlightQuestion } from './HighlightQuestion';
import { McqQuestion } from './McqQuestion';
import { ReorderQuestion } from './ReorderQuestion';
import {
  SpeakingQuestion,
  type SpeakingQuestionRef,
} from './SpeakingQuestion';
import { WritingQuestion } from './WritingQuestion';
import type { AnswerDraft, Question } from '../types';

interface Props {
  question: Question;
  draft: AnswerDraft;
  onAnswerChange: (draft: AnswerDraft) => void;
  // Mock runner ships `hideStopButton: true` so the recorder's
  // built-in "Stop Recording" button is suppressed — the runner's
  // Next button (with confirmation) is the only exit out of the
  // recording window. Practice / standalone uses leave it false so
  // the user can self-pace.
  hideStopButton?: boolean;
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
//
// The forwarded ref is only consumed by the `speaking` branch; other
// branches are pure / stateless from the runner's perspective so they
// don't need an imperative handle.
export const QuestionRouter = forwardRef<SpeakingQuestionRef, Props>(
  ({ question, draft, onAnswerChange, hideStopButton }, ref) => {
    switch (question.kind) {
      case 'speaking':
        return (
          <SpeakingQuestion
            ref={ref}
            key={question.id}
            question={question}
            onAnswerChange={onAnswerChange}
            hideStopButton={hideStopButton}
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
  },
);

QuestionRouter.displayName = 'QuestionRouter';

export default QuestionRouter;
