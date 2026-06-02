import {
  extractQuestionList,
  normalizeMockAnalysis,
  subcategoryLabel,
} from './helpers';

const ctx = { mockId: 7 };

describe('extractQuestionList', () => {
  it('returns the array verbatim when given an array', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(extractQuestionList(arr)).toBe(arr);
  });

  it('unwraps each of the common envelope keys', () => {
    const arr = [{ id: 'x' }];
    for (const key of [
      'questions',
      'question_list',
      'questionList',
      'details',
      'detail',
      'items',
      'data',
      'list',
      'results',
    ]) {
      expect(extractQuestionList({ [key]: arr })).toBe(arr);
    }
  });

  it('handles a double-wrapped { data: { questions: [...] } } shape', () => {
    const arr = [{ id: 'nested' }];
    expect(extractQuestionList({ data: { questions: arr } })).toBe(arr);
  });

  it('falls back to the first array-typed top-level value', () => {
    const arr = [{ id: 'z' }];
    // None of the canonical keys present — but `weird_custom_key`
    // holds an array. The extractor should still find it.
    expect(extractQuestionList({ weird_custom_key: arr })).toBe(arr);
  });

  it('returns an empty array for non-objects / missing lists', () => {
    expect(extractQuestionList(null)).toEqual([]);
    expect(extractQuestionList(undefined)).toEqual([]);
    expect(extractQuestionList('garbage')).toEqual([]);
    expect(extractQuestionList(42)).toEqual([]);
    expect(extractQuestionList({})).toEqual([]);
    expect(extractQuestionList({ metadata: { foo: 'bar' } })).toEqual([]);
  });
});

