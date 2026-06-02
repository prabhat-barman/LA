import type { PastMock } from '../MockTestResult/types';
import {
  applyProgressFilter,
  buildLineChartGeometry,
  computeGoalProgress,
  computeProgressStats,
  computeSectionStats,
  computeStreakSummary,
  identifyWeakestSection,
  MIN_GAP_FOR_CALLOUT,
  MIN_GRADED_FOR_WEAKEST,
} from './helpers';
import type { MockTestGoal, ProgressStats } from './types';

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

describe('applyProgressFilter', () => {
  const dataset: PastMock[] = [
    mock({ mockId: 1, variant: 'full', category: 'Full Mock' }),
    mock({ mockId: 2, variant: 'extensive', category: 'Speaking' }),
    mock({ mockId: 3, variant: 'full', category: 'Speaking' }),
    mock({ mockId: 4, variant: 'extensive', category: 'Full Mock' }),
  ];

  it('returns the entire dataset when both filters are null', () => {
    const result = applyProgressFilter(dataset, { variant: null, category: null });
    expect(result).toHaveLength(4);
  });

  it('filters by variant only', () => {
    const result = applyProgressFilter(dataset, {
      variant: 'full',
      category: null,
    });
    expect(result.map(m => m.mockId)).toEqual([1, 3]);
  });

  it('filters by category only', () => {
    const result = applyProgressFilter(dataset, {
      variant: null,
      category: 'Speaking',
    });
    expect(result.map(m => m.mockId)).toEqual([2, 3]);
  });

  it('intersects variant + category', () => {
    const result = applyProgressFilter(dataset, {
      variant: 'extensive',
      category: 'Speaking',
    });
    expect(result.map(m => m.mockId)).toEqual([2]);
  });

  it('returns an empty array when nothing matches', () => {
    const result = applyProgressFilter(dataset, {
      variant: 'full',
      category: 'Listening',
    });
    expect(result).toEqual([]);
  });
});

describe('computeProgressStats', () => {
  it('returns a fully-null block when there are no graded mocks', () => {
    const stats = computeProgressStats([]);
    expect(stats).toEqual({
      gradedCount: 0,
      totalCount: 0,
      averageOverall: null,
      bestOverall: null,
      latestOverall: null,
      trendDeltaVsPrevious: null,
    });
  });

  it('counts pending mocks toward totalCount but excludes them from score stats', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 70, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 2, overall: null }),
      mock({ mockId: 3, overall: null }),
    ]);
    expect(stats.gradedCount).toBe(1);
    expect(stats.totalCount).toBe(3);
    expect(stats.averageOverall).toBe(70);
    expect(stats.bestOverall).toBe(70);
    expect(stats.latestOverall).toBe(70);
    expect(stats.trendDeltaVsPrevious).toBeNull();
  });

  it('averages, finds best, and identifies latest by timestamp', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 60, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 2, overall: 80, submittedAtIso: '2025-03-01T00:00:00Z' }),
      mock({ mockId: 3, overall: 70, submittedAtIso: '2025-02-01T00:00:00Z' }),
    ]);
    expect(stats.gradedCount).toBe(3);
    expect(stats.totalCount).toBe(3);
    expect(stats.averageOverall).toBe(70);
    expect(stats.bestOverall).toBe(80);
    // Latest = mockId 2 (March 2025)
    expect(stats.latestOverall).toBe(80);
    // Previous graded = mockId 3 (February 2025) → delta = 80 - 70 = 10
    expect(stats.trendDeltaVsPrevious).toBe(10);
  });

  it('produces a negative trend delta when scores worsened', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 70, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 2, overall: 60, submittedAtIso: '2025-02-01T00:00:00Z' }),
    ]);
    expect(stats.latestOverall).toBe(60);
    expect(stats.trendDeltaVsPrevious).toBe(-10);
  });

  it('handles ties in timestamp via stable mockId ordering', () => {
    const stats = computeProgressStats([
      mock({ mockId: 'b', overall: 70, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 'a', overall: 80, submittedAtIso: '2025-01-01T00:00:00Z' }),
    ]);
    // Same timestamp → tie-break by mockId desc (string 'b' > 'a')
    expect(stats.latestOverall).toBe(70);
  });

  it('sinks timestamp-less mocks to the bottom of the recency order', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 50 /* no timestamp */ }),
      mock({ mockId: 2, overall: 80, submittedAtIso: '2025-01-01T00:00:00Z' }),
    ]);
    // The dated one wins the latest slot despite there being only 2.
    expect(stats.latestOverall).toBe(80);
    expect(stats.trendDeltaVsPrevious).toBe(80 - 50);
  });

  it('reports zero trend delta when consecutive scores match', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 65, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 2, overall: 65, submittedAtIso: '2025-02-01T00:00:00Z' }),
    ]);
    expect(stats.trendDeltaVsPrevious).toBe(0);
  });

  it('rounds the average to the nearest integer', () => {
    const stats = computeProgressStats([
      mock({ mockId: 1, overall: 60, submittedAtIso: '2025-01-01T00:00:00Z' }),
      mock({ mockId: 2, overall: 61, submittedAtIso: '2025-02-01T00:00:00Z' }),
      mock({ mockId: 3, overall: 65, submittedAtIso: '2025-03-01T00:00:00Z' }),
    ]);
    // (60+61+65)/3 = 62.0 → 62
    expect(stats.averageOverall).toBe(62);
  });
});

