/**
 * Coordinates exclusive ownership of the `react-native-nitro-sound` singleton.
 *
 * Only one consumer (recorder OR player) can hold the native handle at a
 * time. Each consumer registers itself via `acquire(id, onPreempt)` before
 * touching the library. If a second consumer acquires the slot, the previous
 * owner's `onPreempt` fires so it can reset its React state (mark itself as
 * not playing/recording) — preventing UI from being stuck "playing" while
 * the native player is already torn down.
 *
 * This is a low-level utility used by `useVoiceRecorder` and `useAudioPlayer`.
 * Screens should not interact with it directly.
 */

type OwnerKind = 'recorder' | 'player';

interface Owner {
  id: string;
  kind: OwnerKind;
  onPreempt: () => void;
  acquiredAt: number;
}

let currentOwner: Owner | null = null;

/**
 * If two acquires fire within this window we log a dev warning — it usually
 * indicates an event loop where one consumer keeps preempting another in
 * quick succession (e.g. uncoordinated re-renders).
 */
const PREEMPT_WARNING_WINDOW_MS = 100;
let lastPreemptAt = 0;

export const soundCoordinator = {
  acquire(id: string, kind: OwnerKind, onPreempt: () => void) {
    if (currentOwner && currentOwner.id !== id) {
      const now = Date.now();
      if (__DEV__ && now - lastPreemptAt < PREEMPT_WARNING_WINDOW_MS) {
        // eslint-disable-next-line no-console
        console.warn(
          `[soundCoordinator] rapid preempt detected: ${currentOwner.kind}(${currentOwner.id}) -> ${kind}(${id}) within ${now - lastPreemptAt}ms`,
        );
      }
      lastPreemptAt = now;
      try {
        currentOwner.onPreempt();
      } catch {
        // never let a consumer's cleanup throw across the coordinator
      }
    }
    currentOwner = { id, kind, onPreempt, acquiredAt: Date.now() };
  },

  release(id: string) {
    if (currentOwner?.id === id) {
      currentOwner = null;
    }
  },

  isOwner(id: string): boolean {
    return currentOwner?.id === id;
  },

  currentKind(): OwnerKind | null {
    return currentOwner?.kind ?? null;
  },

  /**
   * Test-only escape hatch. Module-level state would otherwise persist
   * across test runs, leaving zombie owners that fail subsequent acquires
   * silently. Production code should NEVER call this.
   */
  __resetForTests(): void {
    currentOwner = null;
    lastPreemptAt = 0;
  },
};
