import type { PastMock } from '../MockTestResult/types';
import type { MockSection } from '../MockTestRunner/types';
import type {
  GoalProgress,
  MockTestGoal,
  ProgressFilter,
  ProgressStats,
  SectionStats,
  StreakSummary,
  TrendGeometry,
  TrendPoint,
  WeakestSkillResult,
} from './types';

// ── Filtering ───────────────────────────────────────────────────────
//
// Apply the user-selected filter chips. Filter is intentionally
// permissive: a `null` field matches everything. Out-of-scope mocks
// (different variant / different category) are simply dropped from
// downstream stats and chart — they never count toward averages or
// trend deltas.
export const applyProgressFilter = (
  mocks: PastMock[],
  filter: ProgressFilter,
): PastMock[] => {
  if (filter.variant == null && filter.category == null) return mocks;
  return mocks.filter(m => {
    if (filter.variant != null && m.variant !== filter.variant) return false;
    if (filter.category != null && m.category !== filter.category) return false;
    return true;
  });
};

// ── Stats ───────────────────────────────────────────────────────────
//
// Compute total / average / best / latest / trend delta for a list of
// past mocks. Pending mocks (`overall == null`) are excluded from every
// score-derived stat — including a `null` in averages would either
// crash or produce misleading numbers. They still count toward
// `totalCount` so the user gets credit for taking the test.
//
// The "latest" definition: the most recent GRADED mock by
// submittedAtIso, NOT necessarily the first element of the input
// array (which happens to be newest-first because `usePastMocks`
// sorts that way, but this helper doesn't assume input order).
//
// The "trend delta" is `latest - previousGraded`. Positive = improved.
// Null when fewer than 2 graded mocks exist.
export const computeProgressStats = (mocks: PastMock[]): ProgressStats => {
  const graded = mocks.filter(
    (m): m is PastMock & { overall: number } => m.overall != null,
  );

  if (graded.length === 0) {
    return {
      gradedCount: 0,
      totalCount: mocks.length,
      averageOverall: null,
      bestOverall: null,
      latestOverall: null,
      trendDeltaVsPrevious: null,
    };
  }

  // Sort newest-first by completion time, then by mockId as a stable
  // tie-breaker. Mocks without a timestamp sink to the bottom so they
  // don't accidentally "win" the latest slot.
  const sortedNewestFirst = [...graded].sort((a, b) => {
    const aTime = a.submittedAtIso ? Date.parse(a.submittedAtIso) : 0;
    const bTime = b.submittedAtIso ? Date.parse(b.submittedAtIso) : 0;
    if (aTime !== bTime) return bTime - aTime;
    // String compare is fine — both kinds of mockId convert to string
    // consistently and ordering is just for tie-breaking stability.
    return String(b.mockId).localeCompare(String(a.mockId));
  });

  const sum = graded.reduce((acc, m) => acc + m.overall, 0);
  const averageOverall = Math.round(sum / graded.length);
  const bestOverall = graded.reduce(
    (best, m) => (m.overall > best ? m.overall : best),
    graded[0].overall,
  );
  const latestOverall = sortedNewestFirst[0].overall;
  const trendDeltaVsPrevious =
    sortedNewestFirst.length >= 2
      ? latestOverall - sortedNewestFirst[1].overall
      : null;

  return {
    gradedCount: graded.length,
    totalCount: mocks.length,
    averageOverall,
    bestOverall,
    latestOverall,
    trendDeltaVsPrevious,
  };
};

// ── Chart geometry ─────────────────────────────────────────────────
//
// Pure path math, no React Native imports — easy to unit-test against
// known fixtures. Produces an SVG-compatible polyline `d` string + a
// flat list of per-point coordinates + horizontal grid lines.
//
// Coordinate system is top-anchored (larger y = lower on screen), so
// we INVERT the PTE band — a higher score sits closer to the top of
// the chart, matching universal "up = better" intuition.

