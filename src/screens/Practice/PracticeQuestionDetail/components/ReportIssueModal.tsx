import React from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CloseIcon } from '../../../../components/atoms/Icon';
import { REPORT_REASONS } from '../constants';
import { RedWarningIcon } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  selectedReason: string | null;
  setSelectedReason: (reason: string) => void;
  additionalDetails: string;
  setAdditionalDetails: (text: string) => void;
}

export const ReportIssueModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  selectedReason,
  setSelectedReason,
  additionalDetails,
  setAdditionalDetails,
}) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.reportModalContent}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderTitleBlock}>
              <View style={styles.reportHeaderIconContainer}>
                <RedWarningIcon size={scale(16)} color="#FF3B30" />
              </View>
              <View>
                <Text style={styles.modalTitleText}>Report Issue</Text>
                <Text style={styles.modalSubtitleText}>Help us improve the content</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseIconBtn} onPress={onClose}>
              <CloseIcon size={scale(18)} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.reportSectionHeading}>Select reason for reporting</Text>

            <View style={styles.reasonsPillContainer}>
              {REPORT_REASONS.map(reason => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonPill, isSelected && styles.reasonPillActive]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonPillText,
                        isSelected && styles.reasonPillTextActive,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.reportSectionHeading}>Additional details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              multiline
              numberOfLines={4}
              placeholder="Tell us more about the issue...."
              placeholderTextColor="#8E8E93"
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitReportBtn,
                (!selectedReason || submitting) && styles.submitReportBtnDisabled,
              ]}
              onPress={onSubmit}
              disabled={!selectedReason || submitting}
            >
              <Text style={styles.submitReportBtnText}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
