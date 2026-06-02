// Progress dashboard derived state. All fields are computed locally
// from `usePastMocks` data — no extra backend round-trips for v1.
// Adding per-section averages or enabling-skill trends would require
// a bulk MOCK_SCORE fetch (or a new server endpoint); deferred to a
// later phase.

import type { PastMock, PteScore } from '../MockTestResult/types';
import type { MockTestVariant, MockSection } from '../MockTestRunner/types';

// Phase 6.1 — Per-section trend data.
//
// Same shape as `ProgressStats` but scoped to one section. Computed
// from `PastMock.sectionScores[section]` for the filtered dataset.
// `null` fields when there's no graded section data — the UI then
// shows a "waiting for grading" placeholder for that section's card.
export interface SectionStats {
  section: MockSection;
  // Number of past mocks that contributed a score for this section.
  // Different from `ProgressStats.gradedCount` — extensive Speaking
  // mocks only count toward Speaking, not Writing/Reading/Listening.
  gradedCount: number;
  averageScore: PteScore;
  bestScore: PteScore;
  latestScore: PteScore;
  // Latest score minus previous score for THIS section. Null when
  // fewer than 2 graded scores exist.
  trendDeltaVsPrevious: number | null;
  // Ordered chronologically (oldest-first), ready for the chart.
  // Each entry carries the source mock for tap-to-drill-in.
  scoreSeries: Array<{ score: number; mock: PastMock }>;
}

// Identifies the section the user is weakest at (lowest average).
// Surfaced as a focus-area callout on the Progress dashboard so the
// dashboard becomes actionable ("study Writing") rather than just
// retrospective ("here's what you scored").
//
// `null` when there isn't enough data to make a meaningful call —
// e.g. user has only taken Speaking-only mocks so the other three
// sections have no signal. Avoiding a "go study Reading" callout
// when we've never seen the user read anything.
export interface WeakestSkillResult {
  section: MockSection;
  averageScore: number;
  // Gap to the user's best section's average. Used as the headline
  // "Focus area — you're scoring 12 points below your strongest
  // section" so the callout has a self-explanatory motivator.
  gapToStrongest: number;
}

export interface ProgressStats {
  // Total number of graded past mocks (mocks with `overall != null`).
  // Pending mocks are excluded from every stat below — they would
  // tank the average and clutter the trend chart with a "null spike".
  gradedCount: number;
  // Total number of past mocks (graded + pending). Surfaced as a
  // headline "X mocks completed" so the user gets credit for taking
  // the test even before grading lands.
  totalCount: number;
  // Average overall score across `gradedCount` mocks. Null when
  // `gradedCount === 0`.
  averageOverall: PteScore;
  // Highest single overall score observed. Null when `gradedCount === 0`.
  bestOverall: PteScore;
  // Most recent graded overall score. Null when `gradedCount === 0`.
  latestOverall: PteScore;
  // Delta between latest and previous graded mock. Positive = improved.
  // Null when there's fewer than 2 graded mocks (no comparison
  // possible) — the UI then hides the trend arrow.
  trendDeltaVsPrevious: number | null;
}

export interface ProgressFilter {
  // Restrict the dataset by variant. `null` = all variants.
  variant: MockTestVariant | null;
  // Restrict by category. `null` = all categories.
  category: MockSection | 'Full Mock' | null;
}

// One point in the trend chart. `meta` carries the original PastMock
// so a tap on the dot can drill straight into MockTestResult.
export interface TrendPoint {
  // Pixel x position in the chart's coordinate space.
  x: number;
  // Pixel y position in the chart's coordinate space (TOP-anchored;
  // larger y = lower on screen). The chart helper inverts the PTE
  // band so higher scores render at the top.
  y: number;
  // The PTE score this point represents. Always non-null — we
  // pre-filter pending mocks before building the chart.
  score: number;
  // Original past-mock record (for tap → drill-in routing).
  mock: PastMock;
}

