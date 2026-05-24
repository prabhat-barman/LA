// Mock the icons module so we don't pull react-native-svg + native deps
// into a pure-helper unit test.
jest.mock('./icons', () => {
  const noop = () => null;
  return new Proxy(
    {},
    {
      get: () => noop,
    },
  );
});

import {
  computeOverallPercent,
  computeOverallRaw,
  ensureArray,
  extractFeedbackText,
  formatTime,
  getAttemptAudioFile,
  getAttemptUserName,
  getOverlayScoreColor,
  getSubscoreByType,
  getWordColor,
  normalizeDifficulty,
  resolveSubscore,
  sortAttemptsBy,
} from './helpers';
import type { AttemptLog } from './types';

describe('PracticeQuestionDetail helpers', () => {
  describe('formatTime', () => {
    it('renders MM:SS with leading zero', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(7)).toBe('0:07');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3725)).toBe('62:05');
    });
  });

  describe('ensureArray', () => {
    it('returns [] for falsy', () => {
      expect(ensureArray(null)).toEqual([]);
      expect(ensureArray(undefined)).toEqual([]);
      expect(ensureArray('')).toEqual([]);
    });

    it('splits strings by bullets, semicolons, newlines', () => {
      expect(ensureArray('a; b; c')).toEqual(['a', 'b', 'c']);
      expect(ensureArray('a\nb')).toEqual(['a', 'b']);
      expect(ensureArray('a • b')).toEqual(['a', 'b']);
    });

    it('passes arrays through after stringifying', () => {
      expect(ensureArray(['a', 1, ''])).toEqual(['a', '1']);
    });
  });

  describe('resolveSubscore', () => {
    it('returns score from object', () => {
      expect(resolveSubscore({ score: 7 })).toBe(7);
    });

    it('coerces strings', () => {
      expect(resolveSubscore('5')).toBe(5);
    });

    it('returns 0 for invalid input', () => {
      expect(resolveSubscore('abc')).toBe(0);
      expect(resolveSubscore(null)).toBe(0);
    });
  });

  describe('getSubscoreByType', () => {
    const arr = [
      { type: 0, score: 7 },
      { type: 1, score: 8 },
      { type: 2, score: 9 },
    ];

    it('returns the score for the matching type', () => {
      expect(getSubscoreByType(arr, 0)).toBe(7);
      expect(getSubscoreByType(arr, 2)).toBe(9);
    });

    it('returns 0 for missing type or non-array', () => {
      expect(getSubscoreByType(arr, 5)).toBe(0);
      expect(getSubscoreByType(null, 0)).toBe(0);
    });
  });

  describe('computeOverallPercent / computeOverallRaw', () => {
    const arr = [
      { score: 9, from: 10 },
      { score: 8, from: 10 },
    ];

    it('computes percent over the per-entry max', () => {
      expect(computeOverallPercent(arr)).toBe(85);
    });

    it('computes raw over a 90-pt scale', () => {
      expect(computeOverallRaw(arr)).toBe(77);
    });

    it('returns 0 for empty / invalid', () => {
      expect(computeOverallPercent([])).toBe(0);
      expect(computeOverallPercent(null)).toBe(0);
      expect(computeOverallRaw([])).toBe(0);
    });
  });

  describe('getOverlayScoreColor', () => {
    it.each([
      [0, '#8E8E93'],
      [-5, '#8E8E93'],
      [10, '#FF3B30'],
      [55, '#FFCC00'],
      [80, '#34C759'],
    ])('color for %i is %s', (val, expected) => {
      expect(getOverlayScoreColor(val)).toBe(expected);
    });
  });

  describe('extractFeedbackText', () => {
    it('returns empty string for falsy', () => {
      expect(extractFeedbackText(null)).toBe('');
    });

    it('returns plain string', () => {
      expect(extractFeedbackText('ok')).toBe('ok');
    });

    it('prefers remarks/remark/feedback/comment keys', () => {
      expect(extractFeedbackText({ remarks: 'r' })).toBe('r');
      expect(extractFeedbackText({ feedback: 'f' })).toBe('f');
    });
  });

  describe('getAttemptAudioFile', () => {
    it('returns the first non-empty candidate', () => {
      expect(getAttemptAudioFile({ audio_file: 'a.mp3' })).toBe('a.mp3');
      expect(getAttemptAudioFile({ recording: 'r.mp3' })).toBe('r.mp3');
    });

    it('trims whitespace', () => {
      expect(getAttemptAudioFile({ audio: '  x.mp3  ' })).toBe('x.mp3');
    });

    it('returns undefined when nothing matches', () => {
      expect(getAttemptAudioFile({})).toBeUndefined();
      expect(getAttemptAudioFile(null)).toBeUndefined();
    });
  });

  describe('getAttemptUserName', () => {
    it('falls back to Anonymous', () => {
      expect(getAttemptUserName(null)).toBe('Anonymous');
      expect(getAttemptUserName({})).toBe('Anonymous');
    });

    it('composes first + last', () => {
      expect(
        getAttemptUserName({ first_name: 'Jane', last_name: 'Doe' }),
      ).toBe('Jane Doe');
    });

    it('handles array shapes', () => {
      expect(
        getAttemptUserName([{ first_name: 'Jane', last_name: 'Doe' }]),
      ).toBe('Jane Doe');
    });

    it('falls back to name / user_name', () => {
      expect(getAttemptUserName({ name: 'X' })).toBe('X');
      expect(getAttemptUserName({ user_name: 'Y' })).toBe('Y');
    });
  });

  describe('getWordColor', () => {
    it('green for high score', () => {
      expect(getWordColor({ score: 80 })).toBe('#34C759');
    });

    it('orange for mid score', () => {
      expect(getWordColor({ score: 50 })).toBe('#FF9500');
    });

    it('red for low score', () => {
      expect(getWordColor({ score: 10 })).toBe('#FF3B30');
    });

    it('uses status string when no score', () => {
      expect(getWordColor({ status: 'good' })).toBe('#34C759');
      expect(getWordColor({ status: 'red' })).toBe('#FF3B30');
    });

    it('defaults to neutral', () => {
      expect(getWordColor('plain')).toBe('#1C1F2A');
    });
  });

  describe('normalizeDifficulty', () => {
    it.each([
      ['BEGINNER', 'BEGINNER'],
      ['Intermediate', 'INTERMEDIATE'],
      ['ADV', 'ADVANCED'],
      ['1', 'BEGINNER'],
      ['2', 'INTERMEDIATE'],
      ['3', 'ADVANCED'],
      ['unknown', ''],
    ])('normalises %s -> %s', (input, expected) => {
      expect(normalizeDifficulty(input)).toBe(expected);
    });
  });

  describe('sortAttemptsBy', () => {
    const list: AttemptLog[] = [
      { id: 1, score_percent: 50 } as AttemptLog,
      { id: 2, score_percent: 90 } as AttemptLog,
      { id: 3, score_percent: 70 } as AttemptLog,
    ];

    it('preserves order on Latest', () => {
      expect(sortAttemptsBy(list, 'Latest').map(a => a.id)).toEqual([
        1, 2, 3,
      ]);
    });

    it('sorts highest score first', () => {
      expect(
        sortAttemptsBy(list, 'Highest Score').map(a => a.id),
      ).toEqual([2, 3, 1]);
    });

    it('sorts lowest score first', () => {
      expect(
        sortAttemptsBy(list, 'Lowest Score').map(a => a.id),
      ).toEqual([1, 3, 2]);
    });
  });
});
