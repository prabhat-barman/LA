import {
  extractListItems,
  extractPageSize,
  extractTotalCount,
  getDifficultyStyles,
  parseQuestion,
  parseTagColor,
} from './helpers';

describe('PracticeCommonList helpers', () => {
  describe('parseTagColor', () => {
    it('returns "none" for falsy input', () => {
      expect(parseTagColor(null)).toBe('none');
      expect(parseTagColor(undefined)).toBe('none');
      expect(parseTagColor({})).toBe('none');
    });

    it('reads canonical tag-relation arrays', () => {
      expect(parseTagColor({ tag: [{ tag: 'green' }] })).toBe('green');
      expect(
        parseTagColor({
          tag: [{ tag: 'red' }, { tag: 'yellow' }],
        }),
      ).toBe('yellow');
    });

    it('reads flat fields', () => {
      expect(parseTagColor({ tag_color: 'red' })).toBe('red');
      expect(parseTagColor({ bookmark_color: 'GREY' })).toBe('grey');
    });

    it('falls back to legacy boolean flags as green', () => {
      expect(parseTagColor({ is_tagged: true })).toBe('green');
      expect(parseTagColor({ bookmarked: 1 })).toBe('green');
    });

    it('rejects unknown colour names', () => {
      expect(parseTagColor({ tag_color: 'mauve' })).toBe('none');
    });
  });

  describe('parseQuestion', () => {
    it('extracts id, title, difficulty', () => {
      const out = parseQuestion(
        { id: 5, q_title: 'Read aloud', difficulty: 'advanced' },
        0,
      );
      expect(out.id).toBe(5);
      expect(out.title).toBe('Read aloud');
      expect(out.difficulty).toBe('ADVANCED');
    });

    it('synthesises an id from the index when missing', () => {
      const out = parseQuestion({ title: 'X' }, 7);
      expect(out.id).toBe('q-7');
    });

    it('flags is_new in many shapes', () => {
      expect(parseQuestion({ is_new: 1 }, 0).isNew).toBe(true);
      expect(parseQuestion({ is_new: 'true' }, 0).isNew).toBe(true);
      expect(parseQuestion({ status: 'NEW' }, 0).isNew).toBe(true);
      expect(parseQuestion({ attempt_count: 0 }, 0).isNew).toBe(true);
      expect(parseQuestion({}, 0).isNew).toBe(false);
    });

    it('handles "1"/"2"/"3" numeric difficulty strings', () => {
      expect(parseQuestion({ difficulty: '1' }, 0).difficulty).toBe(
        'BEGINNER',
      );
      expect(parseQuestion({ difficulty: '2' }, 0).difficulty).toBe(
        'INTERMEDIATE',
      );
      expect(parseQuestion({ difficulty: '3' }, 0).difficulty).toBe(
        'ADVANCED',
      );
    });
  });

  describe('getDifficultyStyles', () => {
    it('returns mapped colours', () => {
      expect(getDifficultyStyles('ADVANCED').text).toBe('#7F56D9');
      expect(getDifficultyStyles('INTERMEDIATE').text).toBe('#007AFF');
    });

    it('defaults to BEGINNER colours for unknown', () => {
      expect(getDifficultyStyles('mystery').text).toBe('#34C759');
    });
  });

  describe('extractTotalCount', () => {
    it('reads total / totalCount / meta.total', () => {
      expect(extractTotalCount({ total: 5 }, 0)).toBe(5);
      expect(extractTotalCount({ totalCount: 7 }, 0)).toBe(7);
      expect(extractTotalCount({ meta: { total: 9 } }, 0)).toBe(9);
    });

    it('falls back to the provided default', () => {
      expect(extractTotalCount({}, 42)).toBe(42);
    });
  });

  describe('extractPageSize', () => {
    it('reads count / per_page / meta.per_page', () => {
      expect(extractPageSize({ count: 10 }, 0)).toBe(10);
      expect(extractPageSize({ per_page: 20 }, 0)).toBe(20);
      expect(extractPageSize({ meta: { per_page: 30 } }, 0)).toBe(30);
    });
  });

  describe('extractListItems', () => {
    it('returns top-level arrays', () => {
      expect(extractListItems([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('reads .data / .questions / nested .data.data / .result', () => {
      expect(extractListItems({ data: [1] })).toEqual([1]);
      expect(extractListItems({ questions: [2] })).toEqual([2]);
      expect(extractListItems({ data: { data: [3] } })).toEqual([3]);
      expect(extractListItems({ result: [4] })).toEqual([4]);
    });

    it('returns [] when the shape is unrecognised', () => {
      expect(extractListItems({ foo: 'bar' })).toEqual([]);
      expect(extractListItems(null)).toEqual([]);
    });
  });
});
