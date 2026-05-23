import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { mediaStyles, scale } from './styles';

interface WaveformBarProps {
  /**
   * Either a plain number (0..1) — bar will animate its own loop using this as
   * the upper bound — or a shared `Animated.Value` driven by the recorder.
   * Prefer the `Animated.Value` form for live metering (zero re-renders).
   */
  amplitude: Animated.Value | number;
  isActive: boolean;
  /** Optional per-bar delay multiplier for staggered loop randomness. */
  seed?: number;
}

/**
 * Single animated waveform bar. Two modes:
 *
 * 1. **Driven** (when `amplitude` is an `Animated.Value`) — the bar height is
 *    interpolated directly from the shared value. Best for live recording
 *    where the recorder hook pushes amplitude updates without re-rendering.
 *
 * 2. **Looped** (when `amplitude` is a number) — the bar runs an internal
 *    pseudo-random loop bounded by the amplitude. Useful for screens that
 *    just want a "we're listening" idle animation.
 */
export const WaveformBar: React.FC<WaveformBarProps> = ({
  amplitude,
  isActive,
  seed = Math.random(),
}) => {
  const internalAnim = useRef(new Animated.Value(0.2)).current;
  const isShared = typeof amplitude !== 'number';

  useEffect(() => {
    if (isShared) return;

    const numericAmp = amplitude as number;
    const loop = isActive
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(internalAnim, {
              toValue: 0.2 + numericAmp * seed,
              duration: 150 + seed * 250,
              useNativeDriver: false,
            }),
            Animated.timing(internalAnim, {
              toValue: 0.2,
              duration: 150 + seed * 250,
              useNativeDriver: false,
            }),
          ]),
        )
      : null;
    loop?.start();
    return () => {
      loop?.stop();
      internalAnim.setValue(0.2);
    };
  }, [amplitude, internalAnim, isActive, isShared, seed]);

  const source = isShared ? (amplitude as Animated.Value) : internalAnim;
  const height = source.interpolate({
    inputRange: [0, 1],
    outputRange: [scale(4), scale(40)],
  });

  return (
    <Animated.View
      style={[
        mediaStyles.waveformBar,
        { height, opacity: isActive ? 1 : 0.4 },
      ]}
    />
  );
};