export interface ChartDimensions {
  // Drawable width / height in pixels. Caller is responsible for any
  // padding around the chart container.
  width: number;
  height: number;
  // Inner padding so the trend line / dots don't kiss the edges.
  // Defaults applied in `buildLineChartGeometry` when fields are
  // omitted.
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

// PTE band — chart's y-axis range. We always render the FULL band
// rather than auto-scaling to the data's min/max so a "65 → 67"
// improvement doesn't look identical to a "30 → 65" jump. Visual
// consistency over visual drama.
const Y_MIN = 10;
const Y_MAX = 90;

// Horizontal grid line scores (PTE band markers — match the band
// rubric used elsewhere in the result family).
const GRID_SCORES = [30, 50, 70, 90];

// Maps a PTE score onto the chart's y pixel coordinate. Higher
// scores → lower y (closer to the top).
const scoreToY = (
  score: number,
  innerTop: number,
  innerBottom: number,
): number => {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, score));
  const t = (clamped - Y_MIN) / (Y_MAX - Y_MIN); // 0..1
  return innerBottom - t * (innerBottom - innerTop);
};

// Builds the chart geometry from a list of PastMocks. We accept the
// full PastMock array (not just numbers) so the resulting TrendPoints
// can carry the source mock back to the UI for tap routing.
//
// Order matters — the input determines the trend's left→right order
// on screen. Callers should sort OLDEST-first before calling so the
// chart reads naturally as "time progresses to the right" (matching
// every other chart in the universe).
//
// Returns an empty geometry (zero points, empty path) for zero-length
// or empty input. The component renders a fallback "no data" state.
export const buildLineChartGeometry = (
  mocks: PastMock[],
  dims: ChartDimensions,
): TrendGeometry => {
  const paddingTop = dims.paddingTop ?? 16;
  const paddingBottom = dims.paddingBottom ?? 24;
  const paddingLeft = dims.paddingLeft ?? 32;
  const paddingRight = dims.paddingRight ?? 12;

  const innerLeft = paddingLeft;
  const innerRight = dims.width - paddingRight;
  const innerTop = paddingTop;
  const innerBottom = dims.height - paddingBottom;

  // Grid lines first — they don't depend on the data, only the
  // chart's coordinate system. Pre-compute so the component can
  // render them in a single pass without re-deriving inside JSX.
  const yGridLines = GRID_SCORES.map(score => ({
    y: scoreToY(score, innerTop, innerBottom),
    label: String(score),
    score,
  }));

  // Filter to graded mocks only. Including pending (`overall == null`)
  // would either crash the math or produce a misleading "0" spike.
  const graded = mocks.filter(
    (m): m is PastMock & { overall: number } => m.overall != null,
  );

  if (graded.length === 0) {
    return { linePath: '', points: [], yGridLines };
  }

  // Single-point edge case — render as just a dot. SVG polyline with
  // one point is invalid; the path string stays empty and the
  // component falls back to a dot-only render.
  if (graded.length === 1) {
    const xMid = (innerLeft + innerRight) / 2;
    const y = scoreToY(graded[0].overall, innerTop, innerBottom);
    return {
      linePath: '',
      points: [{ x: xMid, y, score: graded[0].overall, mock: graded[0] }],
      yGridLines,
    };
  }

  // Distribute points evenly across the inner width. Time-axis
  // proportional spacing would also work but adds complexity (need
  // to handle missing timestamps + uneven gaps); evenly-spaced
  // matches PTE's reference UI and avoids over-emphasizing
  // chronological clustering.
  const stepX = (innerRight - innerLeft) / (graded.length - 1);
  const points: TrendPoint[] = graded.map((mock, idx) => ({
    x: innerLeft + idx * stepX,
    y: scoreToY(mock.overall, innerTop, innerBottom),
    score: mock.overall,
    mock,
  }));

  // SVG path: M (first point) → L (every subsequent). Round to 2dp
  // to keep the path string compact in component re-renders.
  const round = (n: number) => Math.round(n * 100) / 100;
  const linePath = points
    .map((p, idx) =>
      idx === 0 ? `M ${round(p.x)} ${round(p.y)}` : `L ${round(p.x)} ${round(p.y)}`,
    )
    .join(' ');

  return { linePath, points, yGridLines };
};

