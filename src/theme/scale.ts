import { Dimensions, PixelRatio } from 'react-native';

// Single shared scale helper. Several feature folders maintain their
// own copy of `(screenWidth / 375) * size`; this is the canonical
// implementation new code should reach for.
const { width } = Dimensions.get('window');

export const screenWidth = width;
export const BASE_DESIGN_WIDTH = 375;

export const scale = (size: number) => (width / BASE_DESIGN_WIDTH) * size;

// Verticalized variant for components whose proportions follow
// height (rare today, included for future use).
export const verticalScale = (size: number) => {
  const { height } = Dimensions.get('window');
  return (height / 812) * size;
};

// Round to nearest pixel — keeps borders crisp on Android density buckets.
export const sharp = (value: number) => PixelRatio.roundToNearestPixel(value);
