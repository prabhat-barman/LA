/**
 * Lightweight pub-sub store that keeps the picked tag colour for a question
 * in sync across screens (list ↔ detail) without an extra network call.
 *
 * The store is a single module-level Map plus a Set of subscribers. Screens
 * write to it whenever they persist a tag change locally, and they subscribe
 * to read changes made elsewhere. Items with colour `none` are simply absent
 * from the map.
 */

export type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';
export type TaggableId = string | number;

type Listener = () => void;

const colorById = new Map<TaggableId, Exclude<TagColor, 'none'>>();
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      // Swallow listener errors to avoid breaking the broadcast loop.
    }
  });
};

export const tagColorStore = {
  /** Returns the stored colour for an id, or `none` if untagged. */
  get(id: TaggableId): TagColor {
    return colorById.get(id) ?? 'none';
  },

  /** Returns a shallow snapshot of all currently-coloured ids. */
  snapshot(): Map<TaggableId, Exclude<TagColor, 'none'>> {
    return new Map(colorById);
  },

  /** Sets a single colour and notifies listeners if the value actually changed. */
  set(id: TaggableId, color: TagColor) {
    const prev = colorById.get(id);
    if (color === 'none') {
      if (prev === undefined) return;
      colorById.delete(id);
    } else {
      if (prev === color) return;
      colorById.set(id, color);
    }
    notify();
  },

  /**
   * Seeds many ids at once (used after a list/detail fetch). Listeners are
   * notified once at the end if anything changed.
   */
  seed(entries: Iterable<[TaggableId, TagColor]>) {
    let changed = false;
    for (const [id, color] of entries) {
      const prev = colorById.get(id);
      if (color === 'none') {
        if (prev !== undefined) {
          colorById.delete(id);
          changed = true;
        }
      } else if (prev !== color) {
        colorById.set(id, color);
        changed = true;
      }
    }
    if (changed) notify();
  },

  /** Subscribe to any change. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
