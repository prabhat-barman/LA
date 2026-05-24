import React from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { CheckIcon } from '../../../../components/atoms/Icon';
import { colors } from '../../../../theme/colors';
import { scale } from '../scale';
import { styles } from '../styles';
import type { ApiSubcategory } from '../types';

interface SubcategoryDropdownModalProps {
  visible: boolean;
  subcategories: ApiSubcategory[];
  activeCategoryId: number;
  isCore: boolean;
  onClose: () => void;
  onSelect: (sub: ApiSubcategory) => void;
}

// Modal-based selector for switching between sibling subcategories
// inside the same parent (e.g. "Read Aloud" → "Repeat Sentence" within
// Speaking). Uses ScrollView (not FlatList) because the list is bounded
// at <50 items and lives inside a transparent modal where virtualization
// hurts more than it helps.
export const SubcategoryDropdownModal: React.FC<
  SubcategoryDropdownModalProps
> = React.memo(
  ({ visible, subcategories, activeCategoryId, isCore, onClose, onSelect }) => {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Subcategory</Text>
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {subcategories.map(sub => {
                  const displayName = isCore
                    ? sub.pte_core_title ?? sub.title
                    : sub.title;
                  const isSelected = sub.id === activeCategoryId;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() => onSelect(sub)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {displayName}
                      </Text>
                      {isSelected && (
                        <CheckIcon
                          size={scale(16)}
                          color={colors.primary}
                          strokeWidth={3}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);
SubcategoryDropdownModal.displayName = 'SubcategoryDropdownModal';