describe('buildLineChartGeometry', () => {
  const dims = { width: 300, height: 200 };

  it('returns empty geometry but valid grid lines for zero data', () => {
    const geom = buildLineChartGeometry([], dims);
    expect(geom.linePath).toBe('');
    expect(geom.points).toEqual([]);
    expect(geom.yGridLines.map(g => g.score)).toEqual([30, 50, 70, 90]);
  });

  it('skips pending mocks when building the chart', () => {
    const geom = buildLineChartGeometry(
      [
        mock({ mockId: 1, overall: null }),
        mock({ mockId: 2, overall: 65 }),
        mock({ mockId: 3, overall: null }),
      ],
      dims,
    );
    expect(geom.points).toHaveLength(1);
    expect(geom.points[0].score).toBe(65);
  });

  it('renders a single point centred horizontally with no line path', () => {
    const geom = buildLineChartGeometry(
      [mock({ mockId: 1, overall: 50 })],
      dims,
    );
    expect(geom.points).toHaveLength(1);
    expect(geom.linePath).toBe('');
    // x = midpoint of inner area
    const innerLeft = 32; // default paddingLeft
    const innerRight = 300 - 12; // width - paddingRight
    expect(geom.points[0].x).toBeCloseTo((innerLeft + innerRight) / 2);
  });

  it('distributes multiple points evenly across the inner width', () => {
    const geom = buildLineChartGeometry(
      [
        mock({ mockId: 1, overall: 30 }),
        mock({ mockId: 2, overall: 60 }),
        mock({ mockId: 3, overall: 90 }),
      ],
      dims,
    );
    expect(geom.points).toHaveLength(3);
    expect(geom.points[0].x).toBeCloseTo(32); // innerLeft
    expect(geom.points[2].x).toBeCloseTo(300 - 12); // innerRight
    expect(geom.points[1].x).toBeCloseTo((32 + (300 - 12)) / 2);
  });

  it('inverts the PTE band so higher scores render at the top (smaller y)', () => {
    const geom = buildLineChartGeometry(
      [
        mock({ mockId: 1, overall: 90 }),
        mock({ mockId: 2, overall: 10 }),
      ],
      dims,
    );
    // 90 is at the top → smaller y; 10 is at the bottom → larger y.
    expect(geom.points[0].y).toBeLessThan(geom.points[1].y);
    // Score 90 should sit at the top inner edge.
    expect(geom.points[0].y).toBeCloseTo(16); // paddingTop default
    // Score 10 should sit at the bottom inner edge.
    expect(geom.points[1].y).toBeCloseTo(200 - 24); // height - paddingBottom
  });

  it('builds an SVG path with M for the first point and L for the rest', () => {
    const geom = buildLineChartGeometry(
      [
        mock({ mockId: 1, overall: 50 }),
        mock({ mockId: 2, overall: 60 }),
        mock({ mockId: 3, overall: 70 }),
      ],
      dims,
    );
    expect(geom.linePath.startsWith('M ')).toBe(true);
    expect((geom.linePath.match(/L /g) ?? []).length).toBe(2);
  });

  it('clamps out-of-band scores into the PTE band so they never overshoot the chart', () => {
    // Backend should never ship these, but defensive clamping protects
    // the chart from a stray 0 or 95.
    const geom = buildLineChartGeometry(
      [
        mock({ mockId: 1, overall: 0 }),
        mock({ mockId: 2, overall: 200 }),
      ],
      dims,
    );
    // 0 clamps to 10 → bottom of chart; 200 clamps to 90 → top.
    expect(geom.points[0].y).toBeCloseTo(200 - 24);
    expect(geom.points[1].y).toBeCloseTo(16);
  });

  it('respects custom padding overrides', () => {
    const geom = buildLineChartGeometry(
      [mock({ mockId: 1, overall: 50 })],
      { ...dims, paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 },
    );
    // Single point centred between left=16 and right=300-16=284
    expect(geom.points[0].x).toBeCloseTo((16 + 284) / 2);
  });

  it('carries the source PastMock on each point for drill-in routing', () => {
    const m1 = mock({ mockId: 'tap-me', overall: 65 });
    const geom = buildLineChartGeometry([m1], dims);
    expect(geom.points[0].mock).toBe(m1);
  });
});

