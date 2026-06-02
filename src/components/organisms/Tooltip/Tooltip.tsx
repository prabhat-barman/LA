import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { hasSeenTour, markTourSeen, type TourKey } from '../../../services/tourStorage';

interface TooltipProps {
  // The tour-step storage key. The tooltip auto-shows on first mount
  // when the key has not yet been marked as seen, and the dismiss
  // CTA marks it seen.
  tourKey: TourKey;
  title: string;
  body: string;
  ctaLabel?: string;
  onDismiss?: () => void;
  // Optional prerequisite tour keys — this tooltip will not appear
  // until ALL of these have been marked as seen. Lets us chain
  // multiple tooltips on the same screen (e.g. "welcome" → "tap a
  // skill card") without stacking modals on top of each other.
  dependsOn?: readonly TourKey[];
}

// Minimal first-time-user tooltip. Stores its "shown once" flag in
// AsyncStorage via the `tourStorage` helper so every tour site can
// declare one with zero state plumbing in the consuming screen.
//
// This is intentionally a centred modal card (no positional
// arrow) — building proper anchored tooltips needs
// `react-native-walkthrough-tooltip` or a layout-measurement dance
// that we'll add in a follow-up. The contract is stable so swapping
// the visual won't change call sites.
export const Tooltip: React.FC<TooltipProps> = ({
  tourKey,
  title,
  body,
  ctaLabel = 'Got it',
  onDismiss,
  dependsOn,
}) => {
  const [visible, setVisible] = useState(false);

  // We re-check every 600ms while the tooltip is gated on a
  // prerequisite — this is the simplest cross-component "did
  // another tooltip get dismissed" signal without wiring a global
  // event bus. Polling stops as soon as we show (or unmount).
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const evaluate = async () => {
      const seen = await hasSeenTour(tourKey);
      if (cancelled || seen) return;
      if (dependsOn && dependsOn.length > 0) {
        const seenFlags = await Promise.all(dependsOn.map(k => hasSeenTour(k)));
        if (seenFlags.some(s => !s)) return; // still waiting
      }
      if (!cancelled) {
        setVisible(true);
        if (interval) clearInterval(interval);
      }
    };

    evaluate();
    if (dependsOn && dependsOn.length > 0) {
      interval = setInterval(evaluate, 600);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [tourKey, dependsOn]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    await markTourSeen(tourKey);
    onDismiss?.();
  }, [tourKey, onDismiss]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default Tooltip;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1F2A',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 20,
    marginBottom: 16,
  },
  cta: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
