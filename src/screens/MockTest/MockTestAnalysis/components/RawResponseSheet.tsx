import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

interface Props {
  payload: unknown;
  onClose: () => void;
}

// Same role as the equivalent component on the MockTestResult screen
// — a developer-only inspector for the raw API payload, accessible
// via a long-press on the header title. Kept as a separate file (vs
// shared) so each result-family screen owns its own debug surface
// and can iterate its styling independently.
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
          The analysis screen normalizes this payload. If a field is missing
          or mis-rendered, share this dump and the normalizer can be tightened.
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
