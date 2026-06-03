import { Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Exported as numbers so the screen layer can add safe-area insets on
// top (`paddingTop: HEADER_PADDING_TOP + insets.top`) without having
// to dig into the typed StyleSheet object — which makes the resulting
// value implicitly `number | undefined`.
export const HEADER_PADDING_TOP = scale(16);
export const FOOTER_PADDING_BOTTOM = scale(20);

// Phase 1.1.a — runner shell with a header (title + timer pill), a
// scrollable content area for the current question card, and error /
// loading branches. Per-kind question UI lands in Phase 1.1.b and will
// drop straight into `questionCard` without re-shuffling the container.
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
  headerTextCol: {
    flex: 1,
    paddingRight: scale(12),
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  headerMeta: {
    color: '#C7D2FE',
    fontSize: scale(11),
    marginTop: scale(4),
    fontFamily: 'BricolageGrotesque-Medium',
  },

  // ── Timer pill ────────────────────────────────────────────────────
  timerPill: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    backgroundColor: '#1E293B',
    minWidth: scale(72),
    alignItems: 'center',
  },
  timerPillWarn: {
    backgroundColor: '#B45309',
  },
  timerPillExpired: {
    backgroundColor: '#B91C1C',
  },
  timerPillText: {
    color: '#FFFFFF',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Body / loading + error states ─────────────────────────────────
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
  spinner: {
    marginTop: scale(8),
  },
  errorText: {
    fontSize: scale(14),
    color: '#991B1B',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: scale(20),
    gap: scale(12),
  },
  primaryBtn: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    backgroundColor: '#1A2151',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#1A2151',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: '#1A2151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Scroll body / question card ───────────────────────────────────
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(40),
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: '#0D112B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  kindPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    backgroundColor: '#EEF2FF',
    color: '#1A2151',
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(12),
    overflow: 'hidden',
  },
  questionTitle: {
    color: '#0D112B',
    fontSize: scale(16),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },
  questionPrompt: {
    color: '#374151',
    fontSize: scale(14),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },
  questionParagraph: {
    color: '#4B5563',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },

  // ── Speaking question ─────────────────────────────────────────────
  speakingContainer: {
    gap: scale(12),
  },
  speakingImage: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(8),
    backgroundColor: '#F3F4F6',
  },

  // ── MCQ wrapper ───────────────────────────────────────────────────
  mcqWrapper: {
    gap: scale(8),
  },

  // ── Writing question ──────────────────────────────────────────────
  writingContainer: {
    gap: scale(12),
  },
  writingParagraphBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: scale(8),
    padding: scale(12),
    borderLeftWidth: scale(3),
    borderLeftColor: '#1A2151',
  },
  writingParagraphText: {
    color: '#1F2937',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  writingHelperText: {
    color: '#6B7280',
    fontSize: scale(12),
    fontStyle: 'italic',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  writingInput: {
    minHeight: scale(160),
    maxHeight: scale(320),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(20),
  },
  writingCounter: {
    alignSelf: 'flex-end',
    fontSize: scale(12),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  writingCounterOver: {
    color: '#B91C1C',
  },
  writingCounterUnder: {
    color: '#B45309',
  },

  // ── Reorder question ──────────────────────────────────────────────
  reorderContainer: {
    gap: scale(10),
  },
  reorderHelper: {
    color: '#6B7280',
    fontSize: scale(12),
    fontStyle: 'italic',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(4),
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    padding: scale(12),
    gap: scale(10),
  },
  reorderIndexPill: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#1A2151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderIndexText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  reorderText: {
    flex: 1,
    color: '#1F2937',
    fontSize: scale(13),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  reorderArrowCol: {
    flexDirection: 'column',
    gap: scale(4),
  },
  reorderArrowBtn: {
    width: scale(28),
    height: scale(24),
    borderRadius: scale(6),
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  reorderArrowText: {
    color: '#1A2151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  reorderArrowTextDisabled: {
    color: '#9CA3AF',
  },

  // ── Highlight question ────────────────────────────────────────────
  highlightContainer: {
    gap: scale(12),
  },
  highlightHelper: {
    color: '#6B7280',
    fontSize: scale(12),
    fontStyle: 'italic',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  highlightWordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // RN supports row/column gap on flex containers since 0.71 — used
    // here so the word grid breathes without per-word margin maths.
    rowGap: scale(8),
    columnGap: scale(6),
    padding: scale(12),
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  highlightWord: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    backgroundColor: 'transparent',
  },
  highlightWordSelected: {
    backgroundColor: '#FEF3C7',
  },
  highlightWordText: {
    color: '#1F2937',
    fontSize: scale(14),
    lineHeight: scale(20),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  highlightWordTextSelected: {
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  highlightCounter: {
    color: '#374151',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
  },

  // ── Fill-in-the-blank (shared) ────────────────────────────────────
  fibContainer: {
    gap: scale(12),
  },
  fibHelper: {
    color: '#6B7280',
    fontSize: scale(12),
    fontStyle: 'italic',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  // Flex-wrapped row that interleaves passage text spans with the
  // per-blank dropdown buttons / text inputs. `alignItems: 'baseline'`
  // keeps the inline controls visually aligned with the surrounding
  // text so the eye doesn't jump between rows.
  fibFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    backgroundColor: '#F9FAFB',
    padding: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fibText: {
    color: '#1F2937',
    fontSize: scale(14),
    lineHeight: scale(22),
    fontFamily: 'BricolageGrotesque-Regular',
  },
  fibCounter: {
    color: '#374151',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
  },

  // ── FIB dropdown blank ────────────────────────────────────────────
  fibDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: scale(80),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    marginHorizontal: scale(2),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  fibDropdownActive: {
    borderColor: '#1A2151',
    backgroundColor: '#EEF2FF',
  },
  fibDropdownText: {
    color: '#1F2937',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
    marginRight: scale(6),
  },
  fibDropdownPlaceholder: {
    color: '#9CA3AF',
  },
  fibDropdownArrow: {
    color: '#6B7280',
    fontSize: scale(10),
  },

  // ── FIB option picker modal ───────────────────────────────────────
  fibModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 43, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  fibModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(14),
    paddingVertical: scale(18),
    paddingHorizontal: scale(20),
    width: '100%',
    maxWidth: scale(340),
    maxHeight: '60%',
  },
  fibModalTitle: {
    color: '#0D112B',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(12),
  },
  fibModalOption: {
    paddingVertical: scale(14),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fibModalOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  fibModalOptionText: {
    color: '#1F2937',
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
  },
  fibModalOptionTextSelected: {
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  fibModalCancel: {
    marginTop: scale(12),
    paddingVertical: scale(12),
    borderRadius: scale(8),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  fibModalCancelText: {
    color: '#374151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── FIB bank (sub 11): tap-to-select word chips + tap-to-fill blanks ─
  // Inline blank slot the user taps after picking a bank word. Two
  // visual states: "ready to receive" (a chip is selected in the
  // bank, blank pulses to invite a tap) and "filled" (shows the
  // chosen word, tap clears or replaces depending on whether another
  // bank chip is currently selected).
  fibBankBlank: {
    minWidth: scale(72),
    minHeight: scale(28),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    marginHorizontal: scale(2),
    borderRadius: scale(6),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fibBankBlankReady: {
    // Selected-chip-in-bank state: blank advertises "drop here".
    borderColor: '#1A2151',
    borderStyle: 'solid',
    backgroundColor: '#EEF2FF',
  },
  fibBankBlankFilled: {
    // Has a word — solid border so it visually settles into the
    // surrounding text instead of vibrating like an open slot.
    borderColor: '#1A2151',
    borderStyle: 'solid',
    backgroundColor: '#FFFFFF',
  },
  fibBankBlankText: {
    fontSize: scale(13),
    color: '#1F2937',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  fibBankBlankPlaceholder: {
    color: '#9CA3AF',
  },
  // Word-chip rail under the passage. Wraps so long banks stack
  // gracefully and never push the passage off-screen.
  fibBankRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    padding: scale(10),
    borderRadius: scale(10),
    backgroundColor: '#F3F4F6',
  },
  fibBankChip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  fibBankChipSelected: {
    borderColor: '#1A2151',
    backgroundColor: '#EEF2FF',
  },
  fibBankChipUsed: {
    // Greyed out — chip is currently occupying a blank. Still
    // tappable so the user can re-select to drop it elsewhere.
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
    opacity: 0.55,
  },
  fibBankChipText: {
    fontSize: scale(13),
    color: '#1F2937',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  fibBankChipTextSelected: {
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── FIB text input blank ──────────────────────────────────────────
  fibInputWrapper: {
    minWidth: scale(96),
    marginHorizontal: scale(2),
  },
  fibInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A2151',
    paddingHorizontal: scale(4),
    paddingVertical: scale(2),
    fontSize: scale(14),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Medium',
    minWidth: scale(80),
    textAlign: 'center',
  },

  // ── Unsupported question placeholder ──────────────────────────────
  unsupportedCard: {
    padding: scale(20),
    backgroundColor: '#FEF3C7',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  unsupportedTitle: {
    color: '#92400E',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: FOOTER_PADDING_BOTTOM,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerPrimaryBtn: {
    backgroundColor: '#1A2151',
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
    // Always claim remaining row width — whether the primary CTA is
    // alone (Submit Test on last question) or sitting next to the
    // compact Save & Exit secondary button. Without this the row's
    // `alignItems: 'center'` makes the button shrink to text width.
    flex: 1,
  },
  footerPrimaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  footerPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  // Row that puts Save & Exit (secondary) and Next/Submit (primary)
  // side by side. Primary takes the bulk of the width via `flex: 1`
  // so the dominant CTA is still obvious; secondary stays compact
  // and label-only so it doesn't compete visually.
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  footerSecondaryBtn: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  footerSecondaryBtnDisabled: {
    opacity: 0.5,
  },
  footerSecondaryBtnText: {
    color: '#374151',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Submission retry overlay ──────────────────────────────────────
  // Shown when finalizeAndExit (or handleSaveExit) finishes with a
  // partial-failure FlushResult. Sits above the runner and blocks
  // interaction until the user either retries or exits. Same z-index
  // family as the section-break / submitting overlays — only one
  // is mounted at a time because the runner can't be in two of these
  // states simultaneously.
  retryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 17, 43, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  retryCard: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'stretch',
  },
  retryEyebrow: {
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: '#DC2626',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(6),
  },
  retryTitle: {
    fontSize: scale(20),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  retrySubtitle: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginBottom: scale(16),
    lineHeight: scale(20),
  },
  // Soft-bordered chip strip — preview of which questions failed.
  // Capped at first N items by the component; surfacing every one
  // would push the overlay off-screen on small devices.
  retryFailedList: {
    backgroundColor: '#FEF2F2',
    borderRadius: scale(8),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    marginBottom: scale(20),
  },
  retryFailedListLabel: {
    fontSize: scale(11),
    color: '#991B1B',
    letterSpacing: scale(0.6),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  retryFailedListItem: {
    fontSize: scale(13),
    color: '#7F1D1D',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },
  retryActionsRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  retryExitBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  retryExitBtnText: {
    color: '#374151',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  retryRetryBtn: {
    flex: 1.4,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    backgroundColor: '#1A2151',
  },
  retryRetryBtnText: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  retryRetryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },

  // ── Section break overlay ─────────────────────────────────────────
  // Full-bleed overlay that interrupts the runner between sections of
  // a Full Mock. Same z-index family as the submitting overlay; only
  // one can be visible at a time because the runner state machine
  // doesn't allow finalization mid-section-break.
  sectionBreakOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 17, 43, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  sectionBreakCard: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'stretch',
  },
  sectionBreakEyebrow: {
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: '#22C55E',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(6),
  },
  sectionBreakTitle: {
    fontSize: scale(20),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  sectionBreakSubtitle: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(20),
  },
  // Numbered "next section" details panel. Uses a left accent bar
  // (same pattern as the prereq promptCard) to anchor the eye.
  sectionBreakDetails: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: scale(4),
    borderLeftColor: '#1A2151',
    borderRadius: scale(8),
    padding: scale(14),
    marginBottom: scale(20),
  },
  sectionBreakDetailLabel: {
    fontSize: scale(11),
    color: '#1A2151',
    letterSpacing: scale(0.6),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  sectionBreakDetailValue: {
    fontSize: scale(18),
    color: '#0D112B',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(8),
  },
  sectionBreakDetailMeta: {
    fontSize: scale(13),
    color: '#374151',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  sectionBreakContinueBtn: {
    backgroundColor: '#1A2151',
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  sectionBreakContinueBtnText: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Countdown variant (Phase 3.1 — optional break before Listening) ─
  // A pale-blue panel that visually separates the timer block from the
  // descriptive copy above. Big monospace-ish digits + uppercase label
  // matches the runner's own timer pill so users get the same "this is
  // the clock you should care about" affordance.
  sectionBreakCountdownWrap: {
    backgroundColor: '#EEF2FF',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    marginBottom: scale(20),
  },
  sectionBreakCountdownLabel: {
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: '#4338CA',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  sectionBreakCountdownValue: {
    fontSize: scale(32),
    lineHeight: scale(38),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    // tabular-nums style approximation — keeps digits from jittering
    // as the countdown ticks down. iOS supports it natively; Android
    // gracefully ignores the variant (no harm done).
    fontVariant: ['tabular-nums'],
  },

  // ── Cross-restart recovery banner (Phase 2.2) ────────────────────
  // Inline strip between the header and the question scroller. Amber
  // palette so it reads as "attention required" without being as
  // aggressive as a red error. Compact two-column layout: copy on
  // the left, two CTAs stacked-or-rowed on the right depending on
  // available width.
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  recoveryBannerText: {
    flex: 1,
    minWidth: 0,
    marginRight: scale(12),
  },
  recoveryBannerTitle: {
    fontSize: scale(13),
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    marginBottom: scale(2),
  },
  recoveryBannerSubtitle: {
    fontSize: scale(11),
    color: '#78350F',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(15),
  },
  recoveryBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoveryBannerDismissBtn: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    marginRight: scale(6),
  },
  recoveryBannerDismissText: {
    fontSize: scale(12),
    color: '#92400E',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  recoveryBannerRetryBtn: {
    backgroundColor: '#D97706',
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
  },
  recoveryBannerRetryBtnDisabled: {
    opacity: 0.55,
  },
  recoveryBannerRetryText: {
    fontSize: scale(12),
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // ── Submitting overlay ────────────────────────────────────────────
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 17, 43, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  submittingCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: scale(24),
    paddingHorizontal: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    gap: scale(12),
    minWidth: scale(200),
  },
  submittingTitle: {
    color: '#0D112B',
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  submittingMeta: {
    color: '#6B7280',
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
  },
});
