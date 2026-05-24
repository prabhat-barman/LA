import { mediaUrl } from '../../../config/Config';
import { logger } from '../../../services/logger';
import {
  FINAL_TIP_CATEGORY_ID,
  INTRO_CATEGORY_ID,
  PAYWALL_KEYWORDS,
  PLACEHOLDER_THUMB,
  SKILL_CATEGORY_ID,
} from './constants';
import type {
  ParsedVideosResponse,
  RawVideo,
  SkillCategory,
  VideoItem,
} from './types';

// Strategy-video thumbnails are S3-hosted under `mediaUrl`
// (e.g. `/ptedata/ptemedia/foo.jpg`). Backend never returns absolute http
// URLs for these, but we still guard against it.
export const resolveAssetUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = mediaUrl.endsWith('/') ? mediaUrl.slice(0, -1) : mediaUrl;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const getString = (obj: RawVideo, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === 'string') return v;
  }
  return undefined;
};

const getNumberOrString = (
  obj: RawVideo,
  ...keys: string[]
): number | string | undefined => {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === 'number' || typeof v === 'string') return v;
  }
  return undefined;
};

export const inferCategory = (raw: RawVideo): SkillCategory | undefined => {
  // Numeric category id — covers `stgy_video_cat_id` ("2"..."5") and
  // `category` (number).
  const catIdRaw = raw?.stgy_video_cat_id ?? raw?.category;
  const catIdNum =
    typeof catIdRaw === 'number' ? catIdRaw : Number(catIdRaw);
  if (Number.isFinite(catIdNum) && SKILL_CATEGORY_ID[catIdNum]) {
    return SKILL_CATEGORY_ID[catIdNum];
  }
  // String field candidates (legacy / alt shapes).
  for (const key of ['category', 'skill', 'section', 'type']) {
    const v = raw?.[key];
    if (typeof v === 'string') {
      const cap = capitalize(v);
      if (['Speaking', 'Writing', 'Reading', 'Listening'].includes(cap)) {
        return cap as SkillCategory;
      }
    }
  }
  return undefined;
};

export const normalizeDuration = (raw: unknown): string | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return `${raw} min`;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? `${n} min` : trimmed;
  }
  return undefined;
};

export const normalizeVideo = (
  raw: RawVideo,
  index: number,
  forcedCategory?: SkillCategory,
  special?: 'intro' | 'finalTip',
): VideoItem => {
  const id =
    (raw?.id as number | string | undefined) ??
    (raw?.video_id as number | string | undefined) ??
    (raw?._id as number | string | undefined) ??
    `${special ?? 'vid'}-${index}`;
  const category = forcedCategory ?? inferCategory(raw);
  const thumbnailUrl =
    resolveAssetUrl(
      getString(raw, 'image', 'thumbnail', 'thumb', 'preview_image'),
    ) ?? PLACEHOLDER_THUMB;
  // Verified shape from `get-stgy-videos`: each item carries the URL in
  // `video` (matching DashboardScreen's `video.video`). Other field names
  // kept as fallbacks.
  const videoUrl = getString(
    raw,
    'video',
    'video_url',
    'url',
    'video_link',
    'youtube_url',
    'link',
    'src',
  );
  if (!videoUrl) {
    // One-line diagnostic so we can spot the real field name if the
    // backend evolves.
    logger.warn(
      '[VideosScreen] No video URL on item — keys:',
      Object.keys(raw ?? {}),
    );
  }
  const chapterNum = getNumberOrString(raw, 'chapter', 'serial', 'order');
  const chapter =
    chapterNum !== undefined && chapterNum !== null
      ? typeof chapterNum === 'string'
        ? chapterNum
        : `CH.${chapterNum}`
      : undefined;

  return {
    id,
    syntheticKey: special
      ? `${special}-${id}`
      : `${category ?? 'x'}-${id}-${index}`,
    chapter,
    title: getString(raw, 'title', 'name', 'video_title') ?? 'Untitled',
    description: getString(raw, 'description', 'sub_title', 'subtitle'),
    duration: normalizeDuration(
      raw?.duration ?? raw?.time ?? raw?.video_duration,
    ),
    author: getString(raw, 'author', 'instructor', 'by', 'teacher'),
    category,
    thumbnailUrl,
    videoUrl,
    isIntro: special === 'intro',
    isFinalTip: special === 'finalTip',
    raw,
  };
};

