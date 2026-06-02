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