// ── Per-section stats (Phase 6.1) ──────────────────────────────────
//
// Same recipe as `computeProgressStats` but scoped to one section.
// Iterates the past mocks, picks the section's score from
// `sectionScores[section]` (set by the result normalizer's
// opportunistic per-section extraction), filters out missing scores,
// then computes average / best / latest / trend delta on the
// remaining numbers.
//
// `scoreSeries` is sorted OLDEST-first so the per-section trend
// sparkline reads left-to-right chronologically.

export const SECTIONS_IN_ORDER: ReadonlyArray<MockSection> = [
  'Speaking',
  'Writing',
  'Reading',
  'Listening',
];

export const computeSectionStats = (
  mocks: PastMock[],
  section: MockSection,
): SectionStats => {
  // Each entry: { score, mock, timestamp }. Timestamp pulled out
  // for sorting; not returned to callers.
  const entries: Array<{ score: number; mock: PastMock; ts: number }> = [];
  for (const mock of mocks) {
    const sectionScore = mock.sectionScores?.[section];
    if (sectionScore == null) continue;
    const ts = mock.submittedAtIso ? Date.parse(mock.submittedAtIso) : 0;
    entries.push({ score: sectionScore, mock, ts });
  }

  if (entries.length === 0) {
    return {
      section,
      gradedCount: 0,
      averageScore: null,
      bestScore: null,
      latestScore: null,
      trendDeltaVsPrevious: null,
      scoreSeries: [],
    };
  }

  // For "latest" + "trend delta" we want newest-first (so [0] is the
  // most recent score). For the chart series we want oldest-first
  // (left-to-right reads as "time progresses"). Compute the two
  // orderings independently to keep each consumer trivial.
  const newestFirst = [...entries].sort((a, b) => {
    if (a.ts !== b.ts) return b.ts - a.ts;
    return String(b.mock.mockId).localeCompare(String(a.mock.mockId));
  });
  const oldestFirst = [...entries].sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    return String(a.mock.mockId).localeCompare(String(b.mock.mockId));
  });

  const sum = entries.reduce((acc, e) => acc + e.score, 0);
  const averageScore = Math.round(sum / entries.length);
  const bestScore = entries.reduce(
    (best, e) => (e.score > best ? e.score : best),
    entries[0].score,
  );
  const latestScore = newestFirst[0].score;
  const trendDeltaVsPrevious =
    newestFirst.length >= 2 ? latestScore - newestFirst[1].score : null;

  return {
    section,
    gradedCount: entries.length,
    averageScore,
    bestScore,
    latestScore,
    trendDeltaVsPrevious,
    scoreSeries: oldestFirst.map(e => ({ score: e.score, mock: e.mock })),
  };
};

// Identifies the section with the lowest average across the
// dataset, suitable for surfacing as a "focus area" callout. Only
// considers sections with at least `MIN_GRADED_FOR_WEAKEST` graded
// scores — one bad Reading test shouldn't get flagged as "weakest"
// when the user has 10 strong Speaking results. Confidence-aware
// recommendation.
//
// Returns null when:
//   • Fewer than 2 sections have enough data to compare (no
//     meaningful "weakest" possible — comparison-free), OR
//   • The gap between weakest and strongest is below
//     `MIN_GAP_FOR_CALLOUT` (sections are essentially tied — no
//     actionable advice).
export const MIN_GRADED_FOR_WEAKEST = 2;
export const MIN_GAP_FOR_CALLOUT = 3;

