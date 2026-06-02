import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { QuestionRouter } from '../../../MockTest/MockTestRunner/components/QuestionRouter';
import { normalizeQuestion } from '../../../MockTest/MockTestRunner/helpers';
import type {
  AnswerDraft,
  Question,
} from '../../../MockTest/MockTestRunner/types';
import { styles } from '../styles';
import type { QuestionDetails } from '../types';

interface Props {
  // Category id from the Practice route — drives the answer shape.
  // We inject this into the normalizer so MockRunner's
  // `getAnswerKind(subcategory_id)` resolves correctly even though the
  // Practice payload only carries the id at the URL level.
  categoryId: number;
  // The same `QuestionDetails` blob the rest of the Practice screen
  // consumes — passed through to the normalizer untouched (just
  // augmented with `subcategory_id`).
  questionDetails: QuestionDetails | null;
  // Lifted draft state. The bridge is a controlled component: it
  // never owns the draft locally so the parent screen can persist /
  // submit / clear it without a useImperativeHandle dance.
  draft: AnswerDraft;
  onDraftChange: (draft: AnswerDraft) => void;
  // Practice's audio path resolver. The bridge applies it eagerly so
  // the runner's `AudioPlayer` always gets a fully-qualified URL —
  // it doesn't know about the relative-vs-absolute / `mediaUrl` vs
  // `audioPath` distinction the practice screen makes.
  resolveAudioUrl: (audio: string | undefined) => string;
}

// Thin adapter that renders MockTestRunner's question components
// inside the Practice screen for the categories Practice never built
// dedicated UIs for (10 Reorder, 11/12/16 FIB, 19 Highlight Incorrect
// Words). Implementation strategy:
//
//   1. Take Practice's `QuestionDetails` (raw backend payload).
//   2. Splice in `subcategory_id` so MockRunner's normalizer can
//      resolve the answer kind.
//   3. Pass the normalized `Question` + lifted draft to
//      `QuestionRouter`, which already routes by kind and renders
//      the appropriate component (FibBankQuestion / ReorderQuestion /
//      HighlightQuestion / …).
//
// Why not duplicate the components into Practice? Three reasons:
//
//   - The Mock runner has invested in correctness (parseFibQuestion,
//     tokenizeHighlightAnswer, drag/drop UX, etc.). Duplication would
//     mean two implementations to keep in sync with backend changes.
//   - These components were built to be presentational — they don't
//     reach into runner-specific state (no queue access, no timer
//     reads). They take `(question, draft, onAnswerChange)` and that's
//     it.
//   - The wire format is the same across Practice and Mock (the
//     Practice screen still builds a `SUBMIT_ANSWER` FormData, see
//     `buildPracticeAnswerFromDraft` in helpers.ts) — only the
//     transport differs.
//
// When something goes wrong (missing payload fields, etc.) the bridge
// renders an inline placeholder rather than throwing, so a single
// malformed question doesn't take the whole screen down. The toast on
// submit ("Please answer first") is the user's recovery path.
export const MockRunnerBridge: React.FC<Props> = ({
  categoryId,
  questionDetails,
  draft,
  onDraftChange,
  resolveAudioUrl,
}) => {
  const question = useMemo<Question | null>(() => {
    if (!questionDetails) return null;
    // Inject the practice-route categoryId into the raw payload so
    // `normalizeQuestion` can pick it up. We don't mutate the caller's
    // object — spread a shallow copy and drop our key in.
    const raw: Record<string, unknown> = {
      ...(questionDetails as unknown as Record<string, unknown>),
      subcategory_id: categoryId,
    };
    const normalized = normalizeQuestion(raw);
    if (!normalized) return null;
    // Resolve any audio URL to an absolute path so the runner's
    // `AudioPlayer` doesn't need Practice's path-resolution helper.
    const audioUrl = normalized.audioUrl
      ? resolveAudioUrl(normalized.audioUrl)
      : undefined;
    return audioUrl ? { ...normalized, audioUrl } : normalized;
  }, [categoryId, questionDetails, resolveAudioUrl]);

  if (!question) {
    return (
      <View style={styles.runnerBridgePlaceholder}>
        <Text style={styles.runnerBridgePlaceholderText}>
          This question can't be displayed right now. Please skip to the
          next one and report the question if the issue persists.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.runnerBridgeContainer}>
      <QuestionRouter
        question={question}
        draft={draft}
        onAnswerChange={onDraftChange}
      />
    </View>
  );
};

export default MockRunnerBridge;
