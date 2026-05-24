import React, { memo, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { MicSolidIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';

interface MicPulseProps {
  active: boolean;
}

const MicPulseComponent: React.FC<MicPulseProps> = ({ active }) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let composite: Animated.CompositeAnimation | null = null;
    if (active) {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.6,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
      composite = Animated.parallel([
        createPulse(pulse1, 0),
        createPulse(pulse2, 300),
        createPulse(pulse3, 600),
      ]);
      composite.start();
    } else {
      [pulse1, pulse2, pulse3].forEach(p =>
        Animated.timing(p, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(),
      );
    }
    return () => {
      composite?.stop();
    };
  }, [active, pulse1, pulse2, pulse3]);

  return (
    <View style={styles.pulseContainer}>
      {[pulse1, pulse2, pulse3].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: anim }],
              opacity: anim.interpolate({
                inputRange: [1, 1.6],
                outputRange: [active ? 0.3 - i * 0.08 : 0, 0],
              }),
              width: scale(72 + i * 24),
              height: scale(72 + i * 24),
              borderRadius: scale(36 + i * 12),
            },
          ]}
        />
      ))}
      <View style={[styles.micCircle, active && styles.micCircleActive]}>
        <MicSolidIcon
          size={scale(36)}
          color={active ? '#FFFFFF' : '#94C23C'}
        />
      </View>
    </View>
  );
};

export const MicPulse = memo(MicPulseComponent);
