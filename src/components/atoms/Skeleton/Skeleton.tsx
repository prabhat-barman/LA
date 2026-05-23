import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const BASE_COLOR = '#E5E7EB';
const HIGHLIGHT_COLOR = '#F4F5F7';
const SHIMMER_DURATION = 1200;

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated shimmer placeholder. Pure JS — uses react-native-linear-gradient
 * (already in deps) plus the built-in Animated API. No new native modules.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: SHIMMER_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // Slide gradient from -100% to 100% horizontally
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[BASE_COLOR, HIGHLIGHT_COLOR, BASE_COLOR]}
          locations={[0.3, 0.5, 0.7]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

interface SkeletonCircleProps {
  size: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size, style }) => (
  <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: BASE_COLOR,
    overflow: 'hidden',
  },
});