describe('computeSectionStats', () => {
  it('returns an all-null stats block when no mock has the section score', () => {
    const stats = computeSectionStats(
      [mock({ mockId: 1, overall: 70, sectionScores: {} })],
      'Speaking',
    );
    expect(stats.gradedCount).toBe(0);
    expect(stats.averageScore).toBeNull();
    expect(stats.bestScore).toBeNull();
    expect(stats.latestScore).toBeNull();
    expect(stats.trendDeltaVsPrevious).toBeNull();
    expect(stats.scoreSeries).toEqual([]);
  });

  it('averages, finds best, and identifies latest by timestamp for the requested section', () => {
    const stats = computeSectionStats(
      [
        mock({
          mockId: 1,
          sectionScores: { Speaking: 60, Writing: 70 },
          submittedAtIso: '2025-01-01T00:00:00Z',
        }),
        mock({
          mockId: 2,
          sectionScores: { Speaking: 80, Writing: 50 },
          submittedAtIso: '2025-03-01T00:00:00Z',
        }),
        mock({
          mockId: 3,
          sectionScores: { Speaking: 70 /* no Writing */ },
          submittedAtIso: '2025-02-01T00:00:00Z',
        }),
      ],
      'Speaking',
    );
    expect(stats.gradedCount).toBe(3);
    // Speaking: (60+80+70)/3 = 70
    expect(stats.averageScore).toBe(70);
    expect(stats.bestScore).toBe(80);
    // Latest by timestamp = mockId 2 (March)
    expect(stats.latestScore).toBe(80);
    // Previous = mockId 3 (Feb) → delta = 80 - 70 = 10
    expect(stats.trendDeltaVsPrevious).toBe(10);
  });

  it('returns the score series oldest-first for chart consumption', () => {
    const stats = computeSectionStats(
      [
        mock({
          mockId: 'b',
          sectionScores: { Speaking: 80 },
          submittedAtIso: '2025-03-01T00:00:00Z',
        }),
        mock({
          mockId: 'a',
          sectionScores: { Speaking: 60 },
          submittedAtIso: '2025-01-01T00:00:00Z',
        }),
      ],
      'Speaking',
    );
    expect(stats.scoreSeries.map(s => s.score)).toEqual([60, 80]);
  });

  it('ignores mocks where the section score is null (e.g. pending grading)', () => {
    const stats = computeSectionStats(
      [
        mock({
          mockId: 1,
          sectionScores: { Speaking: 60 },
          submittedAtIso: '2025-01-01T00:00:00Z',
        }),
        mock({
          mockId: 2,
          sectionScores: { Speaking: null },
          submittedAtIso: '2025-02-01T00:00:00Z',
        }),
      ],
      'Speaking',
    );
    expect(stats.gradedCount).toBe(1);
    expect(stats.averageScore).toBe(60);
  });

  it('pulls section scores from extensive mocks (which mirror overall into one section)', () => {
    // Realistic dataset: a Full Mock contributes all four sections,
    // an extensive Speaking mock contributes only Speaking.
    const stats = computeSectionStats(
      [
        mock({
          mockId: 1,
          variant: 'full',
          category: 'Full Mock',
          sectionScores: {
            Speaking: 70,
            Writing: 65,
            Reading: 80,
            Listening: 60,
          },
          submittedAtIso: '2025-01-01T00:00:00Z',
        }),
        mock({
          mockId: 2,
          variant: 'extensive',
          category: 'Speaking',
          sectionScores: { Speaking: 80 },
          submittedAtIso: '2025-02-01T00:00:00Z',
        }),
      ],
      'Speaking',
    );
    expect(stats.gradedCount).toBe(2);
    expect(stats.averageScore).toBe(75);
    expect(stats.scoreSeries.map(s => s.score)).toEqual([70, 80]);
  });

  it('reports a null trend delta when only one graded mock exists', () => {
    const stats = computeSectionStats(
      [mock({ mockId: 1, sectionScores: { Speaking: 65 } })],
      'Speaking',
    );
    expect(stats.trendDeltaVsPrevious).toBeNull();
  });
});

