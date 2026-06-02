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
  buildMcqAnswerPayload,
  buildPracticeAnswerFromDraft,
  computeOverallPercent,
  computeOverallRaw,
  ensureArray,
  extractFeedbackText,
  formatTime,
  getAttemptAudioFile,
  getAttemptUserName,
  getMissingAnswerToast,
  getOptionLeadingLetter,
  getOverlayScoreColor,
  getSubscoreByType,
  getWordColor,
  isDictationCategory,
  isFibCategory,
  isHighlightWordsCategory,
  isMcqCategory,
  isMcqMultipleCategory,
  isMcqSingleCategory,
  isOptionCorrect,
  isReorderCategory,
  isRunnerBridgeCategory,
  normalizeDifficulty,
  parseSelectedOptionIds,
  resolveSubscore,
  sortAttemptsBy,
  sortMcqOptions,
} from './helpers';
import type { AttemptLog, MCQOption } from './types';

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

    it('sorts correctly using subscores array when score_percent/percentage/overall_score are missing', () => {
      const complexList = [
        { id: 10, score: [{ score: 20, from: 100 }] } as any,
        { id: 20, score: [{ score: 90, from: 100 }] } as any,
        { id: 30, score: [{ score: 50, from: 100 }] } as any,
      ];
      expect(
        sortAttemptsBy(complexList, 'Highest Score').map(a => a.id),
      ).toEqual([20, 30, 10]);
    });
  });

  describe('MCQ helpers', () => {
    describe('isMcqCategory family', () => {
      it('flags reading + listening MCQ categories', () => {
        expect(isMcqSingleCategory(8)).toBe(true);
        expect(isMcqSingleCategory(14)).toBe(true);
        expect(isMcqMultipleCategory(9)).toBe(true);
        expect(isMcqMultipleCategory(15)).toBe(true);
        expect(isMcqCategory(8)).toBe(true);
        expect(isMcqCategory(9)).toBe(true);
        expect(isMcqCategory(14)).toBe(true);
        expect(isMcqCategory(15)).toBe(true);
      });

      it('rejects non-MCQ categories', () => {
        expect(isMcqCategory(1)).toBe(false);
        expect(isMcqCategory(6)).toBe(false);
        expect(isMcqCategory(10)).toBe(false);
        expect(isMcqCategory(20)).toBe(false);
      });
    });

    describe('getOptionLeadingLetter', () => {
      it.each([
        ['A) foo', 0],
        ['B) bar', 1],
        [' C) baz', 2],
        ['D. qux', 3],
        ['e: lower', 4],
      ])('parses %s', (input, expected) => {
        expect(getOptionLeadingLetter(input)).toBe(expected);
      });

      it('returns null for non-prefixed text', () => {
        expect(getOptionLeadingLetter('No prefix here')).toBeNull();
        expect(getOptionLeadingLetter('')).toBeNull();
        expect(getOptionLeadingLetter(undefined)).toBeNull();
      });
    });

    describe('sortMcqOptions', () => {
      it('sorts by leading letter regardless of array order', () => {
        const input: MCQOption[] = [
          { id: 1, options: 'D) fourth', correct: 0 },
          { id: 2, options: 'C) third', correct: 1 },
          { id: 3, options: 'B) second', correct: 0 },
          { id: 4, options: 'A) first', correct: 0 },
        ];
        expect(sortMcqOptions(input).map(o => o.id)).toEqual([4, 3, 2, 1]);
      });

      it('falls back to index when letters are missing', () => {
        const input: MCQOption[] = [
          { id: 1, options: 'Yes', correct: 0, index: 2 },
          { id: 2, options: 'No', correct: 1, index: 0 },
          { id: 3, options: 'Maybe', correct: 0, index: 1 },
        ];
        expect(sortMcqOptions(input).map(o => o.id)).toEqual([2, 3, 1]);
      });

      it('handles empty / undefined input', () => {
        expect(sortMcqOptions(undefined)).toEqual([]);
        expect(sortMcqOptions([])).toEqual([]);
      });
    });

    describe('isOptionCorrect', () => {
      it('treats truthy variants as correct', () => {
        expect(isOptionCorrect(1)).toBe(true);
        expect(isOptionCorrect('1')).toBe(true);
        expect(isOptionCorrect('true')).toBe(true);
        expect(isOptionCorrect(true)).toBe(true);
      });

      it('treats falsy / other variants as incorrect', () => {
        expect(isOptionCorrect(0)).toBe(false);
        expect(isOptionCorrect('0')).toBe(false);
        expect(isOptionCorrect(null)).toBe(false);
        expect(isOptionCorrect(undefined)).toBe(false);
        expect(isOptionCorrect('false')).toBe(false);
      });
    });

    describe('parseSelectedOptionIds', () => {
      it('parses a comma-separated string', () => {
        expect([...parseSelectedOptionIds('56067,56068')]).toEqual([
          '56067',
          '56068',
        ]);
      });

      it('parses single id', () => {
        expect([...parseSelectedOptionIds('56067')]).toEqual(['56067']);
      });

      it('returns empty set for nullish input', () => {
        expect(parseSelectedOptionIds(undefined).size).toBe(0);
        expect(parseSelectedOptionIds(null).size).toBe(0);
        expect(parseSelectedOptionIds('').size).toBe(0);
      });

      it('handles arrays / mixed separators', () => {
        expect([...parseSelectedOptionIds(['1', '2'])].sort()).toEqual([
          '1',
          '2',
        ]);
        expect([...parseSelectedOptionIds('1; 2 , 3')].sort()).toEqual([
          '1',
          '2',
          '3',
        ]);
      });
    });

    describe('buildMcqAnswerPayload', () => {
      it('joins ids with comma', () => {
        expect(buildMcqAnswerPayload(['56067', '56068'])).toBe('56067,56068');
      });

      it('drops empty entries', () => {
        expect(buildMcqAnswerPayload(['', '56067'])).toBe('56067');
      });

      it('returns empty string for empty iterable', () => {
        expect(buildMcqAnswerPayload([])).toBe('');
      });
    });
  });

  describe('Category detection (runner-bridge categories)', () => {
    describe('isMcqSingleCategory', () => {
      it('returns true for 8, 14, 17, 18', () => {
        expect(isMcqSingleCategory(8)).toBe(true);
        expect(isMcqSingleCategory(14)).toBe(true);
        expect(isMcqSingleCategory(17)).toBe(true);
        expect(isMcqSingleCategory(18)).toBe(true);
      });
      it('returns false for other categories', () => {
        expect(isMcqSingleCategory(9)).toBe(false);
        expect(isMcqSingleCategory(10)).toBe(false);
        expect(isMcqSingleCategory(20)).toBe(false);
      });
    });

    describe('isReorderCategory', () => {
      it('returns true only for 10', () => {
        expect(isReorderCategory(10)).toBe(true);
        expect(isReorderCategory(11)).toBe(false);
        expect(isReorderCategory(0)).toBe(false);
      });
    });

    describe('isFibCategory', () => {
      it('returns true for 11, 12, 16', () => {
        expect(isFibCategory(11)).toBe(true);
        expect(isFibCategory(12)).toBe(true);
        expect(isFibCategory(16)).toBe(true);
      });
      it('returns false for other listening/reading categories', () => {
        expect(isFibCategory(10)).toBe(false);
        expect(isFibCategory(13)).toBe(false);
        expect(isFibCategory(20)).toBe(false);
      });
    });

    describe('isHighlightWordsCategory', () => {
      it('returns true only for 19', () => {
        expect(isHighlightWordsCategory(19)).toBe(true);
        expect(isHighlightWordsCategory(17)).toBe(false);
      });
    });

    describe('isDictationCategory', () => {
      it('returns true only for 20', () => {
        expect(isDictationCategory(20)).toBe(true);
        expect(isDictationCategory(13)).toBe(false);
      });
    });

    describe('isRunnerBridgeCategory', () => {
      it('covers 10/11/12/16/19', () => {
        for (const id of [10, 11, 12, 16, 19]) {
          expect(isRunnerBridgeCategory(id)).toBe(true);
        }
      });
      it('excludes 17/18 (handled by MCQ surface) and 20 (writing surface)', () => {
        expect(isRunnerBridgeCategory(17)).toBe(false);
        expect(isRunnerBridgeCategory(18)).toBe(false);
        expect(isRunnerBridgeCategory(20)).toBe(false);
      });
      it('excludes speaking / writing / MCQ categories', () => {
        for (const id of [1, 2, 3, 6, 7, 8, 9, 14, 15, 21, 22]) {
          expect(isRunnerBridgeCategory(id)).toBe(false);
        }
      });
    });
  });

  describe('buildPracticeAnswerFromDraft', () => {
    it('returns null for an empty draft', () => {
      expect(buildPracticeAnswerFromDraft({ kind: 'empty' })).toBeNull();
    });

    it('serialises a reorder draft as comma-joined ids', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'reorder',
          orderedIds: ['p3', 'p1', 'p2'],
        }),
      ).toBe('p3,p1,p2');
    });

    it('returns null for an empty reorder draft', () => {
      expect(
        buildPracticeAnswerFromDraft({ kind: 'reorder', orderedIds: [] }),
      ).toBeNull();
    });

    it('serialises FIB-bank with leading-comma interleaved CSV', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'fib-bank',
          values: ['alpha', null, 'beta'],
        }),
      ).toBe('alpha,,,,beta');
    });

    it('serialises FIB-dropdown identically to bank', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'fib-dropdown',
          values: [null, 'a'],
        }),
      ).toBe(',,a');
    });

    it('returns null when every FIB position is empty', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'fib-bank',
          values: [null, null, ''],
        }),
      ).toBeNull();
    });

    it('serialises FIB-input as plain comma-joined values', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'fib-input',
          values: ['cat', '', 'dog'],
        }),
      ).toBe('cat,,dog');
    });

    it('returns null when every FIB-input cell is blank/whitespace', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'fib-input',
          values: ['  ', '', '\t'],
        }),
      ).toBeNull();
    });

    it('serialises highlight selections as comma-joined words', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'highlight',
          selectedIndices: [3, 7],
          selectedWords: ['quickly', 'enough'],
        }),
      ).toBe('quickly,enough');
    });

    it('returns null when highlight draft has no selections', () => {
      expect(
        buildPracticeAnswerFromDraft({
          kind: 'highlight',
          selectedIndices: [],
          selectedWords: [],
        }),
      ).toBeNull();
    });

    it('returns null for unknown draft kinds', () => {
      expect(
        buildPracticeAnswerFromDraft({ kind: 'speaking' } as any),
      ).toBeNull();
    });
  });

  describe('getMissingAnswerToast', () => {
    it('returns category-specific copy when known', () => {
      expect(getMissingAnswerToast(10)).toMatch(/re-order/i);
      expect(getMissingAnswerToast(11)).toMatch(/blank/i);
      expect(getMissingAnswerToast(12)).toMatch(/blank/i);
      expect(getMissingAnswerToast(16)).toMatch(/missing words/i);
      expect(getMissingAnswerToast(19)).toMatch(/audio/i);
      expect(getMissingAnswerToast(20)).toMatch(/heard/i);
    });

    it('falls back to a generic prompt for unknown ids', () => {
      expect(getMissingAnswerToast(99)).toMatch(/answer the question/i);
    });
  });
});
