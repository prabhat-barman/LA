import { StyleSheet, Dimensions } from 'react-native';

import { colors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
export const scale = (size: number) => (screenWidth / 375) * size;

export const styles = StyleSheet.create({
  // ── Layout shell ────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(32),
  },

  // ── Title row (matches the SubHeader's look-and-feel) ───────────────────
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(10),
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  titleText: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  titleBadge: {
    backgroundColor: '#0D112B',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(14),
  },
  titleBadgeText: {
    color: colors.white,
    fontSize: scale(10),
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.2,
  },

  // ── Tabs ────────────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
  },
  tab: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#0D112B',
  },
  tabText: {
    fontSize: scale(13),
    color: '#6E6E73',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque-Bold',
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  cardTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginRight: scale(10),
  },
  attemptBadge: {
    backgroundColor: '#7F56D9',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  attemptBadgeText: {
    color: colors.white,
    fontSize: scale(11),
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque-Bold',
  },

  // ── Progress bar ────────────────────────────────────────────────────────
  progressTrack: {
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: scale(10),
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(4),
  },

  // ── Accuracy row ────────────────────────────────────────────────────────
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  accuracyLabel: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  accuracyValue: {
    fontSize: scale(13),
    color: '#1FA8E0',
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  accuracyValueMissing: {
    fontSize: scale(13),
    color: '#C7C7CC',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  targetLabel: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
  },
  emptySubtitle: {
    fontSize: scale(12),
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: scale(40),
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },

  // ── Loading state ───────────────────────────────────────────────────────
  loadingContainer: {
    paddingVertical: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(10),
    marginBottom: scale(6),
  },
  skillLoadingText: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Error state ─────────────────────────────────────────────────────────
  errorContainer: {
    paddingVertical: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
  },
  errorSubtitle: {
    fontSize: scale(12),
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: scale(40),
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(16),
  },
  retryButton: {
    backgroundColor: '#0D112B',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
  },
  retryButtonText: {
    color: colors.white,
    fontSize: scale(13),
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
