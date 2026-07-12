/**
 * Shared media-URL resolver for the LA app.
 *
 * The backend hands us a confusing mix of absolute URLs, relative
 * paths rooted at the shared S3 bucket (e.g. `/ptedata/ptemedia/x.wav`),
 * and bare filenames (e.g. `1195_1585472464.wav`). Native players
 * and `<Image>` only accept absolute URIs, so we have to normalize
 * everything before it reaches a UI component.
 *
 * The rules below mirror the long-standing legacy resolver that lives
 * inside `PracticeQuestionDetail/index.tsx`. Mock test was missing
 * this step entirely, which is why prompt audio for Repeat Sentence,
 * Retell Lecture, etc. never actually played.
 */

import Config from '../config/Config';

const isAbsolute = (url: string): boolean =>
  url.startsWith('http://') || url.startsWith('https://');

const stripLeadingSlash = (path: string): string =>
  path.startsWith('/') ? path.substring(1) : path;

// Any backend path that already contains a folder separator is
// assumed to be rooted at the shared S3 bucket (`Config.mediaUrl`).
// This mirrors the legacy `mediaUrl + media_link` behaviour from
// NormalMockTestScreen.js / FullMockTestScreen.js — the backend has
// historically sent paths like `/audio/William_7448.mp3`,
// `/ptedata/ptemedia/x.wav`, `/audio_tests/y.mp3`, etc., all of
// which live directly under the bucket root. We can't enumerate
// every folder prefix the backend might invent, so anything with a
// slash is treated as bucket-rooted; only bare filenames fall back
// to the legacy ptemedia answer-audio path.
const looksBucketRooted = (path: string): boolean => path.includes('/');

/**
 * Resolves a backend audio reference into an absolute URL that the
 * native player can load. Accepts:
 *   - Absolute http(s) URLs (returned as-is)
 *   - Relative paths under the shared S3 bucket
 *     (e.g. `/ptedata/ptemedia/x.wav`, `/audio/William_7448.mp3`)
 *   - Bare filenames the legacy ptemedia bucket expects
 *     (e.g. `1195_1585472464.wav` — answer-audio convention)
 * Returns `''` for empty / undefined input so callers can treat the
 * empty string as "no audio" without separate null checks.
 */
export const resolveAudioUrl = (audio: string | null | undefined): string => {
  if (!audio) return '';
  if (isAbsolute(audio)) return audio;
  const cleaned = stripLeadingSlash(audio);
  if (looksBucketRooted(cleaned)) {
    return `${Config.mediaUrl}/${cleaned}`;
  }
  return `${Config.audioPath}${cleaned}`;
};

/**
 * Resolves a backend image reference into an absolute URL that the
 * native `<Image>` component can render. Mirrors `resolveAudioUrl`'s
 * shape but falls back to the API host (`pdfPath` / `pdfPteCorePath`)
 * for legacy paths that don't live on the S3 media bucket.
 *
 * `isCore` selects the PTE Core host instead of the default PTE host
 * for fallback resolution — must be threaded through from whatever
 * context already knows which exam variant is active.
 */
export const resolveImageUrl = (
  image: string | null | undefined,
  options: { isCore?: boolean } = {},
): string => {
  if (!image) return '';
  if (isAbsolute(image)) return image;
  if (image.startsWith('data:')) return image;
  const cleaned = stripLeadingSlash(image);
  if (looksBucketRooted(cleaned)) {
    return `${Config.mediaUrl}/${cleaned}`;
  }
  const basePath = options.isCore ? Config.pdfPteCorePath : Config.pdfPath;
  return `${basePath}${cleaned}`;
};