describe('normalizeMockAnalysis', () => {
  it('returns an empty array for empty / junk payloads (no crash)', () => {
    expect(normalizeMockAnalysis(null, ctx)).toEqual([]);
    expect(normalizeMockAnalysis(undefined, ctx)).toEqual([]);
    expect(normalizeMockAnalysis({}, ctx)).toEqual([]);
    expect(normalizeMockAnalysis('nope', ctx)).toEqual([]);
    expect(normalizeMockAnalysis({ questions: 'not-an-array' }, ctx)).toEqual([]);
  });

  it('normalizes a canonical Speaking question with component scores', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          {
            id: 'q1',
            question_number: 1,
            subcategory_id: 1,
            title: 'Read this aloud',
            score: 65,
            max_score: 90,
            components: [
              { name: 'Content', score: 4, max: 5 },
              { name: 'Fluency', score: 75, max: 90 },
              { name: 'Pronunciation', score: 70, max: 90 },
            ],
          },
        ],
      },
      ctx,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '7-q1',
      questionNumber: 1,
      section: 'Speaking',
      subcategoryId: 1,
      title: 'Read this aloud',
      score: 65,
      maxScore: 90,
      verdict: null,
      componentScores: [
        { name: 'Content', score: 4, max: 5 },
        { name: 'Fluency', score: 75, max: 90 },
        { name: 'Pronunciation', score: 70, max: 90 },
      ],
    });
  });

  it('normalizes a binary MCQ with verdict + user / correct answers', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          {
            id: 'q2',
            question_number: 2,
            subcategory_id: 8,
            title: 'Pick the best summary',
            score: 1,
            max_score: 1,
            verdict: 'incorrect',
            user_answer: 'Option B',
            correct_answer: 'Option A',
          },
        ],
      },
      ctx,
    );
    expect(result[0]).toMatchObject({
      section: 'Reading',
      verdict: 'incorrect',
      userAnswer: 'Option B',
      correctAnswer: 'Option A',
    });
  });

  it('accepts boolean / numeric / string verdict aliases', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          { id: 'a', subcategory_id: 8, is_correct: true },
          { id: 'b', subcategory_id: 8, is_correct: false },
          { id: 'c', subcategory_id: 8, status: 'correct' },
          { id: 'd', subcategory_id: 8, status: 'wrong' },
          { id: 'e', subcategory_id: 8, status: 'partial' },
          { id: 'f', subcategory_id: 8, status: 'pass' },
          { id: 'g', subcategory_id: 8, correctness: 1 },
          { id: 'h', subcategory_id: 8, correctness: 0 },
          { id: 'i', subcategory_id: 8, correctness: 0.5 },
        ],
      },
      ctx,
    );
    expect(result.map(r => r.verdict)).toEqual([
      'correct',
      'incorrect',
      'correct',
      'incorrect',
      'partial',
      'correct',
      'correct',
      'incorrect',
      'partial',
    ]);
  });

  it('flattens array / option-object user and correct answers', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          {
            id: 'multi',
            subcategory_id: 9,
            user_answer: [
              { id: 'a', text: 'Option A' },
              { id: 'c', text: 'Option C' },
            ],
            correct_answer: ['Option A', 'Option B'],
          },
        ],
      },
      ctx,
    );
    expect(result[0].userAnswer).toBe('Option A · Option C');
    expect(result[0].correctAnswer).toBe('Option A · Option B');
  });

  it('flattens a { components: { content: {...}, fluency: {...} } } shape', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          {
            id: 'q-obj',
            subcategory_id: 1,
            components: {
              content: { score: 5, max: 6 },
              fluency: { score: 70, max: 90 },
            },
          },
        ],
      },
      ctx,
    );
    expect(result[0].componentScores).toEqual([
      { name: 'Content', score: 5, max: 6 },
      { name: 'Fluency', score: 70, max: 90 },
    ]);
  });

  it('falls back to default max=90 when component score has no out_of', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          {
            id: 'q-no-max',
            subcategory_id: 1,
            components: [{ name: 'Content', score: 4 }],
          },
        ],
      },
      ctx,
    );
    expect(result[0].componentScores).toEqual([
      { name: 'Content', score: 4, max: 90 },
    ]);
  });

  it('sorts entries by questionNumber (test order) regardless of source order', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          { id: 'three', question_number: 3, subcategory_id: 1 },
          { id: 'one', question_number: 1, subcategory_id: 1 },
          { id: 'two', question_number: 2, subcategory_id: 1 },
        ],
      },
      ctx,
    );
    expect(result.map(r => r.questionNumber)).toEqual([1, 2, 3]);
  });

  it('synthesizes ids and question numbers when the backend omits them', () => {
    const result = normalizeMockAnalysis(
      {
        // No id, no question_number — extractor still produces rows
        // keyed by array index.
        questions: [
          { subcategory_id: 1 },
          { subcategory_id: 6 },
        ],
      },
      ctx,
    );
    expect(result[0].id).toBe('7-idx-0');
    expect(result[0].questionNumber).toBe(1);
    expect(result[1].id).toBe('7-idx-1');
    expect(result[1].questionNumber).toBe(2);
  });

  it('drops entries that are not objects (defensive)', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          { id: 'good', subcategory_id: 1 },
          'string-entry',
          null,
          42,
        ],
      },
      ctx,
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('7-good');
  });

  it('preserves the original raw entry on each row for the debug sheet', () => {
    const entry = { id: 'r', subcategory_id: 1, custom: 'value' };
    const result = normalizeMockAnalysis({ questions: [entry] }, ctx);
    expect(result[0].raw).toBe(entry);
  });

  it('classifies sections from subcategory_id correctly', () => {
    const result = normalizeMockAnalysis(
      {
        questions: [
          { id: 'sp', subcategory_id: 1, question_number: 1 },
          { id: 'wr', subcategory_id: 6, question_number: 2 },
          { id: 'rd', subcategory_id: 10, question_number: 3 },
          { id: 'ls', subcategory_id: 14, question_number: 4 },
        ],
      },
      ctx,
    );
    expect(result.map(r => r.section)).toEqual([
      'Speaking',
      'Writing',
      'Reading',
      'Listening',
    ]);
  });
});

describe('subcategoryLabel', () => {
  it('returns human labels for every known subcategory', () => {
    expect(subcategoryLabel(1)).toBe('Read Aloud');
    expect(subcategoryLabel(7)).toBe('Essay');
    expect(subcategoryLabel(11)).toBe('Reading Fill Blanks');
    expect(subcategoryLabel(20)).toBe('Write From Dictation');
  });

  it('returns a safe fallback for null / unknown', () => {
    expect(subcategoryLabel(null)).toBe('Question');
  });
});
