import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Verdict pill palette. Matches the section bar colors from the
// result screen (greens/reds), so the user sees consistent visual
// language across both surfaces.
export const VERDICT_COLORS = {
  correct: { bg: '#DCFCE7', text: '#15803D' },
  partial: { bg: '#FEF3C7', text: '#92400E' },
  incorrect: { bg: '#FEE2E2', text: '#B91C1C' },
  pending: { bg: '#E5E7EB', text: '#374151' },
} as const;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // ── Header (reused shape from MockTestResult) ─────────────────────
  header: {
    backgroundColor: '#1A2151',
    paddingHorizontal: scale(20),
    paddingBottom: scale(16),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scale(8),
    paddingBottom: scale(8),
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

  // ── Center state (loading / error / empty) ────────────────────────
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

  // ── List body ─────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(32),
  },

  // ── Section group header ──────────────────────────────────────────
  // Sticky-style section divider between Speaking → Writing → Reading
  // → Listening groups. Renders a small count badge so the user can
  // see the section's scope at a glance.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(4),
    paddingTop: scale(12),
    paddingBottom: scale(8),
  },
  sectionHeaderName: {
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    letterSpacing: scale(0.4),
    textTransform: 'uppercase',
  },
  sectionHeaderCount: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Question card ─────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    marginBottom: scale(10),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  // "Q1 · Read Aloud" — concise enough to fit on a small device.
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
    marginRight: scale(8),
  },
  cardQuestionNumber: {
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginRight: scale(6),
  },
  cardTypeLabel: {
    fontSize: scale(13),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  verdictPill: {
    paddingVertical: scale(3),
    paddingHorizontal: scale(10),
    borderRadius: scale(999),
  },
  verdictPillText: {
    fontSize: scale(11),
    letterSpacing: scale(0.4),
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  cardScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: scale(8),
  },
  cardScoreValue: {
    fontSize: scale(20),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  cardScoreMax: {
    fontSize: scale(13),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
    marginLeft: scale(4),
  },
  cardScorePending: {
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: scale(13),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
    marginBottom: scale(8),
  },

  // ── Answer block (user / correct) ─────────────────────────────────
  answerBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    marginTop: scale(6),
  },
  answerLabel: {
    fontSize: scale(10),
    color: '#6B7280',
    letterSpacing: scale(0.6),
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  answerText: {
    fontSize: scale(13),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },
  // Accent for the "Correct answer" row (green left border) so the
  // contrast against the user's answer is clear at a glance.
  answerBlockCorrect: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: scale(3),
    borderLeftColor: '#22C55E',
  },
  // ── Component score rows ──────────────────────────────────────────
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(4),
  },
  componentName: {
    fontSize: scale(12),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Regular',
    flexShrink: 1,
    marginRight: scale(8),
  },
  componentScore: {
    fontSize: scale(12),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  componentScorePending: {
    color: '#9CA3AF',
  },
  componentsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: scale(8),
  },
  componentsLabel: {
    fontSize: scale(10),
    color: '#6B7280',
    letterSpacing: scale(0.6),
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },

  // ── Debug overlay (raw response) ─────────────────────────────────
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