describe('identifyWeakestSection', () => {
  it('returns null when no section has the minimum number of graded scores', () => {
    expect(
      identifyWeakestSection([
        mock({
          mockId: 1,
          sectionScores: {
            Speaking: 50,
            Writing: 60,
            Reading: 70,
            Listening: 80,
          },
        }),
      ]),
    ).toBeNull();
  });

  it(`returns null when fewer than ${MIN_GRADED_FOR_WEAKEST} sections have data`, () => {
    // Only Speaking has 2+ scores; the other sections have none.
    // Can't meaningfully say Speaking is "weakest" with nothing
    // to compare it to.
    const dataset: PastMock[] = [
      mock({ mockId: 1, sectionScores: { Speaking: 50 } }),
      mock({ mockId: 2, sectionScores: { Speaking: 60 } }),
    ];
    expect(identifyWeakestSection(dataset)).toBeNull();
  });

  it('identifies the section with the lowest average across comparable sections', () => {
    const dataset: PastMock[] = [
      mock({
        mockId: 1,
        sectionScores: {
          Speaking: 80,
          Writing: 50,
          Reading: 75,
          Listening: 70,
        },
        submittedAtIso: '2025-01-01T00:00:00Z',
      }),
      mock({
        mockId: 2,
        sectionScores: {
          Speaking: 78,
          Writing: 52,
          Reading: 73,
          Listening: 72,
        },
        submittedAtIso: '2025-02-01T00:00:00Z',
      }),
    ];
    const result = identifyWeakestSection(dataset);
    expect(result?.section).toBe('Writing');
    expect(result?.averageScore).toBe(51); // (50 + 52) / 2
    // Strongest avg: Speaking = 79; gap = 79 - 51 = 28
    expect(result?.gapToStrongest).toBe(28);
  });

  it(`returns null when the gap is below ${MIN_GAP_FOR_CALLOUT} (sections essentially tied)`, () => {
    // Sections within 2 pts — no actionable advice possible.
    const dataset: PastMock[] = [
      mock({
        mockId: 1,
        sectionScores: {
          Speaking: 70,
          Writing: 71,
          Reading: 70,
          Listening: 72,
        },
      }),
      mock({
        mockId: 2,
        sectionScores: {
          Speaking: 71,
          Writing: 70,
          Reading: 72,
          Listening: 71,
        },
      }),
    ];
    expect(identifyWeakestSection(dataset)).toBeNull();
  });

  it('skips sections with insufficient data instead of treating them as weakest', () => {
    // Reading has only 1 graded score (50 — would look weakest by raw
    // number), but the helper should ignore it for lack of confidence
    // and pick from the sections with 2+ scores.
    const dataset: PastMock[] = [
      mock({
        mockId: 1,
        sectionScores: {
          Speaking: 80,
          Writing: 60,
          Reading: 50, // single sample, should be excluded
        },
      }),
      mock({
        mockId: 2,
        sectionScores: { Speaking: 78, Writing: 62 },
      }),
    ];
    const result = identifyWeakestSection(dataset);
    expect(result?.section).toBe('Writing');
  });
});

