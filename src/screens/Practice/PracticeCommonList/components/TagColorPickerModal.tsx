import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { TAG_COLOR_HEX, TAG_PICKER_OPTIONS } from '../constants';
import { styles } from '../styles';
import type { QuestionItem, TagColor } from '../types';

interface TagColorPickerModalProps {
  pickerItem: QuestionItem | null;
  pickerCurrentColor: TagColor;
  taggingId: string | number | null;
  onClose: () => void;
  onSelect: (item: QuestionItem, color: TagColor) => void;
}

// Bottom-sheet style picker that lets the user assign or remove the
// per-question colour tag. Lives next to the row tag-icon visually so
// keeping its rendering pure / memoized is important to avoid ghosting
// while transitioning between questions.
export const TagColorPickerModal: React.FC<TagColorPickerModalProps> = React.memo(
  ({ pickerItem, pickerCurrentColor, taggingId, onClose, onSelect }) => {
    return (
      <Modal
        visible={pickerItem !== null}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.tagPickerOverlay}>
            <TouchableWithoutFeedback onPress={() => { /* swallow taps */ }}>
              <View style={styles.tagPickerCard}>
                <Text style={styles.tagPickerTitle} numberOfLines={2}>
                  {pickerItem?.title ?? 'Choose tag colour'}
                </Text>
                {TAG_PICKER_OPTIONS.map((opt, idx, arr) => {
                  const selected = pickerCurrentColor === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.tagPickerItem,
                        idx === arr.length - 1 && styles.tagPickerItemLast,
                        selected && styles.tagPickerItemActive,
                      ]}
                      onPress={() =>
                        pickerItem && onSelect(pickerItem, opt.key)
                      }
                      disabled={!pickerItem || taggingId === pickerItem?.id}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.tagPickerDot,
                          { backgroundColor: TAG_COLOR_HEX[opt.key] },
                        ]}
                      />
                      <Text
                        style={[
                          styles.tagPickerItemText,
                          selected && styles.tagPickerItemTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {selected && <Text style={styles.tagPickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                {pickerCurrentColor !== 'none' && (
                  <TouchableOpacity
                    style={styles.tagPickerRemoveItem}
                    onPress={() => pickerItem && onSelect(pickerItem, 'none')}
                    disabled={!pickerItem || taggingId === pickerItem?.id}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagPickerRemoveText}>Remove tag</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);
TagColorPickerModal.displayName = 'TagColorPickerModal';
