import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { CloseIcon, InfoOutlineIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
}

// Explainer modal that pops over the AI Predicted Score section.
// Lifted out of the parent screen so the modal logic + JSX live next to
// the rest of the screen-level overlays instead of inflating the
// orchestration component.
export const InfoModal: React.FC<InfoModalProps> = React.memo(({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Calculation Methodology</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CloseIcon size={scale(20)} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.infoIconWrapper}>
              <InfoOutlineIcon size={scale(24)} />
            </View>
            <Text style={styles.modalText}>
              Your AI Predicted Score is calculated based on your performance in the last 5 mock tests
              and target practice metrics, comparing them directly against actual PTE exam standards.
            </Text>
          </View>

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});
InfoModal.displayName = 'InfoModal';
