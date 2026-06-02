import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Inner chart drawable width — used by both the styles and the
// component so the SVG and its container agree on dimensions.
// Subtracts the screen-edge padding (16 * 2) from the screen width.
export const CHART_WIDTH = screenWidth - scale(32) - scale(28); // card paddingX = 14 each side
export const CHART_HEIGHT = scale(180);

// Reused score color rubric. Mirrors MockTestResult/styles so the
// trend chart's "good score" green matches the score band pill on
// the detail screen — single visual language for score quality
// across the whole result family.
export const PROGRESS_COLORS = {
  expert: '#22C55E',
  veryGood: '#3B82F6',
  good: '#0EA5E9',
  modest: '#F59E0B',
  limited: '#EF4444',
  pending: '#9CA3AF',
} as const;

export const colorForScore = (score: number | null): string => {
  if (score == null) return PROGRESS_COLORS.pending;
  if (score >= 79) return PROGRESS_COLORS.expert;
  if (score >= 65) return PROGRESS_COLORS.veryGood;
  if (score >= 50) return PROGRESS_COLORS.good;
  if (score >= 36) return PROGRESS_COLORS.modest;
  return PROGRESS_COLORS.limited;
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { paddingBottom: scale(32) },

  // ── Header (reused dark navy treatment) ───────────────────────────
  header: {
    backgroundColor: '#1A2151',
    paddingHorizontal: scale(20),
    paddingBottom: scale(20),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scale(8),
    paddingBottom: scale(12),
    minHeight: scale(44),
  },
  headerBackBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerBackBtnText: {
    color: '#FFFFFF',
    fontSize: scale(20),
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: scale(15),
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginHorizontal: scale(8),
  },
  headerRightSpacer: { width: scale(36) },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scale(12),
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Empty / loading / error ───────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
  },
  centerStateTitle: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  centerStateSubtitle: {
    fontSize: scale(14),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // ── Empty-but-scrollable hero ────────────────────────────────────
  //
  // Used by the no-mocks branch when we still want to show the goal
  // card below. Lifts into the dark header the same way the stats
  // card does so the dashboard never has a "dead zone" at the top.
  emptyHero: {
    marginHorizontal: scale(16),
    marginTop: scale(-32),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(28),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  emptyHeroTitle: {
    fontSize: scale(16),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(6),
  },
  emptyHeroSubtitle: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: scale(18),
  },

  // ── Filter chips ──────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    gap: scale(8),
  },
  filterChip: {
    paddingVertical: scale(7),
    paddingHorizontal: scale(14),
    borderRadius: scale(999),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1A2151',
    borderColor: '#1A2151',
  },
  filterChipText: {
    fontSize: scale(12),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ── Stats card ────────────────────────────────────────────────────
  // Same negative-margin overlap trick as MockTestResult's overall
  // card so the stats lift into the dark header for visual cohesion.
  statsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(-32),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(20),
    paddingHorizontal: scale(20),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  statsLatestRow: {
    alignItems: 'center',
    marginBottom: scale(12),
  },
  statsLatestLabel: {
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: '#6B7280',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  statsLatestScore: {
    fontSize: scale(48),
    lineHeight: scale(54),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  statsLatestScoreMax: {
    fontSize: scale(18),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  // Trend chip — green-up or red-down arrow + delta. Hidden when
  // there's no previous mock to compare against.
  statsTrendChip: {
    marginTop: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(999),
  },
  statsTrendChipText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginLeft: scale(4),
  },

  // Tertiary stat row — 3 columns of average / best / total.
  statsTertiaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statsTertiaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsTertiaryValue: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  statsTertiaryLabel: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: scale(2),
  },

  // ── Chart card ────────────────────────────────────────────────────
  chartCard: {
    marginHorizontal: scale(16),
    marginTop: scale(20),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(14),
  },
  chartHeading: {
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  chartSubheading: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },
  chartEmpty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
  },

  // ── Recent mocks list ─────────────────────────────────────────────
  recentSection: {
    marginTop: scale(20),
    marginHorizontal: scale(16),
  },
  recentHeading: {
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  recentSeeAll: {
    fontSize: scale(12),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  recentRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    marginBottom: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Vertical accent bar on the left — color-coded to the score band.
  // Gives the list a scannable color column so the user spots their
  // best / worst attempts immediately.
  recentScoreBar: {
    width: scale(4),
    height: scale(36),
    borderRadius: scale(2),
    marginRight: scale(12),
  },
  recentInfo: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: scale(13),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  recentMeta: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  recentScoreCol: {
    alignItems: 'flex-end',
    marginLeft: scale(8),
  },
  recentScore: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  recentScoreMax: {
    fontSize: scale(11),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  recentScorePending: {
    fontSize: scale(12),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Per-section grid (Phase 6.1) ──────────────────────────────────
  //
  // 2×2 grid of mini cards — Speaking / Writing / Reading / Listening.
  // Each card hosts a sparkline + latest score + trend chip. Mirrors
  // the result screen's section card visual language so users see
  // continuity between "test result" and "long-term progress".
  sectionsSection: {
    marginTop: scale(20),
    marginHorizontal: scale(16),
  },
  sectionsHeading: {
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  sectionsSubheading: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Negative margin to compensate for per-card padding so the grid
    // edges align with the parent's marginHorizontal.
    marginHorizontal: -scale(4),
  },
  sectionCard: {
    width: '50%',
    paddingHorizontal: scale(4),
    marginBottom: scale(8),
  },
  sectionCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
  },
  sectionCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(6),
  },
  sectionCardLabel: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
  },
  sectionCardScore: {
    fontSize: scale(24),
    lineHeight: scale(28),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  sectionCardScorePending: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginTop: scale(8),
  },
  sectionCardSparkline: {
    height: scale(40),
    marginTop: scale(6),
  },
  sectionCardTrendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(2),
    paddingHorizontal: scale(6),
    borderRadius: scale(999),
  },
  sectionCardTrendChipText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Weakest skill callout (Phase 6.1) ─────────────────────────────
  //
  // Single-row card with a prominent left bar accenting the focus
  // section's color. Compact — fits between stats card + section
  // grid without dominating the screen.
  weakestCard: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  weakestAccentBar: {
    width: scale(4),
  },
  weakestBody: {
    flex: 1,
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
  },
  weakestEyebrow: {
    fontSize: scale(10),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    marginBottom: scale(4),
  },
  weakestTitle: {
    fontSize: scale(16),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  weakestSubtitle: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(16),
  },
  // CTA button — color comes from the section's accent so the
  // button reads as part of the card's color story (red urgency,
  // green/blue confidence, etc) rather than a generic action.
  // Self-aligned-start so the button width is content-driven and
  // doesn't stretch across the full card.
  weakestCta: {
    alignSelf: 'flex-start',
    marginTop: scale(12),
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
  },
  weakestCtaText: {
    fontSize: scale(12),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Goal card (Phase 6.2) ─────────────────────────────────────────
  //
  // Two visual states share this base card: "no goal" (CTA-only) and
  // "active goal" (target + progress + actions). Same card chrome
  // so the visual continuity reads as "this is your goal slot" no
  // matter which state it's in.
  goalCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
  },
  goalEyebrow: {
    fontSize: scale(10),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    marginBottom: scale(6),
  },
  goalEmptyTitle: {
    fontSize: scale(16),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  goalEmptySubtitle: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(16),
    marginBottom: scale(12),
  },
  goalSetCta: {
    alignSelf: 'flex-start',
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(10),
    backgroundColor: '#1A2151',
  },
  goalSetCtaText: {
    fontSize: scale(13),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // Active goal — header row with target + actions
  goalActiveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  goalActiveHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  goalTarget: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  goalDeadline: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  // 44pt minimum tap target — without bumped padding the Edit hit
  // area was ~28×16, which iOS HIG / Android accessibility flags as
  // too small to comfortably tap. The hitSlop in JSX could solve
  // this too but native padding is more discoverable.
  goalEditBtn: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    marginLeft: scale(4),
    marginTop: -scale(8),
    marginRight: -scale(8),
  },
  goalEditBtnText: {
    fontSize: scale(12),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // Progress bar — track + filled portion, color-coded to current score
  goalProgressBarTrack: {
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginTop: scale(4),
    marginBottom: scale(10),
  },
  goalProgressBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  goalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  goalProgressCurrent: {
    fontSize: scale(28),
    lineHeight: scale(32),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  goalProgressOfTarget: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
    marginLeft: scale(4),
  },
  goalProgressCurrentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  goalProgressMetaCol: {
    alignItems: 'flex-end',
  },
  goalProgressMetaPrimary: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  goalProgressMetaSecondary: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: scale(2),
  },
  goalNoScoreText: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    fontStyle: 'italic',
    marginTop: scale(4),
  },
  goalAchievedBadge: {
    alignSelf: 'flex-start',
    marginTop: scale(10),
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(999),
    backgroundColor: '#DCFCE7',
  },
  goalAchievedBadgeText: {
    fontSize: scale(11),
    color: '#166534',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  goalExpiredBadge: {
    alignSelf: 'flex-start',
    marginTop: scale(10),
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(999),
    backgroundColor: '#FEE2E2',
  },
  goalExpiredBadgeText: {
    fontSize: scale(11),
    color: '#991B1B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Streak card (Phase 8.0) ──────────────────────────────────────
  //
  // Two-tile horizontal card: big "current" number on the left,
  // contextual meta on the right. Tile widths flex 1:1 so the
  // visual weight balances; the current-streak number is sized up
  // (32px) so it reads as the headline at a glance.
  streakCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakLeftTile: {
    flex: 1,
    alignItems: 'flex-start',
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNumber: {
    fontSize: scale(36),
    lineHeight: scale(40),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  streakNumberUnit: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginLeft: scale(4),
  },
  streakLabel: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    marginTop: scale(2),
  },
  // Divider between the two tiles — same color as the card BG
  // border treatment elsewhere on the dashboard.
  streakDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    alignSelf: 'stretch',
    marginHorizontal: scale(14),
  },
  streakRightTile: {
    flex: 1,
    alignItems: 'flex-end',
  },
  streakRightPrimary: {
    fontSize: scale(13),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  streakRightSecondary: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: scale(2),
    textAlign: 'right',
  },
  // Coloured nudge banner under the card body for the
  // "needsTodayToExtend" state. Subtle orange — not alarming, just
  // attention-grabbing enough to read as "act now".
  streakNudge: {
    marginTop: scale(10),
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
  },
  streakNudgeText: {
    fontSize: scale(11),
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Set-goal modal ───────────────────────────────────────────────
  //
  // Overlay + sheet shell. Sheet slides up from the bottom; tap
  // outside dismisses. No third-party modal lib needed — RN's
  // built-in Modal + presentation timing is sufficient for a
  // simple form like this.
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 43, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingTop: scale(12),
    paddingHorizontal: scale(20),
    paddingBottom: scale(24),
  },
  modalGrabber: {
    alignSelf: 'center',
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#E5E7EB',
    marginBottom: scale(12),
  },
  modalTitle: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  modalSubtitle: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginBottom: scale(20),
  },
  modalSectionLabel: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    marginBottom: scale(8),
  },
  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16),
  },
  modalChip: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: scale(64),
    alignItems: 'center',
  },
  modalChipActive: {
    backgroundColor: '#1A2151',
    borderColor: '#1A2151',
  },
  modalChipText: {
    fontSize: scale(13),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
  },
  modalChipSubtext: {
    fontSize: scale(10),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: scale(2),
  },
  modalChipSubtextActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(8),
    gap: scale(12),
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: scale(14),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: '#1A2151',
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalConfirmBtnText: {
    fontSize: scale(14),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  modalClearBtn: {
    marginTop: scale(12),
    paddingVertical: scale(10),
    alignItems: 'center',
  },
  modalClearBtnText: {
    fontSize: scale(13),
    color: '#EF4444',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
});
