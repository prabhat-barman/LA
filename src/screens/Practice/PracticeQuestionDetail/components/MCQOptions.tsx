import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { isOptionCorrect, sortMcqOptions } from '../helpers';
import { scale } from '../scale';
import { styles } from '../styles';
import type { MCQOption } from '../types';

interface Props {
  questionPrompt: string;
  options: MCQOption[] | undefined;
  selectedIds: Set<string>;
  onToggle: (optionId: string) => void;
  // When `true` the card switches to read-only feedback mode: each
  // option is annotated as correct / incorrect / missed and tapping is
  // disabled. We don't unmount because the user expects the selections
  // to remain visible alongside the feedback.
  showFeedback: boolean;
  // True for cat 9/15 (multi-answer). Drives whether ticking a second
  // option replaces or augments the current selection, and whether each
  // option uses a square checkbox vs a round radio.
  isMultiple: boolean;
}

// SVG checkmark used in the filled checkbox/radio. Drawn rather than a
// font glyph so the stroke weight stays consistent with the rest of the
// PracticeQuestionDetail iconography (which is all custom SVG).
const CheckGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12.5l4.2 4.2L19 7"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Card-style multi-choice options list shown for Reading / Listening MCQ
// categories. Matches the bordered green card in the design — see the
// "Scientific Derivations" reference screen.
//
// Selection model: single-answer (cat 8 / 14) keeps exactly one id in
// `selectedIds`; multi-answer (cat 9 / 15) toggles ids in/out. This
// component is purely presentational — the parent owns state and the
// reducer logic (`onToggle` callback handles the actual toggle).
export const MCQOptions: React.FC<Props> = ({
  questionPrompt,
  options,
  selectedIds,
  onToggle,
  showFeedback,
  isMultiple,
}) => {
  const sorted = sortMcqOptions(options);

  const handlePress = useCallback(
    (optionId: string) => {
      if (showFeedback) return;
      onToggle(optionId);
    },
    [onToggle, showFeedback],
  );

  if (sorted.length === 0) {
    return (
      <View style={styles.mcqEmptyState}>
        <Text style={styles.mcqEmptyText}>No options available for this question.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mcqCard}>
      {!!questionPrompt && (
        <Text style={styles.mcqPromptText}>{questionPrompt}</Text>
      )}

      <View style={styles.mcqOptionsList}>
        {sorted.map(opt => {
          const id = String(opt.id);
          const isSelected = selectedIds.has(id);
          const isCorrect = isOptionCorrect(opt.correct);
          // After submission three feedback states are possible:
          //   1. correct + selected   -> green tick (right answer)
          //   2. selected + wrong     -> red strike (user picked badly)
          //   3. correct + not picked -> green outline (revealed answer)
          // Everything else stays neutral.
          let feedbackVariant: 'correct' | 'wrong' | 'missed' | null = null;
          if (showFeedback) {
            if (isSelected && isCorrect) feedbackVariant = 'correct';
            else if (isSelected && !isCorrect) feedbackVariant = 'wrong';
            else if (!isSelected && isCorrect) feedbackVariant = 'missed';
          }

          return (
            <MCQOptionRow
              key={id}
              text={opt.options}
              selected={isSelected}
              isMultiple={isMultiple}
              feedbackVariant={feedbackVariant}
              disabled={showFeedback}
              onPress={() => handlePress(id)}
            />
          );
        })}
      </View>
    </View>
  );
};

interface RowProps {
  text: string;
  selected: boolean;
  isMultiple: boolean;
  feedbackVariant: 'correct' | 'wrong' | 'missed' | null;
  disabled: boolean;
  onPress: () => void;
}

const MCQOptionRow: React.FC<RowProps> = React.memo(
  ({ text, selected, isMultiple, feedbackVariant, disabled, onPress }) => {
    // Container colouring is driven by feedbackVariant (post-submit) and
    // falls back to the selection state pre-submit.
    const containerStyles = [
      styles.mcqOptionRow,
      selected && !feedbackVariant && styles.mcqOptionRowSelected,
      feedbackVariant === 'correct' && styles.mcqOptionRowCorrect,
      feedbackVariant === 'wrong' && styles.mcqOptionRowWrong,
      feedbackVariant === 'missed' && styles.mcqOptionRowMissed,
    ];

    // Indicator (checkbox/radio) is filled when selected, outlined when
    // missed (post-submit reveal), and otherwise empty.
    const indicatorFilled = selected || feedbackVariant === 'missed';
    const indicatorColor =
      feedbackVariant === 'correct' || feedbackVariant === 'missed'
        ? '#34C759'
        : feedbackVariant === 'wrong'
        ? '#FF3B30'
        : selected
        ? '#34C759'
        : '#C7C7CC';

    const indicatorStyles = [
      isMultiple ? styles.mcqCheckbox : styles.mcqRadio,
      indicatorFilled && {
        backgroundColor: indicatorColor,
        borderColor: indicatorColor,
      },
      !indicatorFilled && { borderColor: indicatorColor },
    ];

    return (
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        onPress={onPress}
        disabled={disabled}
        style={containerStyles}
        accessibilityRole={isMultiple ? 'checkbox' : 'radio'}
        accessibilityState={{ checked: selected, disabled }}
      >
        <View style={indicatorStyles}>
          {indicatorFilled && <CheckGlyph size={scale(12)} color="#FFFFFF" />}
        </View>
        <Text style={styles.mcqOptionText}>{text}</Text>
      </TouchableOpacity>
    );
  },
);
MCQOptionRow.displayName = 'MCQOptionRow';
