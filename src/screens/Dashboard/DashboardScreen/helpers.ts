import { getPdfPath } from '../../../config/appVariantConfig';
import { DEFAULT_PROFILE_IMAGE } from './constants';
import type { PracticeCounts } from './types';

// YouTube URLs come back from the backend in two shapes (embed + watch);
// pull the bare video id so we can build a thumbnail URL from it.
export const getYoutubeVideoId = (url: string | undefined): string => {
  if (!url) return '';
  const embedMatch = url.match(/embed\/([^/?]+)/);
  if (embedMatch) return embedMatch[1];
  const watchMatch = url.match(/v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  return '';
};

// Builds an absolute URL for a profile image returned by the backend
// (which may be a relative path, an absolute URL, or null/undefined).
export const buildProfileImageUrl = (
  rawPath: string | null | undefined,
): string => {
  if (!rawPath || rawPath === 'null' || rawPath === 'undefined') {
    return DEFAULT_PROFILE_IMAGE;
  }
  if (rawPath.startsWith('http')) {
    return rawPath;
  }
  const baseUrl = getPdfPath();
  const separator = baseUrl.endsWith('/') ? '' : '/';
  const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  return `${baseUrl}${separator}${cleanPath}`;
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'GOOD MORNING';
  if (hour >= 12 && hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

// Returns the human-readable countdown string used under the welcome
// header. Falls back to a CTA when no exam date is set.
export const buildExamDaysText = (
  examDate: string | undefined | null,
): string => {
  if (!examDate) return 'Set your exam date to start the countdown.';
  const examDateObj = new Date(examDate);
  const today = new Date();
  const diffTime = examDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `${diffDays} days until your exam.`;
  if (diffDays === 0) return 'Exam is today! Good luck!';
  return 'Exam completed.';
};

// Normalize a (done, total) tuple from the backend into formatted
// strings. Falls back to a default total when the backend omits one
// (typical for lazily-populated practice categories).
export const formatPracticeCount = (
  done: number | string | undefined,
  total: number | string | undefined,
  defaultTotal: string,
): PracticeCounts => {
  const doneStr = done !== undefined ? Number(done).toLocaleString() : '0';
  const totalStr =
    total !== undefined ? Number(total).toLocaleString() : defaultTotal;
  return { done: doneStr, total: totalStr };
};

// Build the breakdown lookup once per render based on the latest
// backend numbers + the user's target. Hardcoded brand colors mirror
// the Figma reference so we don't need a theme dependency here.
export const formatExamDateChip = (
  examDate: string | undefined | null,
): string => {
  if (!examDate) return 'Set Exam Date';
  return `Exam: ${new Date(examDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} • Change`;
};
