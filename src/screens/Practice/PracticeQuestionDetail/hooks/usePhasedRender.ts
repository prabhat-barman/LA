import { useEffect, useState } from 'react';

export type RenderPhase = 1 | 2 | 3 | 4 | 5;

// Stages the screen mount in 5 phases so the heavy MediaConsole + collapsible
// panels + history list don't all build on the first frame. Resets back to
// phase 1 whenever `key` changes (typically `currentIndex`).
//
// We previously used InteractionManager.runAfterInteractions for phase 2
// gating, but that API is deprecated in RN 0.85+. A double-rAF achieves
// the same intent (yield until after the next paint) without the warning
// or its hefty stack trace in dev console.
export const usePhasedRender = (key: unknown): RenderPhase => {
  const [renderPhase, setRenderPhase] = useState<RenderPhase>(1);

  useEffect(() => {
    setRenderPhase(1);
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // First rAF lets the initial render commit, second lets the device
    // finish painting that frame before we step up phases — matches the
    // original "after interactions" intent without the deprecation noise.
    requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        setRenderPhase(2);
        requestAnimationFrame(() => {
          if (cancelled) return;
          setRenderPhase(3);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setRenderPhase(4);
              timers.push(
                setTimeout(() => {
                  if (cancelled) return;
                  setRenderPhase(5);
                }, 150),
              );
            }, 150),
          );
        });
      });
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [key]);

  return renderPhase;
};
