import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export type RenderPhase = 1 | 2 | 3 | 4 | 5;

// Stages the screen mount in 5 phases so the heavy MediaConsole + collapsible
// panels + history list don't all build on the first frame. Resets back to
// phase 1 whenever `key` changes (typically `currentIndex`).
export const usePhasedRender = (key: unknown): RenderPhase => {
  const [renderPhase, setRenderPhase] = useState<RenderPhase>(1);

  useEffect(() => {
    setRenderPhase(1);
    const interaction = InteractionManager.runAfterInteractions(() => {
      setRenderPhase(2);
      requestAnimationFrame(() => {
        setRenderPhase(3);
        setTimeout(() => {
          setRenderPhase(4);
          setTimeout(() => {
            setRenderPhase(5);
          }, 150);
        }, 150);
      });
    });
    return () => interaction.cancel();
  }, [key]);

  return renderPhase;
};