describe('computeGoalProgress', () => {
  const goal: MockTestGoal = {
    targetScore: 70,
    targetDateIso: '2026-12-31T00:00:00.000Z',
    createdAtIso: '2026-06-01T00:00:00.000Z',
  };

  const baseStats: ProgressStats = {
    gradedCount: 0,
    totalCount: 0,
    averageOverall: null,
    bestOverall: null,
    latestOverall: null,
    trendDeltaVsPrevious: null,
  };

  it('returns null when no goal is set', () => {
    expect(computeGoalProgress(null, baseStats, '2026-06-01T00:00:00.000Z'))
      .toBeNull();
  });

  it('reports days remaining + null score when no graded mocks exist', () => {
    const result = computeGoalProgress(
      goal,
      baseStats,
      '2026-12-01T00:00:00.000Z',
    );
    expect(result?.currentScore).toBeNull();
    expect(result?.pointsToGoal).toBeNull();
    expect(result?.progressRatio).toBeNull();
    expect(result?.isAchieved).toBe(false);
    expect(result?.daysRemaining).toBe(30);
    expect(result?.isExpired).toBe(false);
  });

  it('computes points to goal when latest is below target', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 58 };
    const result = computeGoalProgress(goal, stats, '2026-06-01T00:00:00.000Z');
    expect(result?.currentScore).toBe(58);
    expect(result?.pointsToGoal).toBe(12);
    expect(result?.isAchieved).toBe(false);
    expect(result?.progressRatio).toBeCloseTo(58 / 70, 5);
  });

  it('marks the goal as achieved when latest meets or exceeds target', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 70 };
    const result = computeGoalProgress(goal, stats, '2026-06-01T00:00:00.000Z');
    expect(result?.isAchieved).toBe(true);
    expect(result?.pointsToGoal).toBe(0);
  });

  it('clamps points to goal at zero when latest beats target', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 79 };
    const result = computeGoalProgress(goal, stats, '2026-06-01T00:00:00.000Z');
    expect(result?.pointsToGoal).toBe(0);
    expect(result?.progressRatio).toBe(1);
  });

  it('reports negative daysRemaining when past deadline', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 58 };
    const result = computeGoalProgress(
      goal,
      stats,
      '2027-01-15T00:00:00.000Z',
    );
    expect(result?.daysRemaining).toBe(-15);
    expect(result?.isExpired).toBe(true);
  });

  it('does NOT mark a past-deadline goal as expired when achieved', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 79 };
    const result = computeGoalProgress(
      goal,
      stats,
      '2027-01-15T00:00:00.000Z',
    );
    expect(result?.daysRemaining).toBe(-15);
    expect(result?.isAchieved).toBe(true);
    expect(result?.isExpired).toBe(false);
  });

  it('rounds days remaining at local-midnight boundary', () => {
    // A few hours into the same UTC day should report 0, not -1.
    const stats: ProgressStats = { ...baseStats, latestOverall: 60 };
    const result = computeGoalProgress(
      { ...goal, targetDateIso: '2026-12-31T00:00:00.000Z' },
      stats,
      '2026-12-31T08:30:00.000Z',
    );
    expect(result?.daysRemaining).toBe(0);
  });

  it('handles unparseable target date by returning 0 daysRemaining', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 60 };
    const result = computeGoalProgress(
      { ...goal, targetDateIso: 'not a date' },
      stats,
      '2026-06-01T00:00:00.000Z',
    );
    expect(result?.daysRemaining).toBe(0);
  });

  it('clamps progressRatio into [0, 1]', () => {
    const stats: ProgressStats = { ...baseStats, latestOverall: 90 };
    const result = computeGoalProgress(
      { ...goal, targetScore: 50 },
      stats,
      '2026-06-01T00:00:00.000Z',
    );
    expect(result?.progressRatio).toBe(1);
  });
});

