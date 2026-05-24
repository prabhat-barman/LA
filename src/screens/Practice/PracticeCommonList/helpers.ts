import type { QuestionItem, TagColor } from './types';
import { VALID_TAG_COLORS } from './constants';

const pickColorString = (value: unknown): TagColor | null => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if ((VALID_TAG_COLORS as ReadonlyArray<string>).includes(v)) {
    return v as TagColor;
  }
  return null;
};

// Accept a tag colour from the backend in any reasonable shape. The
// canonical list/detail response carries it as an array of relations:
//   "tag": [{ "id": 586274, "tag": "green", ... }]
// We also handle a few other shapes defensively so older endpoints keep
// working (flat fields, legacy boolean flags).
export const parseTagColor = (raw: unknown): TagColor => {
  const r = raw as Record<string, unknown> | null | undefined;
  if (!r) return 'none';

  // 1. Canonical shape: `tag` is an array of relations from the backend.
  //    Pick the most recent entry (last one) and read its inner `tag`.
  if (Array.isArray(r.tag) && r.tag.length > 0) {
    const last = r.tag[r.tag.length - 1] as Record<string, unknown>;
    const matched = pickColorString(last?.tag) || pickColorString(last?.color);
    if (matched) return matched;
  }

  // 2. Flat fields that may carry the colour name directly.
  const candidates: unknown[] = [
    r.tag_color,
    r.tagColor,
    r.tag_colour,
    r.tagColour,
    r.bookmark_color,
    r.bookmarkColor,
    r.color,
    r.tag, // some backends overload `tag` with the colour name itself.
  ];
  for (const c of candidates) {
    const matched = pickColorString(c);
    if (matched) return matched;
  }

  // 3. Legacy: boolean / 0-1 flag means "tagged" → green by default.
  const legacy =
    r.is_tagged === true ||
    r.is_tagged === 1 ||
    r.is_tagged === '1' ||
    r.isTagged === true ||
    r.isTagged === 1 ||
    r.isTagged === '1' ||
    r.tag === 1 ||
    r.tag === '1' ||
    r.tag === true ||
    r.bookmarked === true ||
    r.bookmarked === 1 ||
    r.bookmarked === '1';
  return legacy ? 'green' : 'none';
};

// Normalize a raw API question into a UI-ready item. Tries every known
// field name the backend has used historically so older endpoints keep
// working without a server-side migration.
export const parseQuestion = (
  item: unknown,
  index: number,
): QuestionItem => {
  const r = (item ?? {}) as Record<string, unknown>;
  const id = (r.id ?? r._id ?? `q-${index}`) as number | string;
  const title = (r.q_title ??
    r.title ??
    r.question_title ??
    r.name ??
    r.question ??
    r.text ??
    `Question ${index + 1}`) as string;

  let difficulty = 'BEGINNER';
  const rawDiff = String(
    r.difficulty ?? r.level ?? r.difficulty_level ?? '',
  ).toUpperCase();
  if (rawDiff.includes('ADV') || rawDiff.includes('HIGH') || rawDiff === '3') {
    difficulty = 'ADVANCED';
  } else if (
    rawDiff.includes('INT') ||
    rawDiff.includes('MED') ||
    rawDiff === '2'
  ) {
    difficulty = 'INTERMEDIATE';
  } else if (
    rawDiff.includes('BEG') ||
    rawDiff.includes('LOW') ||
    rawDiff === '1'
  ) {
    difficulty = 'BEGINNER';
  }

  const isNew =
    r.is_new === true ||
    r.is_new === 1 ||
    r.is_new === '1' ||
    String(r.is_new).toLowerCase() === 'true' ||
    r.isNew === true ||
    r.isNew === 1 ||
    r.isNew === '1' ||
    String(r.isNew).toLowerCase() === 'true' ||
    r.status === 'new' ||
    r.status === 'NEW' ||
    r.attempt_count === 0 ||
    r.attempt_count === '0' ||
    false;

  const tagColor = parseTagColor(r);

  return { id, title, difficulty, isNew, tagColor, raw: r };
};

export const getDifficultyStyles = (
  diff: string,
): { bg: string; text: string } => {
  switch (diff) {
    case 'ADVANCED':
      return { bg: '#EFEBFF', text: '#7F56D9' };
    case 'INTERMEDIATE':
      return { bg: '#E5F1FF', text: '#007AFF' };
    case 'BEGINNER':
    default:
      return { bg: '#E2FBE9', text: '#34C759' };
  }
};

// Walks the wide variety of pagination shapes the backend ships with.
// `total` may live on the wrapper, on `meta`, or be inferred from
// `list.length` for endpoints that don't paginate.
export const extractTotalCount = (
  responseData: Record<string, unknown>,
  fallback: number,
): number => {
  const meta = responseData.meta as Record<string, unknown> | undefined;
  return (
    (responseData.total as number | undefined) ??
    (responseData.totalCount as number | undefined) ??
    (meta?.total as number | undefined) ??
    fallback
  );
};

export const extractPageSize = (
  responseData: Record<string, unknown>,
  fallback: number,
): number => {
  const meta = responseData.meta as Record<string, unknown> | undefined;
  return (
    (responseData.count as number | undefined) ??
    (responseData.per_page as number | undefined) ??
    (meta?.per_page as number | undefined) ??
    fallback
  );
};

export const extractListItems = (responseData: unknown): unknown[] => {
  if (Array.isArray(responseData)) return responseData;
  if (!responseData || typeof responseData !== 'object') return [];
  const r = responseData as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.questions)) return r.questions as unknown[];
  const inner = r.data as Record<string, unknown> | undefined;
  if (inner && Array.isArray(inner.data)) return inner.data as unknown[];
  if (Array.isArray(r.result)) return r.result as unknown[];
  return [];
};