// ── Goal tracking (Phase 6.2) ──────────────────────────────────────
//
// A single, user-set target: "I want to hit `targetScore` overall by
// `targetDateIso`." Only one active goal at a time — replacing the
// goal is a destructive operation (no goal history is kept in v1).
// Persisted to AsyncStorage via `goalPersistence` so it survives
// app restarts without needing a backend round-trip.
//
// `createdAtIso` lets us compute "you set this goal X weeks ago",
// useful both for UI ("3 weeks in, 5 weeks left") and for any future
// progress-velocity analysis (delta per week since goal-set).
export interface MockTestGoal {
  // Target PTE overall band (10–90). Stored as a number; UI uses
  // preset chips (50/58/65/70/79) but the model stays open so a
  // future "custom score" stepper just works.
  targetScore: number;
  // ISO date string for the user's target completion date. Stored as
  // ISO so we don't lose timezone context when round-tripping JSON.
  targetDateIso: string;
  // ISO timestamp when the goal was created. Set on insert, NOT
  // refreshed on edit — editing a goal preserves the original
  // timeline so "weeks in" stays honest.
  createdAtIso: string;
}

// Derived "where are you relative to your goal" snapshot, computed
// from the active goal + the current progress stats. All fields are
// pure functions of those inputs — recomputed on every render is
// cheap.
//
// `null` for the whole struct when no goal exists; otherwise the
// fields are always populated (with sensible defaults for edge cases
// like "goal set but no graded mocks yet").
export interface GoalProgress {
  goal: MockTestGoal;
  // Current best signal of where the user is, used for the progress
  // bar's numerator. We use `latestOverall` (not average) because:
  //   • Goal-tracking is forward-looking — the most recent score is
  //     the most honest answer to "how close am I?"
  //   • Using avg lags behind real improvement and can demotivate
  //     a user who just had a breakthrough test.
  // Null when no graded mocks exist yet.
  currentScore: number | null;
  // `targetScore - currentScore`, clamped at 0. Null when no graded
  // mocks (the UI shows "take a mock to track progress" instead).
  pointsToGoal: number | null;
  // True when `currentScore >= targetScore`. Drives the celebration
  // state on the card.
  isAchieved: boolean;
  // Days from today to `targetDateIso`. Negative = past deadline.
  // Computed using local-midnight comparison so "2 days left" doesn't
  // flip to "1 day left" because of a few-hour difference.
  daysRemaining: number;
  // True when `daysRemaining < 0 && !isAchieved`. Drives the
  // "deadline passed" state.
  isExpired: boolean;
  // 0..1 progress ratio for the card's progress bar. Computed as
  // `currentScore / targetScore`, clamped to [0, 1]. Null when no
  // current score is available.
  progressRatio: number | null;
}

// ── Streak tracking (Phase 8.0) ────────────────────────────────────
//
// "Streak" = consecutive calendar days the user took at least one
// mock test. Same mental model as Duolingo / Apple Activity rings —
// the daily-cadence-or-bust framing motivates regular practice
// without requiring goal-setting.
//
// Rules:
//   • Multiple mocks on the same UTC day count as one day for the
//     streak (we don't reward grind-then-rest patterns).
//   • The current streak stays "alive" as long as the user has a
//     mock from TODAY or YESTERDAY. Two-day gap → broken.
//     The yesterday-grace window prevents an unfair break for
//     someone studying late at night across a midnight rollover.
//   • Days are computed in UTC to avoid timezone drift confusing
//     the counter when the user travels or DST flips.
export interface StreakSummary {
  // Length of the user's current active streak in days. 0 when
  // the most recent mock is older than yesterday OR no mocks
  // exist. The UI shows different copy for 0 vs ≥1.
  currentStreak: number;
  // Best streak ever achieved. Persists even when the current
  // streak is broken — gives users a "next milestone" target to
  // beat after a lapse.
  longestStreak: number;
  // Days since the most recent mock. Null when no mocks exist.
  // Used to surface "X days since your last mock — keep going!"
  // copy that's actionable independent of streak state.
  daysSinceLastMock: number | null;
  // True when the current streak is still alive AND would extend
  // if the user takes a mock today. Used to render "Take a mock
  // today to keep your streak" prompts.
  // - True when daysSinceLastMock === 1 (yesterday) AND
  //   currentStreak >= 1.
  // - False when the user already mocked today (streak is safe).
  // - False when the streak is broken (currentStreak === 0).
  needsTodayToExtend: boolean;
}

export interface TrendGeometry {
  // SVG path `d` attribute for the polyline connecting every point.
  // Empty string when fewer than 2 points (the chart instead renders
  // a single dot or an empty state).
  linePath: string;
  // Per-point coordinates. Length matches the input score count.
  points: TrendPoint[];
  // Horizontal grid lines for the chart background. PTE band
  // markers — typically 30/50/70/90.
  yGridLines: Array<{ y: number; label: string; score: number }>;
}
