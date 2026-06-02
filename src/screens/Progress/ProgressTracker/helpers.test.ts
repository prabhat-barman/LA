import {
  computeProgressRatio,
  mergeProgressData,
  normalizeCategoriesPayload,
  normalizeProgressPayload,
} from './helpers';

describe('ProgressTracker.helpers', () => {
  describe('normalizeCategoriesPayload', () => {
    it('keeps well-formed subcategories', () => {
      const out = normalizeCategoriesPayload({
        subcategories: [
          {
            id: 1,
            title: 'Read Aloud',
            category: 'Speaking',
            total_questions: 100,
            attempted: 12,
          },
          {
            id: 4,
            title: 'Retell Lecture',
            category: 'Speaking',
            total_questions: 50,
            attempted: 5,
            pte_core_title: 'Retell Lecture (Core)',
          },
        ],
      });
      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({
        id: 1,
        title: 'Read Aloud',
        skill: 'Speaking',
        attempted: 12,
        total: 100,
        accuracy: null,
        targetAccuracy: 0,
      });
      expect(out[1].pteCoreTitle).toBe('Retell Lecture (Core)');
    });

    it('rejects rows with bad/missing id, title, or category', () => {
      const out = normalizeCategoriesPayload({
        subcategories: [
          { id: 0, title: 'X', category: 'Speaking' },
          { id: 'abc', title: 'Y', category: 'Speaking' },
          { id: 5, title: '', category: 'Speaking' },
          { id: 6, title: 'Z', category: 'Astronomy' },
          { id: 7, title: 'OK', category: 'Speaking' },
        ],
      });
      expect(out.map(s => s.id)).toEqual([7]);
    });

    it('coerces numeric strings for counts', () => {
      const out = normalizeCategoriesPayload({
        subcategories: [
          { id: 1, title: 'X', category: 'Reading', total_questions: '120', attempted: '7' },
        ],
      });
      expect(out[0]).toMatchObject({ total: 120, attempted: 7 });
    });

    it('accepts alternate field names (sub_id / name / skill / total)', () => {
      const out = normalizeCategoriesPayload({
        subcategories: [
          { sub_id: 9, name: 'Listening Task', skill: 'listening', total: 40, attempted_count: 3 },
        ],
      });
      expect(out[0]).toMatchObject({
        id: 9,
        title: 'Listening Task',
        skill: 'Listening',
        total: 40,
        attempted: 3,
      });
    });

    it('returns [] for malformed inputs', () => {
      expect(normalizeCategoriesPayload(null)).toEqual([]);
      expect(normalizeCategoriesPayload(undefined)).toEqual([]);
      expect(normalizeCategoriesPayload({ foo: 'bar' })).toEqual([]);
      expect(normalizeCategoriesPayload({ subcategories: 'not-an-array' })).toEqual([]);
    });
  });

  describe('normalizeProgressPayload (per-question-score shape)', () => {
    it('computes unique-question attempted + accuracy from score arrays', () => {
      // Mirrors the documented backend response shape:
      //   { status: 200, data: { "<subcategoryId>": [ {question_id, score: [...]} ] } }
      const out = normalizeProgressPayload({
        status: 200,
        data: {
          '1': [
            { question_id: 101, score: [{ score: 12, from: 15 }, { score: 8, from: 10 }] },
            { question_id: 102, score: [{ score: 9, from: 10 }] },
          ],
          '2': [],
        },
      });
      // sub 1: 2 unique question_ids; accuracy = (12+8+9) / (15+10+10) = 29/35 = 82.857 -> 83
      expect(out.get(1)).toEqual({ attempted: 2, accuracy: 83 });
      // sub 2: empty array — explicit zero, accuracy null (no scoreable attempts)
      expect(out.get(2)).toEqual({ attempted: 0, accuracy: null });
    });

    it('treats the same question_id appearing twice as one attempt', () => {
      const out = normalizeProgressPayload({
        data: {
          '5': [
            { question_id: 700, score: [{ score: 4, from: 10 }] },
            { question_id: 700, score: [{ score: 6, from: 10 }] }, // retry of same q
            { question_id: 701, score: [{ score: 5, from: 5 }] },
          ],
        },
      });
      // 2 unique question_ids; accuracy = (4+6+5)/(10+10+5) = 15/25 = 60
      expect(out.get(5)).toEqual({ attempted: 2, accuracy: 60 });
    });

    it('accepts the bare bucket map without the {data: ...} envelope', () => {
      const out = normalizeProgressPayload({
        '3': [{ question_id: 1, score: [{ score: 7, from: 10 }] }],
      });
      expect(out.get(3)?.accuracy).toBe(70);
    });

    it('clamps accuracy to [0, 100] and rounds to integer', () => {
      const out = normalizeProgressPayload({
        data: {
          '1': [
            // Backend bug: sum exceeds max (shouldn't happen but we guard).
            { question_id: 1, score: [{ score: 150, from: 100 }] },
          ],
          '2': [
            { question_id: 1, score: [{ score: -5, from: 10 }] }, // weird negative
          ],
        },
      });
      expect(out.get(1)?.accuracy).toBe(100);
      expect(out.get(2)?.accuracy).toBe(0);
    });

    it('skips score rows with non-numeric or zero `from`', () => {
      const out = normalizeProgressPayload({
        data: {
          '1': [
            {
              question_id: 1,
              score: [
                { score: 5, from: 0 },        // skipped (from=0)
                { score: 'n/a', from: 10 },   // skipped (score not numeric)
                { score: 8, from: 10 },       // kept
              ],
            },
          ],
        },
      });
      expect(out.get(1)).toEqual({ attempted: 1, accuracy: 80 });
    });

    it('returns accuracy=null when no rows have scoreable entries', () => {
      const out = normalizeProgressPayload({
        data: {
          '1': [{ question_id: 1 }, { question_id: 2 }], // no scores
        },
      });
      expect(out.get(1)).toEqual({ attempted: 2, accuracy: null });
    });

    it('accepts alternate score-entry field names (max / outOf)', () => {
      const out = normalizeProgressPayload({
        data: {
          '7': [{ question_id: 1, score: [{ score: 5, max: 10 }, { score: 4, outOf: 5 }] }],
        },
      });
      expect(out.get(7)?.accuracy).toBe(60); // 9/15
    });

    it('skips subcategory keys that are not positive integers', () => {
      const out = normalizeProgressPayload({
        data: {
          abc: [{ question_id: 1, score: [{ score: 5, from: 10 }] }],
          '-3': [{ question_id: 1, score: [{ score: 5, from: 10 }] }],
          '0': [{ question_id: 1, score: [{ score: 5, from: 10 }] }],
          '4': [{ question_id: 1, score: [{ score: 5, from: 10 }] }],
        },
      });
      expect(out.size).toBe(1);
      expect(out.has(4)).toBe(true);
    });

    it('returns an empty Map for malformed inputs', () => {
      expect(normalizeProgressPayload(null).size).toBe(0);
      expect(normalizeProgressPayload(undefined).size).toBe(0);
      expect(normalizeProgressPayload({ data: 'not-an-object' }).size).toBe(0);
      expect(normalizeProgressPayload([]).size).toBe(0);
    });
  });

  describe('mergeProgressData', () => {
    it('overrides categories.attempted with progress.attempted when both exist', () => {
      const subs = [
        { id: 1, title: 'A', skill: 'Speaking' as const, attempted: 12, total: 100, accuracy: null, targetAccuracy: 0 },
        { id: 2, title: 'B', skill: 'Writing' as const, attempted: 0, total: 20, accuracy: null, targetAccuracy: 0 },
      ];
      const stats = new Map([
        // Progress says 2 unique questions touched with 65% accuracy.
        [1, { attempted: 2, accuracy: 65 }],
      ]);
      const merged = mergeProgressData(subs, stats);
      // Sub 1 prefers progress.attempted (2) over categories.attempted (12).
      expect(merged.bySkill.Speaking[0]).toMatchObject({ attempted: 2, accuracy: 65 });
      // Sub 2 has no progress entry → keeps categories.attempted, null accuracy.
      expect(merged.bySkill.Writing[0]).toMatchObject({ attempted: 0, accuracy: null });
      expect(merged.populatedSkills.has('Speaking')).toBe(true);
      expect(merged.populatedSkills.has('Writing')).toBe(true);
      expect(merged.populatedSkills.has('Reading')).toBe(false);
    });

    it('returns an empty grouping for empty input', () => {
      const merged = mergeProgressData([], new Map());
      expect(merged.bySkill.Speaking).toEqual([]);
      expect(merged.populatedSkills.size).toBe(0);
    });
  });

  describe('computeProgressRatio', () => {
    it('returns 0 when total is 0 or negative', () => {
      expect(computeProgressRatio(5, 0)).toBe(0);
      expect(computeProgressRatio(5, -1)).toBe(0);
    });
    it('clamps the ratio to [0, 1]', () => {
      expect(computeProgressRatio(-1, 10)).toBe(0);
      expect(computeProgressRatio(15, 10)).toBe(1);
      expect(computeProgressRatio(5, 10)).toBe(0.5);
    });
  });
});
