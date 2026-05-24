import React, { memo } from 'react';
import { Modal, TouchableOpacity, View, Text, FlatList } from 'react-native';
import { styles } from '../styles';
import Data from '../../../../config/practiceData';

interface ScoreItem {
  value: string;
  pte_overall: string;
  label: string;
}

interface ScoreModalProps {
  visible: boolean;
  selectedScore: string;
  onSelect: (score: string) => void;
  onClose: () => void;
}

const ScoreModalComponent: React.FC<ScoreModalProps> = ({
  visible,
  selectedScore,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Desired Score (Bands)</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={Data.selectDesiredScoreWhole as ScoreItem[]}
            keyExtractor={(item: ScoreItem) => item.value}
            renderItem={({ item }: { item: ScoreItem }) => {
              const isSelected =
                item.pte_overall === selectedScore ||
                item.value === selectedScore;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && styles.selectedModalItem,
                  ]}
                  onPress={() => onSelect(item.pte_overall)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.selectedModalItemText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const ScoreModal = memo(ScoreModalComponent);
