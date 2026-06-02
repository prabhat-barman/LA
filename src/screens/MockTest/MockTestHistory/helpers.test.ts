import type { PastMock } from '../MockTestResult/types';
import { sortPastMocks } from './helpers';

const mock = (overrides: Partial<PastMock>): PastMock => ({
  mockId: overrides.mockId ?? 1,
  variant: overrides.variant ?? 'full',
  category: overrides.category ?? 'Full Mock',
  title: overrides.title ?? 'Mock #1',
  overall: overrides.overall ?? null,
  sectionScores: overrides.sectionScores ?? {},
  submittedAtIso: overrides.submittedAtIso ?? null,
  raw: overrides.raw ?? {},
});

describe('sortPastMocks', () => {
  const dataset: PastMock[] = [
    mock({ mockId: 1, overall: 65, submittedAtIso: '2026-01-01T00:00:00Z' }),
    mock({ mockId: 2, overall: 70, submittedAtIso: '2026-03-01T00:00:00Z' }),
    mock({ mockId: 3, overall: 58, submittedAtIso: '2026-02-01T00:00:00Z' }),
    mock({ mockId: 4, overall: null, submittedAtIso: '2026-04-01T00:00:00Z' }),
    mock({ mockId: 5, overall: 65, submittedAtIso: '2026-05-01T00:00:00Z' }),
  ];

  it('does not mutate the input array', () => {
    const before = [...dataset];
    sortPastMocks(dataset, 'newest');
    expect(dataset).toEqual(before);
  });

  describe('newest', () => {
    it('sorts by submittedAtIso descending', () => {
      const result = sortPastMocks(dataset, 'newest');
      // Timestamps: 5=May, 4=Apr, 2=Mar, 3=Feb, 1=Jan
      expect(result.map(m => m.mockId)).toEqual([5, 4, 2, 3, 1]);
    });

    it('keeps pending mocks in their chronological position', () => {
      const result = sortPastMocks(dataset, 'newest');
      // Pending mock (id 4, April) sits in its date-ordered slot —
      // SECOND, not pushed to the end like the score-based sorts do.
      const pendingIdx = result.findIndex(m => m.mockId === 4);
      expect(pendingIdx).toBe(1);
    });
  });

  describe('oldest', () => {
    it('sorts by submittedAtIso ascending', () => {
      const result = sortPastMocks(dataset, 'oldest');
      // Timestamps: 1=Jan, 3=Feb, 2=Mar, 4=Apr, 5=May
      expect(result.map(m => m.mockId)).toEqual([1, 3, 2, 4, 5]);
    });
  });

  describe('highest', () => {
    it('sorts graded mocks by overall descending', () => {
      const result = sortPastMocks(dataset, 'highest');
      // Top 3 are graded (70, 65, 65, 58), pending sinks to end.
      expect(result.slice(0, 3).map(m => m.overall)).toEqual([70, 65, 65]);
    });

    it('pushes pending mocks to the end', () => {
      const result = sortPastMocks(dataset, 'highest');
      expect(result[result.length - 1].mockId).toBe(4);
    });

    it('tie-breaks on newer-first when scores match', () => {
      const result = sortPastMocks(dataset, 'highest');
      // Two mocks with overall 65: mockId 5 (May) is newer than 1 (Jan).
      // After the top single-70, mockId 5 should beat mockId 1.
      const sixtyFives = result.filter(m => m.overall === 65);
      expect(sixtyFives.map(m => m.mockId)).toEqual([5, 1]);
    });
  });

  describe('lowest', () => {
    it('sorts graded mocks by overall ascending', () => {
      const result = sortPastMocks(dataset, 'lowest');
      expect(result.slice(0, 4).map(m => m.overall)).toEqual([58, 65, 65, 70]);
    });

    it('still pushes pending mocks to the end (not the start)', () => {
      const result = sortPastMocks(dataset, 'lowest');
      expect(result[result.length - 1].mockId).toBe(4);
    });
  });

  it('handles all-pending input', () => {
    const allPending: PastMock[] = [
      mock({ mockId: 10, overall: null }),
      mock({ mockId: 11, overall: null }),
    ];
    expect(sortPastMocks(allPending, 'highest')).toHaveLength(2);
    expect(sortPastMocks(allPending, 'lowest')).toHaveLength(2);
  });

  it('handles empty input', () => {
    expect(sortPastMocks([], 'newest')).toEqual([]);
    expect(sortPastMocks([], 'highest')).toEqual([]);
  });
});
