import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { KEYBOARD_CHECK_INSTRUCTIONS } from '../constants';
import { styles } from '../styles';

export interface KeyboardCheckSlideProps {
  // This slide has no hard gating step — the user proves their
  // keyboard works by typing anything. We flip ready on mount and
  // never flip it off, matching the reference project's behavior
  // (keyboard check is purely informational, not blocking).
  onReadyChange: (ready: boolean) => void;
}

const KeyboardCheckSlide: React.FC<KeyboardCheckSlideProps> = ({
  onReadyChange,
}) => {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    onReadyChange(true);
  }, [onReadyChange]);

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.slideTitle}>Keyboard Check</Text>
      <Text style={styles.slideDescription}>
        Confirm the on-screen keyboard works the way you expect before the
        test begins. You will use it for typing answers in the Writing and
        Listening sections.
      </Text>

      <View style={styles.tipBox}>
        {KEYBOARD_CHECK_INSTRUCTIONS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.keyboardInputLabel}>Try typing here</Text>
      <TextInput
        style={styles.keyboardInput}
        value={draft}
        onChangeText={setDraft}
        multiline
        placeholder="e.g. The quick brown fox jumps over the lazy dog."
        placeholderTextColor="#9CA3AF"
        accessibilityLabel="Keyboard practice input"
      />
    </ScrollView>
  );
};

export default KeyboardCheckSlide;