describe('computeStreakSummary', () => {
  // Anchor "now" so the tests don't depend on the wall clock. All
  // mock submission dates are anchored relative to this.
  const NOW = '2026-06-15T12:00:00.000Z';

  it('returns zeros for empty input', () => {
    const result = computeStreakSummary([], NOW);
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      daysSinceLastMock: null,
      needsTodayToExtend: false,
    });
  });

  it('skips mocks with no submission timestamp', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: null }),
      mock({ mockId: 2, submittedAtIso: undefined as unknown as null }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(0);
    expect(result.daysSinceLastMock).toBeNull();
  });

  it('counts a single mock today as a 1-day streak', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-15T08:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.daysSinceLastMock).toBe(0);
    expect(result.needsTodayToExtend).toBe(false);
  });

  it('counts a single mock yesterday as a 1-day streak needing today', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-14T20:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(1);
    expect(result.daysSinceLastMock).toBe(1);
    expect(result.needsTodayToExtend).toBe(true);
  });

  it('breaks the streak when the latest mock is 2+ days ago', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-13T08:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(0);
    expect(result.daysSinceLastMock).toBe(2);
    expect(result.needsTodayToExtend).toBe(false);
  });

  it('extends the current streak across consecutive days ending today', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-13T08:00:00Z' }),
      mock({ mockId: 2, submittedAtIso: '2026-06-14T09:00:00Z' }),
      mock({ mockId: 3, submittedAtIso: '2026-06-15T10:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.daysSinceLastMock).toBe(0);
  });

  it('dedups same-day mocks into one streak day', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-15T01:00:00Z' }),
      mock({ mockId: 2, submittedAtIso: '2026-06-15T13:00:00Z' }),
      mock({ mockId: 3, submittedAtIso: '2026-06-15T23:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('records longestStreak independently of the current streak', () => {
    const mocks: PastMock[] = [
      // Old 5-day run (Jan 1–5)
      mock({ mockId: 1, submittedAtIso: '2026-01-01T10:00:00Z' }),
      mock({ mockId: 2, submittedAtIso: '2026-01-02T10:00:00Z' }),
      mock({ mockId: 3, submittedAtIso: '2026-01-03T10:00:00Z' }),
      mock({ mockId: 4, submittedAtIso: '2026-01-04T10:00:00Z' }),
      mock({ mockId: 5, submittedAtIso: '2026-01-05T10:00:00Z' }),
      // Single mock today
      mock({ mockId: 6, submittedAtIso: '2026-06-15T08:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(5);
  });

  it('does not extend the current streak across a gap', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-12T10:00:00Z' }),
      // gap on June 13
      mock({ mockId: 2, submittedAtIso: '2026-06-14T10:00:00Z' }),
      mock({ mockId: 3, submittedAtIso: '2026-06-15T10:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, NOW);
    expect(result.currentStreak).toBe(2);
    // Longest run was 2 days (14th–15th) — the 12th was a singleton.
    expect(result.longestStreak).toBe(2);
  });

  it('uses UTC midnight, not local, for day boundaries', () => {
    // A mock submitted late on June 14 UTC should still be "yesterday"
    // relative to a "now" of early June 15 UTC, even though their
    // wall-clock difference is small.
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-14T23:30:00Z' }),
    ];
    const result = computeStreakSummary(mocks, '2026-06-15T00:30:00Z');
    expect(result.daysSinceLastMock).toBe(1);
    expect(result.needsTodayToExtend).toBe(true);
  });

  it('handles an unparseable nowIso defensively', () => {
    const mocks: PastMock[] = [
      mock({ mockId: 1, submittedAtIso: '2026-06-15T10:00:00Z' }),
      mock({ mockId: 2, submittedAtIso: '2026-06-14T10:00:00Z' }),
    ];
    const result = computeStreakSummary(mocks, 'not a date');
    expect(result.currentStreak).toBe(0);
    expect(result.daysSinceLastMock).toBeNull();
    // Longest is still calculable from the data.
    expect(result.longestStreak).toBe(2);
  });
});

