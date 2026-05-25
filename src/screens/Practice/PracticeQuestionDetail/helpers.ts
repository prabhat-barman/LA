import {
  CATEGORY_DETAILS,
  CategoryDetail,
  DIFFICULTY_CHIP_DEFAULT,
  DIFFICULTY_CHIP_STYLES,
} from './constants';
import { SubscoreChecklistIcon } from './icons';
import type { AttemptLog, SortFilter } from './types';

// MM:SS clock formatter shared by recorder/playback UI.
export const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Format an attempt timestamp into a friendly local string:
//   today      -> "Today, 12:37 PM"
//   yesterday  -> "Yesterday, 12:37 PM"
//   this year  -> "23 Apr, 12:37 PM"
//   older/newer-> "23 Apr 2026, 12:37 PM"
// Returns 'Unknown date' if the input isn't parseable.
export const formatAttemptDate = (input?: string | number | Date | null): string => {
  if (!input) return 'Unknown date';
  const d = new Date(input);
  if (isNaN(d.getTime())) return 'Unknown date';

  const now = new Date();
  const startOfDay = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateLabel = d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateLabel}, ${time}`;
};

export const ensureArray = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/\n|\u2022|•|;/).map(s => s.trim()).filter(Boolean);
  }
  if (typeof v === 'object') return Object.values(v).map(String).filter(Boolean);
  return [];
};

const FALLBACK_CATEGORY: CategoryDetail = {
  icon: SubscoreChecklistIcon,
  color: '#007AFF',
  description: 'Evaluation criteria breakdown',
  defaultRemarks: ['Well structured and presented.'],
};

export const getCategoryDetails = (name: string): CategoryDetail => {
  const norm = name.toLowerCase().trim();
  if (norm.includes('content')) return CATEGORY_DETAILS.content;
  if (norm.includes('grammar')) return CATEGORY_DETAILS.grammar;
  if (norm.includes('form')) return CATEGORY_DETAILS.form;
  if (norm.includes('vocabulary') || norm.includes('vocab')) return CATEGORY_DETAILS.vocabulary;
  if (norm.includes('linguistic') || norm.includes('range')) return CATEGORY_DETAILS['linguistic range'];
  if (norm.includes('spelling') || norm.includes('spell')) return CATEGORY_DETAILS.spelling;
  if (norm.includes('structure') || norm.includes('struct')) return CATEGORY_DETAILS.structure;
  if (norm.includes('fluency') || norm.includes('oral')) return CATEGORY_DETAILS.fluency;
  if (norm.includes('pronunciation') || norm.includes('pron')) return CATEGORY_DETAILS.pronunciation;
  return FALLBACK_CATEGORY;
};

export const extractFeedbackText = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.remarks ?? val.remark ?? val.feedback ?? val.comment ?? JSON.stringify(val);
  }
  return String(val);
};

export const resolveSubscore = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'object') {
    return val.score ?? 0;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// Pull a sub-score from the backend's `score[]` array by `type`
// (0 = Content, 1 = Fluency, 2 = Pronunciation). Returns 0 if not present.
export const getSubscoreByType = (scoreArr: any, type: number): number => {
  if (!Array.isArray(scoreArr)) return 0;
  const item = scoreArr.find((s: any) => Number(s?.type) === type);
  if (!item) return 0;
  const n = Number(item.score);
  return isNaN(n) ? 0 : n;
};

// Compute overall percentage from `score[]` using each entry's own `from`
// (falls back to 90, the PTE default).
export const computeOverallPercent = (scoreArr: any): number => {
  if (!Array.isArray(scoreArr) || scoreArr.length === 0) return 0;
  let total = 0;
  let max = 0;
  for (const s of scoreArr) {
    const n = Number(s?.score);
    const from = Number(s?.from ?? 90);
    if (!isNaN(n) && from > 0) {
      total += n;
      max += from;
    }
  }
  return max === 0 ? 0 : Math.round((total / max) * 100);
};

export const computeOverallRaw = (scoreArr: any): number => {
  if (!Array.isArray(scoreArr) || scoreArr.length === 0) return 0;
  let total = 0;
  let max = 0;
  for (const s of scoreArr) {
    const n = Number(s?.score);
    const from = Number(s?.from ?? 90);
    if (!isNaN(n) && from > 0) {
      total += n;
      max += from;
    }
  }
  return max === 0 ? 0 : Math.round((total / max) * 90);
};

// Pull the *user's recorded* audio filename out of an attempt row. The
// backend uses slightly different field names across Me / Others responses,
// so we check several known shapes. We deliberately DO NOT fall back to
// any nested `question.media_link` etc. — that is the question prompt
// audio, not the user's recording, and would point to a different S3 path.
export const getAttemptAudioFile = (attempt: any): string | undefined => {
  if (!attempt || typeof attempt !== 'object') return undefined;
  const candidates = [
    attempt.file,
    attempt.audio,
    attempt.audio_file,
    attempt.audio_path,
    attempt.recording,
    attempt.recording_file,
    attempt.recording_path,
    attempt.answer_file,
    attempt.answer_audio,
    attempt.user_audio,
    attempt.user_recording,
    attempt.media_file,
    attempt.attempt_file,
    attempt.attempt_audio,
    attempt.voice_file,
    attempt.voice,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return undefined;
};

// The backend sometimes returns `user` as an array (single-entry) and
// sometimes as an object. Resolve to a display name in either case.
export const getAttemptUserName = (user: any): string => {
  if (!user) return 'Anonymous';
  const u = Array.isArray(user) ? user[0] : user;
  if (!u) return 'Anonymous';
  const first = (u.first_name ?? '').toString().trim();
  const last = (u.last_name ?? '').toString().trim();
  const composed = `${first} ${last}`.trim();
  return composed || u.name || u.user_name || 'Anonymous';
};

// Score-badge color thresholds:
//   0           -> grey   (no attempt / no score yet)
//   1..49       -> red    (poor)
//   50..69      -> yellow (needs improvement)
//   70+         -> green  (good)
export const getOverlayScoreColor = (val: number) => {
  if (!val || val <= 0) return '#8E8E93';
  if (val >= 70) return '#34C759';
  if (val >= 50) return '#FFCC00';
  return '#FF3B30';
};

export const getDifficultyChipStyle = (diff: string) =>
  DIFFICULTY_CHIP_STYLES[diff] ?? DIFFICULTY_CHIP_DEFAULT;

// Word-by-word colouring for the score breakdown highlight transcript.
export const getWordColor = (word: any) => {
  if (typeof word === 'string') return '#1C1F2A';
  const score =
    word?.score ?? word?.percentage ?? word?.val ?? word?.score_percent ?? word?.word_score;
  const status = String(word?.status ?? word?.color ?? word?.state ?? word?.class ?? '').toLowerCase();

  if (score !== undefined) {
    if (score >= 70) return '#34C759';
    if (score >= 40) return '#FF9500';
    return '#FF3B30';
  }

  if (status) {
    if (
      status.includes('good') ||
      status.includes('green') ||
      status.includes('correct') ||
      status.includes('success') ||
      status === '1'
    ) {
      return '#34C759';
    }
    if (
      status.includes('average') ||
      status.includes('orange') ||
      status.includes('yellow') ||
      status.includes('warning') ||
      status === '2'
    ) {
      return '#FF9500';
    }
    if (
      status.includes('bad') ||
      status.includes('red') ||
      status.includes('incorrect') ||
      status.includes('danger') ||
      status === '3'
    ) {
      return '#FF3B30';
    }
  }
  return '#1C1F2A';
};

// Difficulty normalization. The backend serves a few different shapes:
// numeric strings ("1"/"2"/"3"), full words, abbreviations, etc.
export const normalizeDifficulty = (raw: unknown): '' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' => {
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('ADV') || s.includes('HIGH') || s === '3') return 'ADVANCED';
  if (s.includes('INT') || s.includes('MED') || s === '2') return 'INTERMEDIATE';
  if (s.includes('BEG') || s.includes('LOW') || s === '1') return 'BEGINNER';
  return '';
};

const attemptSortValue = (a: AttemptLog): number => {
  const flatOverall = a.score_percent ?? a.percentage ?? a.overall_score;
  if (typeof flatOverall === 'number' && !isNaN(flatOverall)) {
    return flatOverall;
  }
  if (typeof flatOverall === 'string') {
    const num = Number(flatOverall);
    if (!isNaN(num)) return num;
  }
  return computeOverallPercent(a.score);
};

// Single source of truth for the three sort modes used by both
// "Me" and "Others" attempt lists. Latest preserves backend order.
export const sortAttemptsBy = <T extends AttemptLog>(list: T[], filter: SortFilter): T[] => {
  if (filter === 'Latest' || list.length === 0) return list.slice();
  const copy = list.slice();
  if (filter === 'Highest Score') {
    return copy.sort((a, b) => attemptSortValue(b) - attemptSortValue(a));
  }
  return copy.sort((a, b) => attemptSortValue(a) - attemptSortValue(b));
};

export const cleanHtmlText = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/\n{3,}/g, '\n\n');
};
