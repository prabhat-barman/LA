import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TAG_COLOR_HEX, TAG_PICKER_OPTIONS } from '../constants';
import { styles } from '../styles';
import type { TagColor } from '../types';

interface Props {
  open: boolean;
  tagColor: TagColor;
  taggingInProgress: boolean;
  onSelect: (next: TagColor) => void;
  onDismiss: () => void;
}

export const TagPickerDropdown: React.FC<Props> = ({
  open,
  tagColor,
  taggingInProgress,
  onSelect,
  onDismiss,
}) => {
  if (!open) return null;
  return (
    <>
      <TouchableOpacity
        style={styles.tagPickerBackdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />
      <View style={styles.tagPickerDropdown}>
        {TAG_PICKER_OPTIONS.map((opt, idx, arr) => {
          const selected = tagColor === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.tagPickerItem,
                idx === arr.length - 1 && styles.tagPickerItemLast,
                selected && styles.tagPickerItemActive,
              ]}
              onPress={() => onSelect(opt.key)}
              disabled={taggingInProgress}
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

        {tagColor !== 'none' && (
          <TouchableOpacity
            style={styles.tagPickerRemoveItem}
            onPress={() => onSelect('none')}
            disabled={taggingInProgress}
            activeOpacity={0.7}
          >
            <Text style={styles.tagPickerRemoveText}>Remove tag</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};
