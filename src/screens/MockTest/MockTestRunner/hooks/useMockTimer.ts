import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Wall-clock based test timer.
//
// Why wall-clock and not a decrementing counter? AppState pauses,
// JS-thread stalls, and setInterval drift would otherwise let the user
// silently gain time. We compute `remaining = endsAt - Date.now()` on
// every tick, so the displayed value is always correct relative to
// real time regardless of how many ticks the JS thread ate.
//
// `pauseInBackground` is opt-in. When true (default), the timer is
// paused whenever the app goes to background / inactive — we capture
// the paused-at timestamp, then shift `endsAt` forward by the elapsed
// background time on resume so the user doesn't lose time while the
// app was suspended. Real PTE doesn't do this, but the in-app mock
// experience is friendlier when interruptions don't cost the user.
export interface UseMockTimerArgs {
  // Total seconds the test starts with. Set to null when the session
  // hasn't loaded yet — the hook stays inert.
  initialSeconds: number | null;
  // Called once when the timer first hits zero. Fires only one time
  // per arm cycle (resetting the timer re-arms the notification).
  onExpire?: () => void;
  pauseInBackground?: boolean;
  // Optional cache-busting key. The arming effect re-runs whenever
  // EITHER `initialSeconds` OR `rearmKey` changes. Useful when a
  // consumer wants to re-arm with the same numeric duration (e.g.
  // crossing into a new Full Mock section whose duration happens to
  // match the prior section's). Without this, the effect's `[deps]`
  // wouldn't observe the change and `onExpire` could fire
  // immediately on entry to the new section.
  rearmKey?: string | number;
}

export interface MockTimerState {
  remainingSec: number;
  isExpired: boolean;
  // True while the user has backgrounded the app. The visible value
  // freezes during this state; the wall-clock catches up on resume.
  isPaused: boolean;
}

export const useMockTimer = ({
  initialSeconds,
  onExpire,
  pauseInBackground = true,
  rearmKey,
}: UseMockTimerArgs): MockTimerState => {
  // `endsAt` is the source of truth — null means the timer is not
  // armed (session still loading). Stored in state so re-arming
  // (changing `initialSeconds`) re-renders.
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  // Refs to avoid re-subscribing AppState listener / re-arming the
  // interval on every tick.
  const pausedAtRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);
  onExpireRef.current = onExpire;

  // Arm / re-arm the timer when `initialSeconds` changes OR when the
  // consumer bumps `rearmKey` (e.g. crossing a Full Mock section
  // boundary into a same-duration section). `rearmKey` is included
  // in the dep array so identical-duration re-arms still fire.
  useEffect(() => {
    if (initialSeconds == null || initialSeconds <= 0) {
      setEndsAt(null);
      setRemainingSec(0);
      expiredRef.current = initialSeconds === 0;
      return;
    }
    setEndsAt(Date.now() + initialSeconds * 1000);
    setRemainingSec(Math.floor(initialSeconds));
    expiredRef.current = false;
  }, [initialSeconds, rearmKey]);

  // Tick loop. Wall-clock based — never drifts.
  useEffect(() => {
    if (endsAt == null) return undefined;

    const tick = () => {
      if (pausedAtRef.current != null) return;
      const remaining = Math.max(
        0,
        Math.ceil((endsAt - Date.now()) / 1000),
      );
      setRemainingSec(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    // Tick immediately so the first frame after mount doesn't show
    // a stale "0:00" for ~1s before catching up.
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  // AppState pause/resume. We shift `endsAt` forward by however long
  // the user was backgrounded so they keep their full remaining time.
  useEffect(() => {
    if (!pauseInBackground) return undefined;

    const handler = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (pausedAtRef.current == null) {
          pausedAtRef.current = Date.now();
        }
      } else if (state === 'active' && pausedAtRef.current != null) {
        const elapsed = Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
        setEndsAt(prev => (prev == null ? prev : prev + elapsed));
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [pauseInBackground]);

  // `isPaused` is derived for the consumer — the ref isn't reactive
  // on its own, so we expose a memoized computation off the ref's
  // boolean-presence checked at render time. Good enough for UI.
  const computeIsPaused = useCallback(() => pausedAtRef.current != null, []);
  const isPaused = computeIsPaused();

  return {
    remainingSec,
    isExpired: expiredRef.current,
    isPaused,
  };
};