export const identifyWeakestSection = (
  mocks: PastMock[],
): WeakestSkillResult | null => {
  const sectionAverages: Array<{ section: MockSection; avg: number }> = [];
  for (const section of SECTIONS_IN_ORDER) {
    const stats = computeSectionStats(mocks, section);
    if (
      stats.gradedCount < MIN_GRADED_FOR_WEAKEST ||
      stats.averageScore == null
    ) {
      continue;
    }
    sectionAverages.push({ section, avg: stats.averageScore });
  }

  if (sectionAverages.length < 2) return null;

  // Sort ascending — weakest first.
  sectionAverages.sort((a, b) => a.avg - b.avg);
  const weakest = sectionAverages[0];
  const strongest = sectionAverages[sectionAverages.length - 1];
  const gap = strongest.avg - weakest.avg;
  if (gap < MIN_GAP_FOR_CALLOUT) return null;

  return {
    section: weakest.section,
    averageScore: weakest.avg,
    gapToStrongest: gap,
  };
};

// ── Goal progress (Phase 6.2) ──────────────────────────────────────
//
// Pure derivation: given a goal + the current stats, compute the
// "where are you" snapshot the GoalProgressCard renders. Kept as a
// pure function (no `Date.now()` baked in — caller passes `now`) so
// it's trivially testable against known fixtures.
//
// The "currentScore" question is non-obvious. Three plausible
// choices:
//   • `latestOverall` — most honest about the present, but volatile
//   • `averageOverall` — smoother, but lags real improvement
//   • `bestOverall`   — most motivating, but ignores regression
// We picked latest: goal-tracking is forward-looking, the user's
// next attempt is the one that counts, and the trend chart above
// already shows the average story.

// Computes the number of full days between two ISO date strings,
// using local-midnight comparison. Returns a positive number when
// `targetIso` is in the future, negative when past, 0 when same day.
// Local-midnight (vs. raw ms diff) avoids "23h difference reads as
// 0 days" rounding errors that would jump the day-counter erratically
// across timezones.
const daysBetween = (nowIso: string, targetIso: string): number => {
  const nowDate = new Date(nowIso);
  const targetDate = new Date(targetIso);
  if (Number.isNaN(nowDate.getTime()) || Number.isNaN(targetDate.getTime())) {
    return 0;
  }
  const nowMidnight = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate(),
  );
  const targetMidnight = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
  );
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((targetMidnight - nowMidnight) / MS_PER_DAY);
};

export const computeGoalProgress = (
  goal: MockTestGoal | null,
  stats: ProgressStats,
  nowIso: string = new Date().toISOString(),
): GoalProgress | null => {
  if (!goal) return null;

  const currentScore = stats.latestOverall;
  const daysRemaining = daysBetween(nowIso, goal.targetDateIso);

  // No graded mocks yet — the goal is set but we can't compute
  // "X points to go" honestly. UI shows a "take a mock to track
  // progress" hint. We still surface `daysRemaining` because that
  // independently of mock data, and the user benefits from seeing
  // "8 weeks until your target date" even before they start scoring.
  if (currentScore == null) {
    return {
      goal,
      currentScore: null,
      pointsToGoal: null,
      isAchieved: false,
      daysRemaining,
      isExpired: daysRemaining < 0,
      progressRatio: null,
    };
  }

  const pointsToGoal = Math.max(0, goal.targetScore - currentScore);
  const isAchieved = currentScore >= goal.targetScore;
  // Clamp to [0, 1] so the progress bar never overflows when the
  // user blows past their goal (e.g. set 65, actually scored 79).
  const progressRatio = Math.max(0, Math.min(1, currentScore / goal.targetScore));

  return {
    goal,
    currentScore,
    pointsToGoal,
    isAchieved,
    // Expired only when not achieved — if the user hit their target
    // BEFORE the deadline, the deadline passing isn't a "failure",
    // it's just a stale reference point.
    daysRemaining,
    isExpired: daysRemaining < 0 && !isAchieved,
    progressRatio,
  };
};

