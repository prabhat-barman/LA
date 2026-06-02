import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const SCREEN_WIDTH = screenWidth;

// Exported numerics so the screen layer can add safe-area insets on
// top of the base padding without dipping into the typed StyleSheet
// object (which yields `number | undefined`).
export const HEADER_PADDING_TOP = scale(16);
export const FOOTER_PADDING_BOTTOM = scale(20);

// Mock test prerequisite shell. Mirrors the runner's visual language
// (dark blue header, white CTA bar, off-white scroll body) so the
// jump from prereq → runner feels like one continuous flow rather
// than two unrelated screens.
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: scale(12),
    backgroundColor: '#0D112B',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: scale(17),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#C7D2FE',
    fontSize: scale(11),
    marginTop: scale(4),
    fontFamily: 'BricolageGrotesque-Medium',
  },

  // ── Carousel ──────────────────────────────────────────────────────
  carousel: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
  },
  slideContent: {
    paddingBottom: scale(40),
  },
  slideTitle: {
    color: '#0D112B',
    fontSize: scale(22),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },
  slideDescription: {
    color: '#4B5563',
    fontSize: scale(14),
    lineHeight: scale(20),
    marginBottom: scale(16),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // Quoted prompt card — used by the personal-introduction slide to
  // display the verbatim PTE prompt the candidate should read aloud.
  // Distinct from `tipBox` so the visual hierarchy reads "READ THIS"
  // ahead of the procedural steps that follow.
  promptCard: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: scale(4),
    borderLeftColor: '#1A2151',
    borderRadius: scale(8),
    padding: scale(14),
    marginVertical: scale(12),
  },
  promptLabel: {
    color: '#1A2151',
    fontSize: scale(11),
    letterSpacing: scale(0.6),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(6),
    textTransform: 'uppercase',
  },
  promptText: {
    color: '#0D112B',
    fontSize: scale(14),
    lineHeight: scale(22),
    fontFamily: 'BricolageGrotesque-Regular',
    fontStyle: 'italic',
  },

  // Reusable tip / instruction block used by every slide.
  tipBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(14),
    marginVertical: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipText: {
    color: '#374151',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Microphone check step list ────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  stepNumber: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#1A2151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
    marginTop: scale(2),
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: '#374151',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Verification badge ────────────────────────────────────────────
  // Small chip near the bottom of the slide that flips green when the
  // user has satisfied the slide's "ready" condition — gives an
  // affordance for "you can now continue" beyond just enabling Next.
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    backgroundColor: '#F3F4F6',
    marginTop: scale(12),
    gap: scale(6),
  },
  readyBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  readyBadgeDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#9CA3AF',
  },
  readyBadgeDotActive: {
    backgroundColor: '#059669',
  },
  readyBadgeText: {
    color: '#6B7280',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  readyBadgeTextActive: {
    color: '#065F46',
  },

  // ── Keyboard check slide ──────────────────────────────────────────
  keyboardInputLabel: {
    color: '#0D112B',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginTop: scale(8),
    marginBottom: scale(6),
  },
  keyboardInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: scale(12),
    fontSize: scale(14),
    color: '#0D112B',
    minHeight: scale(96),
    textAlignVertical: 'top',
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Test introduction slide ───────────────────────────────────────
  // Reuses tipBox + stepRow visual but ships its own numeric step
  // styling to differentiate from the mic instructions (smaller dot,
  // tighter spacing — purely informational, not a checklist).
  introTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(10),
  },
  introTipDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#1A2151',
    marginRight: scale(10),
    marginTop: scale(7),
  },
  introTipText: {
    flex: 1,
    color: '#374151',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Speaking instructions slide ───────────────────────────────────
  speakingHeading: {
    color: '#0D112B',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginTop: scale(12),
    marginBottom: scale(6),
  },
  speakingParagraph: {
    color: '#374151',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Welcome table slide ───────────────────────────────────────────
  welcomeTable: {
    borderRadius: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: scale(12),
  },
  welcomeRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(12),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  welcomeRowLast: {
    borderBottomWidth: 0,
  },
  welcomeRowHeader: {
    backgroundColor: '#F3F4F6',
  },
  welcomeCellPart: {
    width: scale(56),
    color: '#374151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  welcomeCellContent: {
    flex: 1,
    color: '#374151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  welcomeCellTime: {
    width: scale(72),
    color: '#0D112B',
    fontSize: scale(13),
    textAlign: 'right',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  welcomeHeaderCell: {
    color: '#6B7280',
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Module intro slide ────────────────────────────────────────────
  introMetaBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: scale(10),
  },
  introMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  introMetaLabel: {
    color: '#6B7280',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  introMetaValue: {
    color: '#0D112B',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  introBreakdownTitle: {
    color: '#0D112B',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  introBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(6),
  },
  introBreakdownBullet: {
    color: '#1A2151',
    fontSize: scale(14),
    marginRight: scale(8),
    lineHeight: scale(20),
  },
  introBreakdownText: {
    flex: 1,
    color: '#374151',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  introFooter: {
    color: '#6B7280',
    fontSize: scale(12),
    fontStyle: 'italic',
    marginTop: scale(16),
    fontFamily: 'BricolageGrotesque-Regular',
  },

  // ── Pagination dots ───────────────────────────────────────────────
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(12),
    gap: scale(6),
    backgroundColor: '#F8F9FC',
  },
  paginationDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#D1D5DB',
  },
  paginationDotActive: {
    width: scale(24),
    backgroundColor: '#1A2151',
  },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: FOOTER_PADDING_BOTTOM,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: scale(12),
  },
  backBtn: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#374151',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#1A2151',
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  primaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Body for loading / error states ───────────────────────────────
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  placeholder: {
    marginTop: scale(16),
    fontSize: scale(13),
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  errorText: {
    fontSize: scale(14),
    color: '#991B1B',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Medium',
  },
});
