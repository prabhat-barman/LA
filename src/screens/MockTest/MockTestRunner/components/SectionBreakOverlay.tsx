import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, TouchableOpacity, View } from 'react-native';
import { formatRemainingTime } from '../helpers';
import { styles } from '../styles';
import type { MockSection } from '../types';

interface Props {
  // The section the user just finished. Surfaced in the eyebrow so
  // the user knows their previous work was saved before the break.
  completedSection: MockSection;
  // The next section's metadata. We avoid passing the full session /
  // ranges so this component stays trivially testable in isolation.
  nextSection: MockSection;
  nextSectionQuestionCount: number;
  nextSectionDurationSec: number;
  // Triggered when the user taps Continue (or when the optional
  // countdown expires). The runner advances `currentIndex` to the
  // first question of the next section and re-seeds the timer.
  onContinue: () => void;
  // ── Optional countdown variant (Phase 3.1) ───────────────────────
  //
  // When provided, the overlay shifts into a "10-min optional break"
  // mode used in Full Mock between Reading and Listening:
  //   • A large countdown clock replaces the "Take a breath" subline
  //   • The CTA becomes "Skip Break" (still wired to `onContinue`)
  //   • When the countdown reaches zero, `onContinue` fires automatically
  //
  // When omitted/undefined, the overlay renders the original simple
  // between-section variant. Sectional mocks never see either variant.
  breakDurationSec?: number;
}

// Local countdown hook. Lives inside this component file (not in the
// hooks folder) because nothing else needs it — a between-sections
// countdown is so specific to this overlay that lifting it would be
// premature abstraction.
//
// Pauses when the app backgrounds so the user doesn't lose break time
// to a push notification or app-switcher. Resumes when foregrounded.
// Final fire of `onComplete` is guarded by a ref flag — React Strict
// Mode + AppState listener teardown can otherwise double-invoke it.
const useBreakCountdown = (
  durationSec: number | undefined,
  onComplete: () => void,
) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    durationSec ?? 0,
  );
  // Re-seed when the duration changes from undefined → number (i.e.
  // a Listening break opens after a Reading section ends). Without
  // this, the countdown would never start if the prop arrived later
  // than the first render.
  useEffect(() => {
    if (durationSec != null) {
      setSecondsRemaining(durationSec);
      firedRef.current = false;
    }
  }, [durationSec]);

  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  // Keep the latest `onComplete` accessible without re-arming the
  // interval every render. Same pattern as `useMockTimer`.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (durationSec == null) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let active = AppState.currentState === 'active';

    const startTicking = () => {
      if (intervalId != null) return;
      intervalId = setInterval(() => {
        setSecondsRemaining(prev => {
          const next = prev - 1;
          if (next <= 0) {
            if (!firedRef.current) {
              firedRef.current = true;
              onCompleteRef.current();
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    };

    const stopTicking = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (active) startTicking();

    const sub = AppState.addEventListener('change', state => {
      const nowActive = state === 'active';
      if (nowActive && !active) startTicking();
      else if (!nowActive && active) stopTicking();
      active = nowActive;
    });

    return () => {
      stopTicking();
      sub.remove();
    };
  }, [durationSec]);

  return secondsRemaining;
};

// Full-bleed overlay shown between sections of a Full Mock (e.g. after
// Speaking ends and before Writing begins). For sectional mocks
// (single-section) this overlay never renders because the runner's
// section-break logic short-circuits when `sectionRanges.length === 1`.
//
// Two variants:
//   1. Simple (default) — "Take a breath" + Continue CTA. PTE convention
//      is that the user controls when they're ready.
//   2. Countdown (when `breakDurationSec` is provided) — used for the
//      optional 10-min break before Listening in a Full Mock. Big
//      mm:ss timer + "Skip Break" CTA. Auto-continues on expiry.
export const SectionBreakOverlay: React.FC<Props> = ({
  completedSection,
  nextSection,
  nextSectionQuestionCount,
  nextSectionDurationSec,
  onContinue,
  breakDurationSec,
}) => {
  const secondsRemaining = useBreakCountdown(breakDurationSec, onContinue);
  const isCountdown = breakDurationSec != null;

  return (
    <View
      style={styles.sectionBreakOverlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <View style={styles.sectionBreakCard}>
        <Text style={styles.sectionBreakEyebrow}>
          {completedSection} Complete
        </Text>

        {isCountdown ? (
          <>
            <Text style={styles.sectionBreakTitle}>Optional 10-min break</Text>
            <Text style={styles.sectionBreakSubtitle}>
              The real PTE Academic test offers a 10-minute break before
              Listening. Use it to stretch or rest your eyes — or skip
              ahead whenever you&apos;re ready.
            </Text>
            <View
              style={styles.sectionBreakCountdownWrap}
              accessibilityLabel={`Break ends in ${formatRemainingTime(secondsRemaining)}`}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.sectionBreakCountdownLabel}>
                Break ends in
              </Text>
              <Text style={styles.sectionBreakCountdownValue}>
                {formatRemainingTime(secondsRemaining)}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionBreakTitle}>Take a breath</Text>
            <Text style={styles.sectionBreakSubtitle}>
              Your {completedSection.toLowerCase()} answers have been saved.
              When you tap Continue, the {nextSection.toLowerCase()} timer
              will start and you won&apos;t be able to return.
            </Text>
          </>
        )}

        <View style={styles.sectionBreakDetails}>
          <Text style={styles.sectionBreakDetailLabel}>Next section</Text>
          <Text style={styles.sectionBreakDetailValue}>{nextSection}</Text>
          <Text style={styles.sectionBreakDetailMeta}>
            {nextSectionQuestionCount}{' '}
            {nextSectionQuestionCount === 1 ? 'question' : 'questions'}
            {nextSectionDurationSec > 0
              ? ` · ${formatRemainingTime(nextSectionDurationSec)} on the clock`
              : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sectionBreakContinueBtn}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={
            isCountdown
              ? `Skip break and continue to the ${nextSection} section`
              : `Continue to the ${nextSection} section`
          }
        >
          <Text style={styles.sectionBreakContinueBtnText}>
            {isCountdown ? 'Skip Break' : `Continue to ${nextSection}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SectionBreakOverlay;