// ── Streak tracking (Phase 8.0) ────────────────────────────────────
//
// Streak = consecutive UTC days the user took at least one mock.
// Computed entirely from mocks' `submittedAtIso` — no separate
// persistence needed.
//
// Two passes:
//   1. Collapse mocks to a Set of unique UTC-day keys ("YYYY-MM-DD").
//   2. Walk backwards from today (or yesterday if the user hasn't
//      mocked today) extending the current streak as long as each
//      previous day is in the set.
// `longestStreak` falls out of a second linear pass over the sorted
// day set.

// Returns the UTC-midnight YYYY-MM-DD key for an ISO timestamp.
// Used so we can dedupe multiple mocks within the same calendar
// day. UTC (not local) means a user travelling between timezones
// won't get a sneaky extra day from a flight crossing midnight.
const dayKey = (iso: string): string | null => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-');
};

// Returns the calendar offset (in days) between two YYYY-MM-DD
// keys. Always uses UTC midnight to avoid DST edge cases. Returns
// positive when `a` is later than `b`.
const dayDiff = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((aMs - bMs) / (24 * 60 * 60 * 1000));
};

export const computeStreakSummary = (
  mocks: PastMock[],
  nowIso: string = new Date().toISOString(),
): StreakSummary => {
  // Collect unique day-keys. Set ensures dedup; we still need an
  // array sorted oldest-first for the longest-streak scan.
  const daySet = new Set<string>();
  for (const m of mocks) {
    if (!m.submittedAtIso) continue;
    const k = dayKey(m.submittedAtIso);
    if (k) daySet.add(k);
  }

  if (daySet.size === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      daysSinceLastMock: null,
      needsTodayToExtend: false,
    };
  }

  const todayKey = dayKey(nowIso);
  if (!todayKey) {
    // Defensive — if `now` is unparseable we can't reason about
    // "today" vs the data, so return zeros for the time-relative
    // fields. Longest-streak is still computable from the data.
    const sortedDefensive = Array.from(daySet).sort();
    return {
      currentStreak: 0,
      longestStreak: computeLongestStreakFromSortedKeys(sortedDefensive),
      daysSinceLastMock: null,
      needsTodayToExtend: false,
    };
  }

  const sortedAsc = Array.from(daySet).sort();
  const mostRecentKey = sortedAsc[sortedAsc.length - 1];
  const daysSinceLastMock = dayDiff(todayKey, mostRecentKey);

  // Walk backwards from the most recent mock day, extending the
  // current streak as long as each next-older day is exactly one
  // day earlier. Stop at the first gap.
  //
  // The "anchor" for the walk is the most recent day. We only
  // count it toward the current streak if it's TODAY or YESTERDAY
  // — anything older means the streak is broken (0).
  let currentStreak = 0;
  if (daysSinceLastMock === 0 || daysSinceLastMock === 1) {
    currentStreak = 1;
    for (let i = sortedAsc.length - 2; i >= 0; i--) {
      const gap = dayDiff(sortedAsc[i + 1], sortedAsc[i]);
      if (gap === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak: computeLongestStreakFromSortedKeys(sortedAsc),
    daysSinceLastMock,
    needsTodayToExtend: currentStreak >= 1 && daysSinceLastMock === 1,
  };
};

// Helper — finds the longest run of consecutive UTC days in a
// sorted ascending day-key array. Linear time; returns 0 for an
// empty array.
const computeLongestStreakFromSortedKeys = (
  sortedKeys: ReadonlyArray<string>,
): number => {
  if (sortedKeys.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedKeys.length; i++) {
    const gap = dayDiff(sortedKeys[i], sortedKeys[i - 1]);
    if (gap === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else if (gap > 1) {
      current = 1;
    }
    // gap === 0 (duplicate day) shouldn't happen since input is a
    // Set, but if it did we'd just skip incrementing — leaving
    // current intact.
  }
  return longest;
};
