import { colors } from './colors';
import { spacing } from './spacing';
import { fonts, typography } from './fonts';
import { radii } from './radii';
import { shadows } from './shadows';
import { scale, verticalScale, sharp, screenWidth, BASE_DESIGN_WIDTH } from './scale';
import { scorePalette, difficultyPalette, surface } from './palette';

// Single source of truth for all design tokens consumed by the app.
// New code should reach for these tokens instead of re-defining colour
// hex codes, scale functions, or border-radius constants in feature
// folders.
export const theme = {
  colors,
  spacing,
  fonts,
  typography,
  radii,
  shadows,
  scale,
  verticalScale,
  sharp,
  screenWidth,
  BASE_DESIGN_WIDTH,
  scorePalette,
  difficultyPalette,
  surface,
};

export {
  colors,
  spacing,
  fonts,
  typography,
  radii,
  shadows,
  scale,
  verticalScale,
  sharp,
  screenWidth,
  BASE_DESIGN_WIDTH,
  scorePalette,
  difficultyPalette,
  surface,
};

export type Theme = typeof theme;

