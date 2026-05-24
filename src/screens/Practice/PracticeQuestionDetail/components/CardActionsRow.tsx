import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MessageBubbleIcon, TranslateIcon } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';

interface Props {
  hasAudio: boolean;
  showTranscript: boolean;
  showTranslation: boolean;
  showSampleResponse: boolean;
  onToggleTranscript: () => void;
  onToggleTranslation: () => void;
  onToggleSample: () => void;
}

// Three pill-style toggles that expand/collapse the inline expand panels
// below the question card.
export const CardActionsRow: React.FC<Props> = ({
  hasAudio,
  showTranscript,
  showTranslation,
  showSampleResponse,
  onToggleTranscript,
  onToggleTranslation,
  onToggleSample,
}) => (
  <View style={styles.cardActionsRow}>
    {hasAudio && (
      <TouchableOpacity
        style={[styles.outlineBtn, showTranscript && styles.outlineBtnActive]}
        onPress={onToggleTranscript}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[
            styles.outlineBtnText,
            styles.outlineBtnTextSingleLine,
            showTranscript && styles.outlineBtnTextActive,
          ]}
        >
          Transcript
        </Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[
        styles.outlineBtn,
        styles.outlineBtnBlue,
        showTranslation && styles.outlineBtnBlueActive,
      ]}
      onPress={onToggleTranslation}
    >
      <TranslateIcon
        size={scale(14)}
        color={showTranslation ? '#FFFFFF' : '#007AFF'}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[
          styles.outlineBtnText,
          styles.outlineBtnTextSingleLine,
          styles.outlineBtnTextBlue,
          showTranslation && styles.outlineBtnTextActive,
        ]}
      >
        Translate
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.outlineBtn,
        styles.outlineBtnPurple,
        showSampleResponse && styles.outlineBtnPurpleActive,
      ]}
      onPress={onToggleSample}
    >
      <MessageBubbleIcon
        size={scale(14)}
        color={showSampleResponse ? '#FFFFFF' : '#7C3AED'}
      />
      <Text
        numberOfLines={2}
        style={[
          styles.outlineBtnText,
          styles.outlineBtnTextTwoLine,
          styles.outlineBtnTextPurple,
          showSampleResponse && styles.outlineBtnTextActive,
        ]}
      >
        {'Sample\nResponse'}
      </Text>
    </TouchableOpacity>
  </View>
);
