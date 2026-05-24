import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { PracticeMode } from '../types';

interface Props {
  selectedMode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

export const ModeSwitcher: React.FC<Props> = ({ selectedMode, onChange }) => (
  <View style={styles.modeSwitcherContainer}>
    <TouchableOpacity
      style={[
        styles.modeSwitcherTab,
        selectedMode === 'Normal' && styles.modeSwitcherTabActive,
      ]}
      onPress={() => onChange('Normal')}
    >
      <Text
        style={[
          styles.modeSwitcherText,
          selectedMode === 'Normal' && styles.modeSwitcherTextActive,
        ]}
      >
        Normal
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.modeSwitcherTab,
        selectedMode === 'One Line Strategy' && styles.modeSwitcherTabActive,
      ]}
      onPress={() => onChange('One Line Strategy')}
    >
      <Text
        style={[
          styles.modeSwitcherText,
          selectedMode === 'One Line Strategy' && styles.modeSwitcherTextActive,
        ]}
      >
        One Line Strategy
      </Text>
    </TouchableOpacity>
  </View>
);