export const isPaywallMessage = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return PAYWALL_KEYWORDS.some(k => lower.includes(k));
};

export const parseVideosResponse = (
  data: unknown,
): ParsedVideosResponse => {
  const root = data as Record<string, unknown> | undefined;
  const rawMessage =
    typeof root?.message === 'string' ? (root.message as string) : undefined;
  const message =
    rawMessage && isPaywallMessage(rawMessage) ? rawMessage : undefined;

  // Primary verified shape:
  //   { message?: string, video: [ { id, title, stgy_vid: [ {...video} ] }, ... ] }
  const videoCategories = (root?.video ??
    root?.videos) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(videoCategories)) {
    const items: VideoItem[] = [];
    videoCategories.forEach(cat => {
      const catId = Number(cat?.id);
      const skill = SKILL_CATEGORY_ID[catId];
      const special: 'intro' | 'finalTip' | undefined =
        catId === INTRO_CATEGORY_ID
          ? 'intro'
          : catId === FINAL_TIP_CATEGORY_ID
            ? 'finalTip'
            : undefined;
      const list =
        (cat?.stgy_vid as RawVideo[] | undefined) ??
        (cat?.videos as RawVideo[] | undefined) ??
        [];
      if (Array.isArray(list)) {
        list.forEach((v, idx) =>
          items.push(normalizeVideo(v, idx, skill, special)),
        );
      }
    });
    return { items, message };
  }

  // Legacy / alternative shapes the doc described.
  const altRoot = (root?.result ?? root?.data ?? root) as
    | Record<string, unknown>
    | undefined;
  if (altRoot && typeof altRoot === 'object' && !Array.isArray(altRoot)) {
    const items: VideoItem[] = [];
    const skillKeys: Array<[string, SkillCategory]> = [
      ['speaking', 'Speaking'],
      ['writing', 'Writing'],
      ['reading', 'Reading'],
      ['listening', 'Listening'],
    ];
    skillKeys.forEach(([key, cat]) => {
      const arr = altRoot[key] as RawVideo[] | undefined;
      if (Array.isArray(arr)) {
        arr.forEach((v, idx) => items.push(normalizeVideo(v, idx, cat)));
      }
    });
    const specials: Array<[string, 'intro' | 'finalTip']> = [
      ['intro', 'intro'],
      ['introduction', 'intro'],
      ['finalTip', 'finalTip'],
      ['final_tip', 'finalTip'],
      ['finalTips', 'finalTip'],
      ['final_tips', 'finalTip'],
    ];
    specials.forEach(([key, kind]) => {
      const v = altRoot[key];
      if (!v) return;
      const arr = (Array.isArray(v) ? v : [v]) as RawVideo[];
      arr.forEach((item, idx) =>
        items.push(normalizeVideo(item, idx, undefined, kind)),
      );
    });
    return { items, message };
  }

  if (Array.isArray(altRoot)) {
    return {
      items: (altRoot as RawVideo[]).map((v, idx) =>
        normalizeVideo(v, idx),
      ),
      message,
    };
  }

  return { items: [], message };
};

interface DashboardImageBag {
  image?: string;
  user?: { image?: string };
}

export const buildVideoProfileImageUrl = (
  dashboardData: DashboardImageBag | null | undefined,
  baseUrl: string,
  fallback: string,
): string => {
  const photoPath = dashboardData?.image || dashboardData?.user?.image;
  if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
    return fallback;
  }
  if (photoPath.startsWith('http')) return photoPath;
  const separator = baseUrl.endsWith('/') ? '' : '/';
  const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
  return `${baseUrl}${separator}${cleanPath}`;
};
