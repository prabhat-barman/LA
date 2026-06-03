import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Score bar colors keyed against the PTE band rubric. Same gradient
// idea as the official PTE results page — green at the top, red at
// the bottom. Used by both the overall score arc and per-section bars.
export const SCORE_COLORS = {
  expert: '#22C55E',   // 79-90
  veryGood: '#3B82F6', // 65-78
  good: '#0EA5E9',     // 50-64
  modest: '#F59E0B',   // 36-49
  limited: '#EF4444',  // 10-35
  pending: '#9CA3AF',  // null
} as const;

export const scoreColorForBand = (score: number | null): string => {
  if (score == null) return SCORE_COLORS.pending;
  if (score >= 79) return SCORE_COLORS.expert;
  if (score >= 65) return SCORE_COLORS.veryGood;
  if (score >= 50) return SCORE_COLORS.good;
  if (score >= 36) return SCORE_COLORS.modest;
  return SCORE_COLORS.limited;
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { paddingBottom: scale(32) },

  // ── Header ────────────────────────────────────────────────────────
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
  // Subtle subtitle row under the title — variant + category + ID.
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scale(12),
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Loading / error states ────────────────────────────────────────
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
  centerStateBtn: {
    marginTop: scale(20),
    backgroundColor: '#1A2151',
    paddingVertical: scale(12),
    paddingHorizontal: scale(28),
    borderRadius: scale(10),
  },
  centerStateBtnText: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Overall score card ────────────────────────────────────────────
  overallCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginTop: scale(-32),
    borderRadius: scale(16),
    paddingVertical: scale(24),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  overallLabel: {
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: '#6B7280',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(12),
  },
  // Big score number — proportional to screen width so it stays
  // legible on small devices without dwarfing the rest of the card.
  overallScoreValue: {
    fontSize: scale(64),
    lineHeight: scale(72),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  overallScoreMax: {
    fontSize: scale(20),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  overallBandPill: {
    marginTop: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(999),
  },
  overallBandPillText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    letterSpacing: scale(0.4),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  overallMeta: {
    marginTop: scale(16),
    fontSize: scale(12),
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── CommunicationScoreCard (top hero card) ────────────────────────
  // Mirrors legacy CommunicationScoreCard.js — avatar + name +
  // subtitle on the left, purple scorcard.png ImageBackground pill
  // on the right with the numeric score + label baked over it.
  // The pill bleeds past the card's right edge by ~20px (negative
  // marginRight on the pill) — that overhang is part of the legacy
  // visual language. We replicate it here with the same trick.
  commCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: scale(12),
    borderBottomLeftRadius: scale(12),
    borderBottomRightRadius: scale(12),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    overflow: 'visible',
  },
  commLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#E5E7EB',
  },
  commAvatarFallback: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#1A2151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commAvatarFallbackText: {
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    fontSize: scale(20),
  },
  commTextBlock: {
    marginLeft: scale(12),
    flex: 1,
  },
  commName: {
    fontSize: scale(16),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  commSubtitle: {
    marginTop: scale(2),
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  commScorePill: {
    width: scale(120),
    height: scale(56),
    marginRight: scale(-20), // intentional overhang (legacy parity)
    alignItems: 'center',
    justifyContent: 'center',
  },
  commScorePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(8),
  },
  commScoreValue: {
    fontSize: scale(20),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginRight: scale(6),
  },
  commScoreLabel: {
    flexShrink: 1,
    fontSize: scale(10),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: '600',
  },

  // ── Performance Result circles card (legacy parity) ──────────────
  // 2x2 (or 1xN sectional) grid of skill ring gauges. Card wrapper
  // mirrors the legacy Card1 shadow style; per-skill tile is the
  // smaller white-bordered card the legacy SkillCard renders.
  perfCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  perfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  perfTitle: {
    fontSize: scale(15),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  perfSkillCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingVertical: scale(16),
    marginBottom: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  perfCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfCenterValue: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfValueText: {
    fontSize: scale(16),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  perfLabel: {
    marginTop: scale(8),
    fontSize: scale(13),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: '600',
  },

  // ── SkillBreakdownCard (horizontal bars view) ────────────────────
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  breakdownTitle: {
    fontSize: scale(15),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  breakdownBars: {
    marginTop: scale(12),
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(6),
  },
  breakdownRowLabel: {
    width: scale(70),
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  // Tiny axis ornaments the legacy bar view paints to anchor the
  // bar visually to its label — small dash + vertical line before
  // the colored bar starts.
  breakdownAxisDash: {
    width: scale(12),
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  breakdownAxisLine: {
    width: 1,
    height: scale(36),
    backgroundColor: '#D1D5DB',
  },
  breakdownBar: {
    height: scale(22),
    borderTopRightRadius: scale(4),
    borderBottomRightRadius: scale(4),
  },
  breakdownRowValue: {
    marginLeft: scale(8),
    fontSize: scale(12),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── CandidateCenterDetails (info cards + upgrade CTA) ────────────
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  detailsCardTitle: {
    fontSize: scale(15),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: scale(4),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: scale(13),
    color: '#111827',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: scale(12),
    flexShrink: 1,
  },
  upgradeCard: {
    backgroundColor: '#0B1D39',
    borderRadius: scale(16),
    paddingVertical: scale(20),
    paddingHorizontal: scale(20),
    marginHorizontal: scale(16),
    marginTop: scale(16),
  },
  upgradeTitle: {
    fontSize: scale(18),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(6),
  },
  upgradeSubtitle: {
    fontSize: scale(13),
    color: '#CBD5E1',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: scale(18),
  },

  // ── Section block (shared) ────────────────────────────────────────
  section: {
    marginTop: scale(24),
    marginHorizontal: scale(16),
  },
  sectionHeading: {
    fontSize: scale(15),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(12),
  },

  // ── Per-section score row ─────────────────────────────────────────
  sectionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
  },
  sectionRowTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  sectionRowName: {
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  sectionRowScore: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  sectionRowScoreMax: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  sectionRowScorePending: {
    color: '#9CA3AF',
  },
  // Progress bar track — fixed height, soft background. The fill
  // width is computed inline per row from the score / 90.
  sectionBarTrack: {
    height: scale(6),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  sectionBarFill: {
    height: '100%',
    borderRadius: scale(3),
  },

  // ── Enabling skills grid ──────────────────────────────────────────
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: scale(-5),
  },
  skillTile: {
    width: '50%',
    paddingHorizontal: scale(5),
    marginBottom: scale(10),
  },
  skillTileInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
  },
  skillTileName: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(4),
  },
  skillTileScore: {
    fontSize: scale(22),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  skillTileBand: {
    fontSize: scale(11),
    marginTop: scale(2),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Question Breakdown CTA ────────────────────────────────────────
  // Secondary CTA that opens the MockTestAnalysis drill-in. Styled
  // as an outlined button so it reads as discovery rather than the
  // terminal Done action below it. Tappable area spans the full
  // width to match the visual rhythm of the cards above.
  breakdownBtn: {
    marginTop: scale(24),
    marginHorizontal: scale(16),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A2151',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownBtnText: {
    color: '#1A2151',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  breakdownBtnArrow: {
    color: '#1A2151',
    fontSize: scale(20),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Done CTA ──────────────────────────────────────────────────────
  doneBtn: {
    marginTop: scale(12),
    marginHorizontal: scale(16),
    backgroundColor: '#1A2151',
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Raw response debug sheet ──────────────────────────────────────
  // Triggered via long-press on the header title. Mirrors the
  // section-break / retry overlays in z-index family — sits above the
  // ScrollView but is dismissable.
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 17, 43, 0.92)',
    paddingHorizontal: scale(16),
    paddingVertical: scale(24),
  },
  debugCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
  },
  debugTitle: {
    fontSize: scale(15),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },
  debugSubtitle: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },
  debugBody: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: scale(8),
    padding: scale(10),
  },
  debugText: {
    fontFamily: 'Courier',
    fontSize: scale(11),
    color: '#374151',
    lineHeight: scale(16),
  },
  debugCloseBtn: {
    marginTop: scale(12),
    backgroundColor: '#1A2151',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  debugCloseBtnText: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
});
