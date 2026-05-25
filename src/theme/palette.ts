// Semantic colour map for the recurring scoring states across the
// practice and feedback screens. These exact hex values are repeated
// across many StyleSheets — codifying them here lets future changes
// (e.g. dark mode, accessibility tweaks) ripple in one place.
export const scorePalette = {
  none: '#8E8E93',
  poor: '#FF3B30',
  warning: '#FFCC00',
  good: '#34C759',
} as const;

// Difficulty chip palette used by question rows and detail headers.
export const difficultyPalette = {
  beginner: { bg: '#E2FBE9', text: '#34C759' },
  intermediate: { bg: '#E5F1FF', text: '#007AFF' },
  advanced: { bg: '#EFEBFF', text: '#7F56D9' },
} as const;

// Generic neutral surfaces used by cards, modals, and dividers across
// the app. Kept separate from the brand colours in colors.ts so that
// surface tokens can be themed independently of brand identity in the
// future.
export const surface = {
  page: '#F8F9FC',
  card: '#FFFFFF',
  divider: '#EAECEF',
  scrim: 'rgba(0,0,0,0.5)',
} as const;
