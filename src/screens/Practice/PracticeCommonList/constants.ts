import type { TabName, TagColor } from './types';

export const TABS: TabName[] = ['All', 'Prediction', 'Exam Ques'];

// Tab → API params mapping (matches the legacy Softude app contract).
export const TAB_PARAMS: Record<
  TabName,
  { prediction: number; type: number }
> = {
  All: { prediction: 0, type: 1 },
  Prediction: { prediction: 1, type: 2 },
  'Exam Ques': { prediction: 2, type: 3 },
};

export const TAG_COLOR_HEX: Record<Exclude<TagColor, 'none'>, string> = {
  grey: '#8E8E93',
  red: '#FF3B30',
  green: '#94C23C',
  yellow: '#FFCC00',
};

export const TAG_PICKER_OPTIONS: ReadonlyArray<{
  key: Exclude<TagColor, 'none'>;
  label: string;
}> = [
  { key: 'grey', label: 'Grey' },
  { key: 'red', label: 'Red' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
];

export const VALID_TAG_COLORS = ['grey', 'red', 'green', 'yellow'] as const;

export const DEBOUNCE_FETCH_MS = 150;
export const PAGE_SIZE = 20;
