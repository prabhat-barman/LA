import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { useToast } from '../../../context/ToastContext';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import apiClient from '../../../services/apiClient';
import { logger } from '../../../services/logger';
import { QuestionRouter } from './components/QuestionRouter';
import type { SpeakingQuestionRef } from './components/SpeakingQuestion';
import { RunnerFooter } from './components/RunnerFooter';
import { SectionBreakOverlay } from './components/SectionBreakOverlay';
import { SubmissionRetryOverlay } from './components/SubmissionRetryOverlay';
import {
  buildFinalMockClosePayload,
  buildQueueItemId,
  buildRemainingQuesPayload,
  findSectionIndexForQuestion,
  formatRemainingTime,
  getSection,
  isAnswerComplete,
  OPTIONAL_LISTENING_BREAK_SEC,
  shouldOfferOptionalBreak,
} from './helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useMockSession } from './hooks/useMockSession';
import { useMockTimer } from './hooks/useMockTimer';
import { PENDING_MOCKS_QUERY_KEY } from './hooks/usePendingMocks';
import { PAST_MOCKS_QUERY_KEY } from '../MockTestResult/hooks/usePastMocks';
import {
  clearPersistedQueueForMock,
  useSubmitQueue,
} from './hooks/useSubmitQueue';
import { HEADER_PADDING_TOP, styles } from './styles';
import type {
  AnswerDraft,
  AnswerSubmission,
  QueueItem,
  SubmitContext,
} from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'MockTestRunner'>;

// Empty-draft singleton. Keeps `useMemo` referentially stable for any
// question without a recorded answer yet.
const EMPTY_DRAFT: AnswerDraft = { kind: 'empty' };

