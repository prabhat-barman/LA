import React from 'react';
import type { TagColor } from './types';
import {
  SubscoreWarningIcon,
  SubscoreChecklistIcon,
  SubscoreGrammarIcon,
  SubscoreBookIcon,
  SubscoreRangeIcon,
  SubscoreOrgIcon,
  SubscoreFluencyIcon,
  SubscorePronIcon,
} from './icons';

// Module-level so React doesn't recreate this map on every render.
export const TAG_COLOR_HEX: Record<Exclude<TagColor, 'none'>, string> = {
  grey: '#8E8E93',
  red: '#FF3B30',
  green: '#94C23C',
  yellow: '#FFCC00',
};

export interface CategoryDetail {
  icon: React.FC<{ size?: number; color?: string }>;
  color: string;
  description: string;
  defaultRemarks: string[];
}

export const CATEGORY_DETAILS: Record<string, CategoryDetail> = {
  content: {
    icon: SubscoreWarningIcon,
    color: '#FFCC00',
    description: 'How closely you read the text',
    defaultRemarks: [
      'You included all key words from the source text.',
      'No additions or omissions were detected.',
    ],
  },
  grammar: {
    icon: SubscoreGrammarIcon,
    color: '#AF52DE',
    description: 'Sentence structure accuracy',
    defaultRemarks: [
      'Multiple grammar and sentence errors reduce clarity.',
      'Needs careful proofreading for correct usage and structure.',
    ],
  },
  form: {
    icon: SubscoreChecklistIcon,
    color: '#34C759',
    description: 'Pronunciation and clarity',
    defaultRemarks: [
      'Does not follow the required 200–300 word limit.',
      'Incorrect length affects overall scoring and evaluation.',
    ],
  },
  vocabulary: {
    icon: SubscoreBookIcon,
    color: '#007AFF',
    description: 'Word usage clarity',
    defaultRemarks: [
      'Vocabulary is too basic or used incorrectly.',
      'Use clear academic words with correct spelling.',
    ],
  },
  'linguistic range': {
    icon: SubscoreRangeIcon,
    color: '#FF3B30',
    description: 'Range of language use',
    defaultRemarks: [
      'Limited variety in word choice and expression.',
      'Avoid casual language; use more formal academic tone.',
    ],
  },
  spelling: {
    icon: SubscoreChecklistIcon,
    color: '#E040FB',
    description: 'Spelling accuracy level',
    defaultRemarks: [
      'Frequent spelling mistakes affect readability.',
      'Proofread carefully and avoid uncertain words.',
    ],
  },
  structure: {
    icon: SubscoreOrgIcon,
    color: '#FF9500',
    description: 'Organization of ideas',
    defaultRemarks: [
      'Lacks clear introduction, body, and conclusion.',
      'Ideas are not well connected due to missing transitions.',
    ],
  },
  fluency: {
    icon: SubscoreFluencyIcon,
    color: '#FF9500',
    description: 'Smoothness and speed of delivery',
    defaultRemarks: [
      'Oral fluency is natural and appropriately paced.',
      'Minor hesitations observed but did not impact clarity.',
    ],
  },
  pronunciation: {
    icon: SubscorePronIcon,
    color: '#AF52DE',
    description: 'Clarity and correct sound production',
    defaultRemarks: [
      'Pronunciation was mostly clear and easy to understand.',
      'Some word endings were not fully articulated.',
    ],
  },
};

// Lookup tables for difficulty chip colours. Avoids a switch on every render.
export const DIFFICULTY_CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  ADVANCED: { bg: '#EFEBFF', text: '#7F56D9' },
  INTERMEDIATE: { bg: '#E5F1FF', text: '#007AFF' },
  BEGINNER: { bg: '#E2FBE9', text: '#34C759' },
};

export const DIFFICULTY_CHIP_DEFAULT = { bg: '#F2F2F7', text: '#48484A' };

export const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi',
  es: 'Spanish',
  zh: 'Chinese',
  pa: 'Punjabi',
  ne: 'Nepali',
  ar: 'Arabic',
};

export const LANGUAGE_CODES = ['hi', 'es', 'zh', 'pa', 'ne', 'ar'] as const;

export const REPORT_REASONS = [
  'Inaccurate Translation',
  'Technical Glitch',
  'Incorrect Model Answer',
  'Audio Quality Issue',
  'Other',
] as const;

export const SORT_FILTERS = ['Latest', 'Highest Score', 'Lowest Score'] as const;

export const TAG_PICKER_OPTIONS = [
  { key: 'grey', label: 'Grey' },
  { key: 'red', label: 'Red' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
] as const;
