import { dedupePastMocks } from './usePastMocks';
import type { PastMock } from '../types';

const mock = (overrides: Partial<PastMock>): PastMock => ({
  resultId: overrides.resultId ?? overrides.mockId ?? 1,
  mockId: overrides.mockId ?? 1,
  variant: overrides.variant ?? 'full',
  category: overrides.category ?? 'Full Mock',
  title: overrides.title ?? 'Mock #1',
  overall: overrides.overall ?? null,
  sectionScores: overrides.sectionScores ?? {},
  submittedAtIso: overrides.submittedAtIso ?? null,
  raw: overrides.raw ?? {},
});

describe('dedupePastMocks', () => {
  it('returns the input unchanged when there are no duplicates', () => {
    const input: PastMock[] = [
      mock({ mockId: 1, variant: 'full', overall: 65 }),
      mock({ mockId: 2, variant: 'full', overall: 70 }),
      mock({ mockId: 1, variant: 'extensive', overall: 60 }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(3);
    expect(result.map(m => `${m.variant}-${m.mockId}`)).toEqual([
      'full-1',
      'full-2',
      'extensive-1',
    ]);
  });

  it('collapses (variant, mockId) duplicates to a single record', () => {
    const input: PastMock[] = [
      mock({ mockId: 58, variant: 'full', overall: 65 }),
      mock({ mockId: 58, variant: 'full', overall: 65 }),
      mock({ mockId: 58, variant: 'full', overall: 65 }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(1);
  });

  it('prefers a graded duplicate over a pending one', () => {
    const input: PastMock[] = [
      mock({ mockId: 58, variant: 'full', overall: null, title: 'Pending row' }),
      mock({ mockId: 58, variant: 'full', overall: 65, title: 'Graded row' }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].overall).toBe(65);
    expect(result[0].title).toBe('Graded row');
  });

  it('keeps the graded row even when it appears first', () => {
    const input: PastMock[] = [
      mock({ mockId: 58, variant: 'full', overall: 65, title: 'Graded row' }),
      mock({ mockId: 58, variant: 'full', overall: null, title: 'Pending row' }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Graded row');
  });

  it('prefers the record with more section-score fields', () => {
    const input: PastMock[] = [
      mock({
        mockId: 58,
        variant: 'full',
        overall: 65,
        sectionScores: { Speaking: 70 },
        title: 'Single section',
      }),
      mock({
        mockId: 58,
        variant: 'full',
        overall: 65,
        sectionScores: {
          Speaking: 70,
          Writing: 60,
          Reading: 65,
          Listening: 68,
        },
        title: 'All sections',
      }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('All sections');
  });

  it('does NOT merge across different variants with the same mockId', () => {
    const input: PastMock[] = [
      mock({ mockId: 100, variant: 'full', overall: 70 }),
      mock({ mockId: 100, variant: 'extensive', overall: 60 }),
    ];
    const result = dedupePastMocks(input);
    expect(result).toHaveLength(2);
  });

  it('handles empty input', () => {
    expect(dedupePastMocks([])).toEqual([]);
  });

  it('handles all-duplicate input', () => {
    const input: PastMock[] = Array.from({ length: 5 }, () =>
      mock({ mockId: 58, variant: 'full', overall: 65 }),
    );
    expect(dedupePastMocks(input)).toHaveLength(1);
  });
});
