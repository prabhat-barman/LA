import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

interface Props {
  payload: unknown;
  onClose: () => void;
}

// Developer-debug overlay surfaced via a long-press on the header
// title. Renders the raw API payload as pretty-printed JSON so we can
// iterate the normalizer when the real backend response shape differs
// from our defensive guesses. NOT user-facing — intentionally
// undiscoverable for end users (no visible affordance), only useful
// when triaging an unfamiliar response shape in dev.
export const RawResponseSheet: React.FC<Props> = ({ payload, onClose }) => {
  const json = (() => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  })();

  return (
    <View
      style={styles.debugOverlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>Raw API response</Text>
        <Text style={styles.debugSubtitle}>
          The result screen normalizes this payload. If a field is missing or
          mis-rendered, share this dump and the normalizer can be tightened.
        </Text>
        <ScrollView style={styles.debugBody} horizontal={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <Text style={styles.debugText} selectable>
              {json}
            </Text>
          </ScrollView>
        </ScrollView>
        <TouchableOpacity
          style={styles.debugCloseBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close raw response inspector"
        >
          <Text style={styles.debugCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RawResponseSheet;
