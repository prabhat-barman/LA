import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/apiConfig';
import apiClient from '../services/apiClient';
import { logger } from '../services/logger';

// Mirrors the legacy `useSubmitExplanation` hook's contract. The
// explanation endpoint returns a `paragraph_explanation` string —
// usually a tutor-style breakdown of why the correct answer is
// right. It's secondary to the submit response (we never block UI
// on it) and silently no-ops on errors.

export interface ExplanationInput {
  questionId: string | number;
  // Numeric backend category / subcategory id. The legacy app
  // passed `subcategory_id`; we forward whatever the call site has.
  categoryId: number;
  // Raw question text (already HTML-stripped if needed).
  questionText: string;
  // What the user picked / typed. Caller decides how to format this
  // for the backend; for MCQ it's the selected option label(s), for
  // FIB it's the comma-joined values, etc.
  selected: string;
  // The known-correct answer, used by the backend to anchor the
  // explanation. Optional — some categories don't have a single
  // canonical answer to send.
  correct?: string;
}

export interface ExplanationState {
  loading: boolean;
  text: string | null;
  error: string | null;
}

const INITIAL: ExplanationState = {
  loading: false,
  text: null,
  error: null,
};

// Resets to an empty state whenever the question id changes — so a
// stale previous explanation doesn't paint on a fresh question.
export const useSubmitExplanation = (questionId: string | number | null) => {
  const [state, setState] = useState<ExplanationState>(INITIAL);
  const lastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (questionId !== lastIdRef.current) {
      lastIdRef.current = questionId;
      setState(INITIAL);
    }
  }, [questionId]);

  const submit = useCallback(
    async (input: ExplanationInput): Promise<string | null> => {
      if (!input.questionId) {
        logger.debug('[useSubmitExplanation] no questionId, skipping');
        return null;
      }
      setState({ loading: true, text: null, error: null });
      try {
        const fd = new FormData();
        fd.append('text', input.questionText ?? '');
        fd.append('script', '');
        fd.append('type', String(input.categoryId));
        fd.append('id', String(input.questionId));
        fd.append('lang', '');
        fd.append('practice', '1');
        fd.append('device', 'mobile');
        fd.append('selected', input.selected ?? '');
        fd.append('answer', input.correct ?? '');
        fd.append('correct', input.correct ?? '');

        const res = await apiClient.post(API_ENDPOINTS.SUBMIT_EXPLANATION, fd);
        const payload = res.data?.data ?? res.data ?? {};
        const text: string | null =
          (payload?.paragraph_explanation as string | undefined) ?? null;
        setState({ loading: false, text, error: null });
        return text;
      } catch (err) {
        logger.warn('[useSubmitExplanation] fetch failed', err);
        const msg =
          (err as { message?: string })?.message ??
          'Failed to load explanation';
        setState({ loading: false, text: null, error: msg });
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, submit, reset };
};
