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
}

let currentOwner: Owner | null = null;

export const soundCoordinator = {
  acquire(id: string, kind: OwnerKind, onPreempt: () => void) {
    if (currentOwner && currentOwner.id !== id) {
      try {
        currentOwner.onPreempt();
      } catch {
        // never let a consumer's cleanup throw across the coordinator
      }
    }
    currentOwner = { id, kind, onPreempt };
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
};
