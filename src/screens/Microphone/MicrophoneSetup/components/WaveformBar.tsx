import React, { memo, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { scale } from '../scale';
import { styles } from '../styles';

interface WaveformBarProps {
  // `index` is kept on the prop type so callers stay self-documenting
  // even though the component doesn't currently use it internally.
  index: number;
  isActive: boolean;
  amplitude: number;
}

const WaveformBarComponent: React.FC<WaveformBarProps> = ({
  isActive,
  amplitude,
}) => {
  const anim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Keep the loop instance in scope so we can stop it on unmount or when
    // isActive flips back to false — otherwise the loop keeps running and
    // leaks animation work on Android.
    const loop = isActive
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.2 + amplitude * Math.random(),
              duration: 150 + Math.random() * 250,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.1,
              duration: 100 + Math.random() * 150,
              useNativeDriver: false,
            }),
          ]),
        )
      : null;

    if (loop) {
      loop.start();
    } else {
      Animated.timing(anim, {
        toValue: 0.15,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      loop?.stop();
    };
  }, [isActive, amplitude, anim]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [scale(4), scale(48)],
  });

  const color = isActive ? '#94C23C' : '#D1D5DB';

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height,
          backgroundColor: color,
          opacity: isActive ? 1 : 0.4,
        },
      ]}
    />
  );
};

export const WaveformBar = memo(WaveformBarComponent);