export const MockTestRunnerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mockId, variant, category, title, resume } = route.params;
  const isResume = Boolean(resume);
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const {
    data: session,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useMockSession({ mockId, variant, category, isResume });

  // Phase 2.2 — feed the mockId so the submit queue can hydrate any
  // failed items persisted from a previous (crashed / killed) session
  // and write fresh failures back to AsyncStorage as they happen.
  // Phase 2.3 — also pass variant / category / title so the on-disk
  // record carries enough metadata for the app-level recovery banner
  // on MockTestScreen to render friendly row labels.
  const submitQueue = useSubmitQueue({
    mockId,
    variant,
    category,
    title,
  });
  const queryClient = useQueryClient();

  // ── Runner-local state ────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  // Per-question draft store. Map keyed by question id (stringified to
  // dodge the number/string union from the backend).
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  // Distinct from `isFinalSubmitting` because the two paths converge
  // on different exits — final-submit shows "Mock test submitted"
  // toast, save-exit shows "Saved" and the test reappears in pending.
  const [isSavingExit, setIsSavingExit] = useState(false);
  // Which section in `session.sectionRanges` the user is currently
  // inside. Drives the timer's `initialSeconds` (per-section, not
  // whole-test) and decides whether `handleNext` advances normally
  // or interrupts with the section-break overlay. Reseeded from
  // `findSectionIndexForQuestion(session.sectionRanges, startIndex)`
  // on first load so resume drops the user back into the right
  // section's timer rather than the first section's.
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  // True while the section-break overlay is on screen. The user has
  // finished a section (or its timer expired) and the runner is
  // waiting for them to acknowledge before re-arming the next
  // section's timer.
  const [isOnSectionBreak, setIsOnSectionBreak] = useState(false);
  // Section-bump counter. Incremented every time we transition into a
  // new section. Used as part of the `useMockTimer` re-arm key so
  // identical-duration consecutive sections still re-arm the timer.
  // Without this, two sections both budgeted at e.g. 30min would
  // collapse into a single timer state and the second one would
  // immediately fire `onExpire` on entry.
  const [timerEpoch, setTimerEpoch] = useState(0);
  // Snapshot of the failed-submissions overlay state. `null` means
  // the overlay is hidden; the runner only opens it after a flush
  // returns with `allSucceeded: false`. We snapshot the failed-item
  // list at open-time so the overlay's preview stays stable while a
  // retry is in flight (the underlying queue items mutate as
  // pending → in-flight → succeeded/failed during retry).
  const [retryState, setRetryState] = useState<{
    failedItems: ReadonlyArray<QueueItem>;
    totalItems: number;
  } | null>(null);
  // True while `submitQueue.retryFailed()` is running. Locks both the
  // retry overlay CTAs and prevents finalize/save-exit from racing
  // a second flush against the retry.
  const [isRetrying, setIsRetrying] = useState(false);
  // Phase 2.2 — user-dismissed flag for the cross-restart recovery
  // banner. We don't auto-hide the banner just because the user taps
  // somewhere else: the items are real and they need attention. But
  // we DO let the user defer them ("I'll worry about it at finalize")
  // by dismissing the banner — the items stay in the queue and
  // surface again in the SubmissionRetryOverlay if finalize hits a
  // partial-success path.
  const [recoveryBannerDismissed, setRecoveryBannerDismissed] = useState(false);

  // Wall-clock anchor for "time spent on this question". Reset every
  // time the user advances; consumed by `buildSubmitContext` to populate
  // `q_time` in the SUBMIT_MOCK payload.
  const questionStartedAtRef = useRef<number>(Date.now());
  // Latest remaining-time value, in a ref so the auto-submit on
  // expire path can read it synchronously without re-rendering.
  const remainingSecRef = useRef(0);
  // Imperative handle into the active SpeakingQuestion (when one is
  // rendered). The runner reaches into it from `handleNext` to flush
  // an in-progress recording → `onRecordingComplete` fires → answer
  // map is populated → only then do we advance. Without this the
  // recorder would be torn down on unmount without the file path
  // ever surfacing into the SUBMIT_MOCK payload.
  const speakingRef = useRef<SpeakingQuestionRef>(null);

  // Sync currentIndex from session.startIndex on first load (resume).
  // Also pre-seed `currentSectionIndex` from the startIndex so the
  // timer below picks the right section's duration immediately. On
  // a fresh attempt both default to 0; on resume they jump together
  // so we don't briefly arm the Speaking timer for a user who's
  // really resuming in Reading.
  const syncedStartIndex = session?.startIndex ?? null;
  useEffect(() => {
    if (syncedStartIndex != null && session) {
      setCurrentIndex(syncedStartIndex);
      setCurrentSectionIndex(
        findSectionIndexForQuestion(session.sectionRanges, syncedStartIndex),
      );
      questionStartedAtRef.current = Date.now();
    }
  }, [syncedStartIndex, session]);

  // ── Per-section timer ────────────────────────────────────────────
  // PTE runs a separate timer per section. We model that by feeding
  // `useMockTimer` the CURRENT section's duration instead of the
  // whole test's. `rearmKey` includes `currentSectionIndex` so the
  // timer re-arms even when consecutive sections share an identical
  // duration (a real-world edge case for some sectional configs).
  //
  // Resume special-case: when `resume.remainingSecondsTotal` is
  // populated and we're entering the very first rendered section,
  // honor it as a section-scoped remaining time. Subsequent sections
  // use their full duration as normal.
  const currentSectionRange = session?.sectionRanges[currentSectionIndex];
  const initialTimerSeconds = useMemo(() => {
    if (!session || !currentSectionRange) return null;
    if (currentSectionRange.durationSec <= 0) return null;
    // Honor resume on the very first section we render, only once.
    // After the user crosses a section boundary we always use the
    // section's full duration — the backend's `remainingSecondsTotal`
    // doesn't carry per-section granularity in our current contract.
    if (
      resume?.remainingSecondsTotal &&
      currentSectionIndex ===
        findSectionIndexForQuestion(
          session.sectionRanges,
          session.startIndex,
        ) &&
      currentIndex === session.startIndex
    ) {
      return resume.remainingSecondsTotal;
    }
    return currentSectionRange.durationSec;
  }, [session, currentSectionRange, currentSectionIndex, currentIndex, resume]);

  const buildSubmitContext = useCallback(
    ({
      index,
      draft,
      isPending,
      isComplete,
    }: {
      index: number;
      draft: AnswerDraft;
      isPending: boolean;
      isComplete: boolean;
    }): SubmitContext | null => {
      if (!session) return null;
      const q = session.questions[index];
      if (!q) return null;

      const secondsSpentOnQuestion = Math.max(
        0,
        Math.floor((Date.now() - questionStartedAtRef.current) / 1000),
      );

      const answer: AnswerSubmission = {
        mockId,
        questionId: q.id,
        subcategoryId: q.subcategory_id,
        draft,
        submittedAt: Date.now(),
      };

      // Backend wants `audio_script` / `correct_answer` echoed back
      // from the raw question payload — pull them straight off
      // `q.raw` since they're not part of the normalized surface yet.
      const raw = (q.raw ?? {}) as {
        audio_script?: unknown;
        correct_answer?: unknown;
      };
      const audioScript =
        typeof raw.audio_script === 'string' ? raw.audio_script : null;
      const correctAnswer =
        typeof raw.correct_answer === 'string' ? raw.correct_answer : null;

      return {
        answer,
        questionNumber: index + 1,
        totalQuestions: session.questions.length,
        secondsSpentOnQuestion,
        remainingTotalSeconds: remainingSecRef.current,
        audioScript,
        correctAnswer,
        // Highlight (subcategory 19) is the only kind that produces
        // an HTML answer. Phase 1.1.b doesn't render it yet, so
        // always null here — wire it up alongside the highlight
        // component in the next pass.
        htmlAnswer: null,
        isPending,
        isComplete,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      };
    },
    [mockId, session],
  );

  // Navigates the user to the result screen after a successful
  // finalize. `replace` instead of `navigate` so back-swipe goes to
  // the mock-test list rather than back into the now-stale runner
  // (which would re-fetch and try to resume a completed test).
  //
  // The result screen handles its own loading / error states for
  // the score fetch, so we don't await anything here — we just
  // hand off and let it take over.
  const goToResultScreen = useCallback(() => {
    navigation.replace('MockTestResult', {
      mockId,
      variant,
      category,
      title,
    });
  }, [category, mockId, navigation, title, variant]);

  // Drains the queue, then either reveals the result screen on full
  // success or surfaces the retry overlay on partial failure. The
  // runner is no longer responsible for the post-submit toast —
  // showing the score IS the success confirmation.
  //
  // Final close signal: once every per-question submission has
  // succeeded, fire a fire-and-forget POST to SUBMIT_FAILED_MOCK
  // (`submitFailed/mock`). The legacy backend uses this as the
  // "attempt is done, run the grader" trigger; without it, scoring
  // would only kick off when the server-side timer expires. Failure
  // here is non-blocking — the score will still appear on the next
  // result-screen refresh once the backend eventually grades.
  const finalizeAndExit = useCallback(async () => {
    setIsFinalSubmitting(true);
    const result = await submitQueue.flush();
    setIsFinalSubmitting(false);
    // Either path (success or partial failure) means the test is no
    // longer "in progress" — drop it from the pending rail. Also
    // invalidate the past-mocks rail so the just-completed test
    // surfaces immediately when the user lands back on
    // MockTestScreen, rather than waiting out the hook's staleTime
    // (which would briefly hide a graded mock).
    queryClient.invalidateQueries({ queryKey: PENDING_MOCKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PAST_MOCKS_QUERY_KEY });
    if (result.allSucceeded) {
      apiClient
        .post(API_ENDPOINTS.SUBMIT_FAILED_MOCK, buildFinalMockClosePayload(mockId))
        .then(() => {
          logger.info('[MockTestRunner] final close signal posted', { mockId });
        })
        .catch(err => {
          logger.warn(
            '[MockTestRunner] final close signal failed (grading will fall back to server-side timer)',
            {
              mockId,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        });
      // Phase 2.2 — explicit clear in addition to the useEffect-based
      // clear in useSubmitQueue. The effect would fire from the
      // post-flush state change anyway, but the runner navigates away
      // synchronously below and we don't want to rely on effect
      // ordering for storage correctness.
      clearPersistedQueueForMock(mockId).catch(() => {});
      goToResultScreen();
      return;
    }
    setRetryState({
      failedItems: result.failedItems,
      totalItems: result.totalItems,
    });
  }, [goToResultScreen, mockId, queryClient, submitQueue]);

  // "Retry Failed" handler on the SubmissionRetryOverlay. Re-runs the
  // failed items with a fresh retry budget; on full success exits to
  // the mock-test list, on partial success re-opens the overlay with
  // the remaining failures.
  const handleRetrySubmissions = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const result = await submitQueue.retryFailed();
      queryClient.invalidateQueries({ queryKey: PENDING_MOCKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAST_MOCKS_QUERY_KEY });
      if (result.allSucceeded) {
        // Mirror the clean finalize path's close-signal too — without
        // it the backend's grader would still wait out the server-side
        // timer for any mock that exited via the retry overlay.
        apiClient
          .post(API_ENDPOINTS.SUBMIT_FAILED_MOCK, buildFinalMockClosePayload(mockId))
          .catch(err => {
            logger.warn(
              '[MockTestRunner] final close signal failed after retry',
              {
                mockId,
                error: err instanceof Error ? err.message : String(err),
              },
            );
          });
        // Same destination as the clean finalize path — close the
        // overlay first so the result screen doesn't render with
        // the overlay still mounted underneath.
        clearPersistedQueueForMock(mockId).catch(() => {});
        setRetryState(null);
        goToResultScreen();
        return;
      }
      // Partial — re-open the overlay with the residual failures so
      // the user can retry again or give up. We refresh the snapshot
      // from `result.failedItems`; the previously-failed items that
      // succeeded on this pass have already dropped out.
      setRetryState({
        failedItems: result.failedItems,
        totalItems: result.totalItems,
      });
    } finally {
      setIsRetrying(false);
    }
  }, [goToResultScreen, isRetrying, mockId, queryClient, submitQueue]);

  // "Exit Anyway" — user gives up on the failed submissions. We log
  // the forfeit so we can later correlate against backend gap data,
  // then navigate back.
  const handleRetryExitAnyway = useCallback(() => {
    if (isRetrying) return;
    logger.warn('[MockTestRunner] user exited with failed submissions', {
      mockId,
      failedCount: retryState?.failedItems.length ?? 0,
      totalCount: retryState?.totalItems ?? 0,
    });
    setRetryState(null);
    navigation.goBack();
  }, [isRetrying, mockId, navigation, retryState]);

  // Timer expired. Two distinct paths:
  //   1. NOT the last section → enqueue the current draft (and any
  //      unanswered tail) as non-final submissions, then surface the
  //      section-break overlay so the user can advance to the next
  //      section. Their unanswered questions in the dead section are
  //      flushed as empty drafts by `handleSectionContinue` when they
  //      tap Continue.
  //   2. LAST section → enqueue the current draft as the FINAL
  //      submission (`isComplete: true`) and call finalizeAndExit
  //      exactly like the manual Submit Test path.
  const handleExpire = useCallback(() => {
    if (!session) return;
    const isLastSection =
      currentSectionIndex >= session.sectionRanges.length - 1;
    const draft = answers[String(session.questions[currentIndex]?.id)] ?? EMPTY_DRAFT;
    const ctx = buildSubmitContext({
      index: currentIndex,
      draft,
      isPending: false,
      // Only the last section's expiry triggers a "complete" final
      // submission. Earlier sections' expiries are just section
      // boundaries from the queue's perspective.
      isComplete: isLastSection,
    });
    if (ctx) {
      submitQueue.enqueue({
        id: buildQueueItemId(mockId, ctx.answer.questionId),
        context: ctx,
      });
    }

    if (isLastSection) {
      finalizeAndExit().catch(() => {});
      logger.info('[MockTestRunner] final section timer expired — finalizing');
      return;
    }
    setIsOnSectionBreak(true);
    logger.info('[MockTestRunner] section timer expired — showing break', {
      sectionIndex: currentSectionIndex,
    });
  }, [
    answers,
    buildSubmitContext,
    currentIndex,
    currentSectionIndex,
    finalizeAndExit,
    mockId,
    session,
    submitQueue,
  ]);

  const { remainingSec, isExpired, isPaused } = useMockTimer({
    initialSeconds: initialTimerSeconds,
    onExpire: handleExpire,
    // Re-arm even when consecutive sections share an identical
    // duration. `timerEpoch` is bumped in `handleSectionContinue` so
    // crossing a section boundary always restarts the timer cleanly.
    rearmKey: `${currentSectionIndex}-${timerEpoch}`,
  });
  // Keep the ref in sync for `buildSubmitContext`'s synchronous reads.
  useEffect(() => {
    remainingSecRef.current = remainingSec;
  }, [remainingSec]);

  // ── Answer + advance handlers ─────────────────────────────────────
  const currentQuestion = session?.questions[currentIndex] ?? null;
  const currentDraft: AnswerDraft = currentQuestion
    ? answers[String(currentQuestion.id)] ?? EMPTY_DRAFT
    : EMPTY_DRAFT;

  const handleAnswerChange = useCallback(
    (draft: AnswerDraft) => {
      if (!currentQuestion) return;
      setAnswers(prev => ({
        ...prev,
        [String(currentQuestion.id)]: draft,
      }));
    },
    [currentQuestion],
  );

  // Auto-flush unanswered questions in the section we're crossing
  // out of, so the backend ends up with a record for every question
  // (empty submissions, but present). Without this, mid-section
  // navigation away — either via `handleNext` on the last question
  // of a section or via `handleExpire` when the section's timer
  // dies — would leave gaps that the final `complete=1` post can't
  // patch over.
  //
  // Dual-write strategy (matches the legacy 4-API contract):
  //   1. Fire ONE bulk POST to REMAINING_MOCK (`set/mockTime`) with
  //      the array of remaining ids. This is the cheap path the
  //      legacy backend was designed for — N=30 unanswered tail
  //      becomes 1 network round-trip instead of 30.
  //   2. Also enqueue each id individually via the submit queue so
  //      the retry / persistence machinery still has per-item
  //      visibility. If the bulk call fails outright (rare — the
  //      backend's parser ignores duplicate skips) the per-item
  //      submissions will still cover the tail.
  //
  // We enqueue from `currentIndex + 1` through the section's
  // `endIndex` inclusive. The CURRENT question is intentionally
  // skipped because the caller (`handleNext` / `handleExpire`)
  // already enqueued it with the right `isPending` / `isComplete`
  // flags for its specific path.
  const flushUnansweredSectionTail = useCallback(
    (sectionRange: { startIndex: number; endIndex: number }) => {
      if (!session) return;
      const remainingQuestionIds: (number | string)[] = [];
      for (
        let idx = currentIndex + 1;
        idx <= sectionRange.endIndex && idx < session.questions.length;
        idx += 1
      ) {
        const q = session.questions[idx];
        remainingQuestionIds.push(q.id);
        const draft = answers[String(q.id)] ?? EMPTY_DRAFT;
        const ctx = buildSubmitContext({
          index: idx,
          draft,
          isPending: false,
          isComplete: false,
        });
        if (ctx) {
          submitQueue.enqueue({
            id: buildQueueItemId(mockId, ctx.answer.questionId),
            context: ctx,
          });
        }
      }
      if (remainingQuestionIds.length === 0) return;
      const bulkPayload = buildRemainingQuesPayload({
        mockId,
        questionIds: remainingQuestionIds,
        remainingTotalSeconds: remainingSecRef.current,
      });
      // Fire-and-forget — the per-item queue above is the
      // source-of-truth for retry / persistence. We only log if the
      // bulk call fails because (a) it's optional defense in depth
      // and (b) the legacy URL `set/mockTime` may not be wired on
      // every backend deployment.
      apiClient
        .post(API_ENDPOINTS.REMAINING_MOCK, bulkPayload)
        .then(() => {
          logger.info('[MockTestRunner] bulk skip-remaining posted', {
            mockId,
            count: remainingQuestionIds.length,
          });
        })
        .catch(err => {
          logger.warn(
            '[MockTestRunner] bulk skip-remaining failed (per-item queue still active)',
            {
              mockId,
              count: remainingQuestionIds.length,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        });
    },
    [answers, buildSubmitContext, currentIndex, mockId, session, submitQueue],
  );

  // Performs the actual advance — extracted so the confirm-dialog
  // branch below can call it after the recording flush resolves.
  const advanceToNext = useCallback(() => {
    if (!session || !currentQuestion) return;

    const ctx = buildSubmitContext({
      index: currentIndex,
      draft: currentDraft,
      isPending: false,
      isComplete: false,
    });
    if (ctx) {
      submitQueue.enqueue({
        id: buildQueueItemId(mockId, ctx.answer.questionId),
        context: ctx,
      });
    }

    // Are we at the boundary of a section AND there's a next section?
    // If so, pause on the break overlay instead of silently rolling
    // into the next section's first question. The break gives the
    // user mental space to switch task types (Speaking → Writing is
    // a meaningful gear-shift) and clearly signals that the prior
    // section is locked.
    const sectionRange = session.sectionRanges[currentSectionIndex];
    if (
      sectionRange &&
      currentIndex === sectionRange.endIndex &&
      currentSectionIndex < session.sectionRanges.length - 1
    ) {
      setIsOnSectionBreak(true);
      return;
    }

    setCurrentIndex(idx => Math.min(idx + 1, session.questions.length - 1));
    questionStartedAtRef.current = Date.now();
  }, [
    buildSubmitContext,
    currentDraft,
    currentIndex,
    currentQuestion,
    currentSectionIndex,
    mockId,
    session,
    submitQueue,
  ]);

  // Confirmation gate before every Next press in mock tests. Mocks
  // are one-shot — once you advance you cannot return — so we mirror
  // the legacy app's "are you sure?" prompt to prevent accidental
  // skips, especially while a Speaking recording is still capturing
  // audio. On confirm we await `finishRecording` so the recorder's
  // file path lands in the answer map before `advanceToNext` enqueues
  // the SUBMIT_MOCK payload.
  const handleNext = useCallback(() => {
    if (!session || !currentQuestion) return;
    Alert.alert(
      'Move to next question?',
      'You won\u2019t be able to return to this question.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Next',
          onPress: () => {
            void (async () => {
              try {
                await speakingRef.current?.finishRecording();
              } catch (err) {
                logger.warn(
                  '[MockTestRunner] finishRecording on Next failed',
                  err instanceof Error ? err.message : String(err),
                );
              }
              advanceToNext();
            })();
          },
        },
      ],
    );
  }, [advanceToNext, currentQuestion, session]);

  // Called when the user dismisses the section-break overlay. Flushes
  // any not-yet-submitted questions in the completed section, jumps
  // to the next section's first question, bumps `timerEpoch` so the
  // timer re-arms even if the next section has the same duration,
  // and hides the overlay.
  const handleSectionContinue = useCallback(() => {
    if (!session) return;
    const completedRange = session.sectionRanges[currentSectionIndex];
    if (completedRange) {
      flushUnansweredSectionTail(completedRange);
    }
    const nextSectionIdx = currentSectionIndex + 1;
    const nextRange = session.sectionRanges[nextSectionIdx];
    if (!nextRange) {
      // Defensive — only crossing into an existing next section.
      // Without one the user shouldn't see the overlay at all.
      setIsOnSectionBreak(false);
      return;
    }
    setCurrentSectionIndex(nextSectionIdx);
    setCurrentIndex(nextRange.startIndex);
    setTimerEpoch(e => e + 1);
    questionStartedAtRef.current = Date.now();
    setIsOnSectionBreak(false);
  }, [currentSectionIndex, flushUnansweredSectionTail, session]);

  // Save & Exit. Posts the current draft with `isPending=true` so the
  // backend stashes the attempt under PENDING_TEST_LIST. The user can
  // then resume from the mock-list screen, which routes back to the
  // runner with the `resume` param populated.
  //
  // We deliberately DON'T enqueue prior questions on save-exit — those
  // have already been submitted as the user advanced past them via
  // `handleNext`. Only the current in-progress draft needs the pending
  // flag set so the backend knows where to drop the user back in.
  const handleSaveExit = useCallback(() => {
    if (!session || !currentQuestion || isSavingExit || isFinalSubmitting) {
      return;
    }
    Alert.alert(
      'Save and exit?',
      'Your progress will be saved. You can resume this test from the In Progress list later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & Exit',
          style: 'destructive',
          onPress: () => {
            setIsSavingExit(true);
            const ctx = buildSubmitContext({
              index: currentIndex,
              draft: currentDraft,
              isPending: true,
              isComplete: false,
            });
            if (ctx) {
              submitQueue.enqueue({
                id: buildQueueItemId(mockId, ctx.answer.questionId),
                context: ctx,
              });
            }
            submitQueue
              .flush()
              .then(result => {
                setIsSavingExit(false);
                // Force the In Progress rail to re-fetch so the
                // newly-saved attempt shows up immediately when the
                // user lands back on the mock-test list. Without
                // this, React Query's 30s staleTime would briefly
                // hide the entry.
                queryClient.invalidateQueries({
                  queryKey: PENDING_MOCKS_QUERY_KEY,
                });
                if (result.allSucceeded) {
                  showToast(
                    'Progress saved. Resume from the In Progress list.',
                    'success',
                  );
                  navigation.goBack();
                  return;
                }
                // Partial failure on save-exit. Open the same retry
                // overlay as finalizeAndExit so the user can retry
                // before leaving — once they exit, those items are
                // gone (cross-restart persistence ships in Phase 2.2).
                setRetryState({
                  failedItems: result.failedItems,
                  totalItems: result.totalItems,
                });
              })
              .catch(() => {
                setIsSavingExit(false);
                showToast(
                  'We could not save your progress. Please try again.',
                  'error',
                );
              });
            logger.info('[MockTestRunner] Save & Exit triggered', {
              mockId,
              questionIndex: currentIndex,
            });
          },
        },
      ],
    );
  }, [
    buildSubmitContext,
    currentDraft,
    currentIndex,
    currentQuestion,
    isFinalSubmitting,
    isSavingExit,
    mockId,
    navigation,
    queryClient,
    session,
    showToast,
    submitQueue,
  ]);

  // Submit Test confirm + finalize. Mirrors handleNext's pattern:
  // (1) confirm so a stray tap doesn't end the attempt, (2) flush any
  // in-flight Speaking recording so the last question's audio path
  // lands in the answer map before `buildSubmitContext` captures it.
  const handleFinalSubmit = useCallback(() => {
    if (!session || !currentQuestion) return;
    Alert.alert(
      'Submit test?',
      'Once submitted, you cannot change any answers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await speakingRef.current?.finishRecording();
              } catch (err) {
                logger.warn(
                  '[MockTestRunner] finishRecording on Submit failed',
                  err instanceof Error ? err.message : String(err),
                );
              }
              const ctx = buildSubmitContext({
                index: currentIndex,
                draft: currentDraft,
                isPending: false,
                isComplete: true,
              });
              if (ctx) {
                submitQueue.enqueue({
                  id: buildQueueItemId(mockId, ctx.answer.questionId),
                  context: ctx,
                });
              }
              finalizeAndExit().catch(() => {});
            })();
          },
        },
      ],
    );
  }, [
    buildSubmitContext,
    currentDraft,
    currentIndex,
    currentQuestion,
    finalizeAndExit,
    mockId,
    session,
    submitQueue,
  ]);

  // ── Derived UI fields ─────────────────────────────────────────────
  const sectionLabel = currentQuestion
    ? getSection(currentQuestion.subcategory_id)
    : category;
  const variantLabel = variant === 'full' ? 'Full Mock' : 'Extensive Mock';
  const isLastQuestion =
    !!session && currentIndex >= session.questions.length - 1;
  // True when the user is on the last question of a section that
  // ISN'T the last section of the test. Drives the footer's
  // "End Section" relabel — tapping the primary CTA at this point
  // triggers the section-break overlay rather than advancing in
  // place. Cheap to compute on every render; no memo needed.
  const isAtSectionBoundary =
    !!session &&
    !isLastQuestion &&
    !!session.sectionRanges[currentSectionIndex] &&
    currentIndex === session.sectionRanges[currentSectionIndex].endIndex &&
    currentSectionIndex < session.sectionRanges.length - 1;
  const canSubmit = isAnswerComplete(currentDraft);

  // ── Render branches ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <RunnerHeader
          title={title}
          subtitle={`${variantLabel} · ${category} · #${mockId}`}
          topInset={insets.top}
        />
        <View style={styles.body}>
          <ActivityIndicator color="#1A2151" />
          <Text style={styles.placeholder}>Loading your mock test…</Text>
        </View>
      </View>
    );
  }

  if (isError || !session) {
    const message =
      error instanceof Error ? error.message : 'Could not load this mock test.';
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <RunnerHeader
          title={title}
          subtitle={`${variantLabel} · ${category} · #${mockId}`}
          topInset={insets.top}
        />
        <View style={styles.body}>
          <Text style={styles.errorText}>{message}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => refetch()}
              disabled={isRefetching}
            >
              <Text style={styles.primaryBtnText}>
                {isRefetching ? 'Retrying…' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <RunnerHeader
        title={title}
        subtitle={`${variantLabel} · ${sectionLabel} · Q${currentIndex + 1} of ${session.questions.length}`}
        timerText={formatRemainingTime(remainingSec)}
        timerVariant={
          isExpired ? 'expired' : remainingSec < 60 ? 'warn' : 'normal'
        }
        isPaused={isPaused}
        topInset={insets.top}
      />

      {/* Phase 2.2 — Cross-restart recovery banner.
          Renders only when:
          1. The hook hydrated at least one item from AsyncStorage
             (`restoredCount > 0`) on this mount.
          2. There's still at least one failed item in the queue —
             the banner self-hides once retries succeed.
          3. The user hasn't explicitly dismissed it.
          4. Nothing else needs the user's attention (section break /
             retry overlay are already modal).
          Tap "Retry" → routes through the existing retry pipeline so
          partial failures land back on SubmissionRetryOverlay. */}
      {submitQueue.restoredCount > 0 &&
        !submitQueue.isHydrating &&
        !recoveryBannerDismissed &&
        !isOnSectionBreak &&
        !retryState &&
        submitQueue.items.some(i => i.status === 'failed') && (
          <View style={styles.recoveryBanner}>
            <View style={styles.recoveryBannerText}>
              <Text style={styles.recoveryBannerTitle}>
                {submitQueue.restoredCount}{' '}
                {submitQueue.restoredCount === 1 ? 'answer' : 'answers'} from
                your previous session
              </Text>
              <Text style={styles.recoveryBannerSubtitle}>
                We&apos;ll try them again now, or you can dismiss and let
                them go out when you finish the test.
              </Text>
            </View>
            <View style={styles.recoveryBannerActions}>
              <TouchableOpacity
                onPress={() => setRecoveryBannerDismissed(true)}
                style={styles.recoveryBannerDismissBtn}
                accessibilityRole="button"
                accessibilityLabel="Dismiss recovery banner"
              >
                <Text style={styles.recoveryBannerDismissText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRetrySubmissions}
                disabled={isRetrying}
                style={[
                  styles.recoveryBannerRetryBtn,
                  isRetrying && styles.recoveryBannerRetryBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Retry restored answers now"
              >
                <Text style={styles.recoveryBannerRetryText}>
                  {isRetrying ? 'Retrying…' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentQuestion ? (
          <View style={styles.questionCard}>
            <Text style={styles.kindPill}>{currentQuestion.kind}</Text>
            {currentQuestion.title && (
              <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            )}
            <QuestionRouter
              ref={speakingRef}
              question={currentQuestion}
              draft={currentDraft}
              onAnswerChange={handleAnswerChange}
              hideStopButton
            />
          </View>
        ) : (
          <Text style={styles.placeholder}>No question at index {currentIndex}.</Text>
        )}
      </ScrollView>

      <RunnerFooter
        isLastQuestion={isLastQuestion}
        isEndOfSection={isAtSectionBoundary}
        canSubmit={canSubmit}
        isSubmitting={isFinalSubmitting}
        isSavingExit={isSavingExit}
        onNext={handleNext}
        onFinalSubmit={handleFinalSubmit}
        // Save & Exit is hidden on the last question — finishing the
        // test by tapping the primary "Submit Test" CTA is the
        // expected exit path there, and a Save & Exit there would
        // create a confusing "saved a complete answer" state.
        onSaveExit={isLastQuestion ? undefined : handleSaveExit}
        bottomInset={insets.bottom}
      />

      {/* Section break overlay — sits above the runner but below the
          submitting overlay. Only one of the two can be active because
          finalize is a terminal state that doesn't loop back into
          another section. */}
      {isOnSectionBreak &&
        session &&
        session.sectionRanges[currentSectionIndex] &&
        session.sectionRanges[currentSectionIndex + 1] && (
          <SectionBreakOverlay
            completedSection={
              session.sectionRanges[currentSectionIndex].section
            }
            nextSection={
              session.sectionRanges[currentSectionIndex + 1].section
            }
            nextSectionQuestionCount={
              session.sectionRanges[currentSectionIndex + 1].endIndex -
              session.sectionRanges[currentSectionIndex + 1].startIndex +
              1
            }
            nextSectionDurationSec={
              session.sectionRanges[currentSectionIndex + 1].durationSec
            }
            onContinue={handleSectionContinue}
            // Phase 3.1: surface the optional 10-min PTE-style break
            // only between Reading and Listening in a Full Mock. Every
            // other section transition keeps the simple "Take a
            // breath" variant (no countdown).
            breakDurationSec={
              shouldOfferOptionalBreak(
                session.sectionRanges[currentSectionIndex].section,
                session.sectionRanges[currentSectionIndex + 1].section,
                session.variant,
              )
                ? OPTIONAL_LISTENING_BREAK_SEC
                : undefined
            }
          />
        )}

      {/* Submission retry overlay — shown after a flush that ended in
          partial failure. Mutually exclusive with the submitting
          overlay (which is the spinner DURING the flush) and the
          section-break overlay (different runner state machine). */}
      {retryState && (
        <SubmissionRetryOverlay
          failedItems={retryState.failedItems}
          totalItems={retryState.totalItems}
          onRetry={() => {
            handleRetrySubmissions().catch(() => {});
          }}
          onExit={handleRetryExitAnyway}
          isRetrying={isRetrying}
        />
      )}

      {isFinalSubmitting && (
        <View style={styles.submittingOverlay}>
          <View style={styles.submittingCard}>
            <ActivityIndicator color="#1A2151" />
            <Text style={styles.submittingTitle}>Submitting your test…</Text>
            {submitQueue.items.length > 0 && (
              <Text style={styles.submittingMeta}>
                {submitQueue.items.filter(i => i.status === 'succeeded').length}{' '}
                of {submitQueue.items.length} answers uploaded
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

interface HeaderProps {
  title: string;
  subtitle: string;
  timerText?: string;
  timerVariant?: 'normal' | 'warn' | 'expired';
  isPaused?: boolean;
  // Safe-area inset (status bar / dynamic island height) injected
  // by the parent. Added to the header's own top padding so content
  // never renders under the notch.
  topInset: number;
}

const RunnerHeader: React.FC<HeaderProps> = ({
  title,
  subtitle,
  timerText,
  timerVariant = 'normal',
  isPaused = false,
  topInset,
}) => (
  <View style={[styles.header, { paddingTop: HEADER_PADDING_TOP + topInset }]}>
    <View style={styles.headerTextCol}>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.headerMeta} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    {timerText !== undefined && (
      <View
        style={[
          styles.timerPill,
          timerVariant === 'warn' && styles.timerPillWarn,
          timerVariant === 'expired' && styles.timerPillExpired,
        ]}
      >
        <Text style={styles.timerPillText}>
          {isPaused ? '⏸ ' : ''}
          {timerText}
        </Text>
      </View>
    )}
  </View>
);

export default MockTestRunnerScreen;
