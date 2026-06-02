import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Color scale mirrors MockTestProgress so a "65 green" row reads
// identically across both screens — visual continuity is worth
// more than slight color independence per surface.
export const HISTORY_COLORS = {
  expert: '#22C55E',
  veryGood: '#3B82F6',
  good: '#0EA5E9',
  modest: '#F59E0B',
  limited: '#EF4444',
  pending: '#9CA3AF',
} as const;

export const colorForHistoryScore = (score: number | null): string => {
  if (score == null) return HISTORY_COLORS.pending;
  if (score >= 79) return HISTORY_COLORS.expert;
  if (score >= 65) return HISTORY_COLORS.veryGood;
  if (score >= 50) return HISTORY_COLORS.good;
  if (score >= 36) return HISTORY_COLORS.modest;
  return HISTORY_COLORS.limited;
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  listContent: { paddingBottom: scale(32) },

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

  // ── Filter / sort sticky bar ──────────────────────────────────────
  controlsBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(6),
  },
  controlsLabel: {
    fontSize: scale(10),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    marginRight: scale(6),
    alignSelf: 'center',
  },
  chip: {
    paddingVertical: scale(5),
    paddingHorizontal: scale(10),
    borderRadius: scale(999),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#1A2151',
    borderColor: '#1A2151',
  },
  chipText: {
    fontSize: scale(11),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  chipTextActive: { color: '#FFFFFF' },

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

  // ── List rows ────────────────────────────────────────────────────
  resultCount: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(6),
  },
  row: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: scale(16),
    marginBottom: scale(8),
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowScoreBar: {
    width: scale(4),
    height: scale(40),
    borderRadius: scale(2),
    marginRight: scale(12),
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: scale(13),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  rowMeta: {
    fontSize: scale(11),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  rowScoreCol: { alignItems: 'flex-end', marginLeft: scale(8) },
  rowScore: {
    fontSize: scale(20),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  rowScoreMax: {
    fontSize: scale(11),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  rowScorePending: {
    fontSize: scale(12),
    color: '#9CA3AF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
});
