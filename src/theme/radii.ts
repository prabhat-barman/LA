// Border-radius tokens. The values match the existing scale used
// across cards, modals, and pill-shaped buttons in the app — codified
// here so screens can stop hand-coding the same magic numbers.
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
