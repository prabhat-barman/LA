import React, { memo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
} from 'react-native';
import { scale } from '../scale';
import { styles } from '../styles';

interface EmailChangeModalProps {
  visible: boolean;
  newEmail: string;
  emailOtp: string;
  emailOtpSent: boolean;
  emailOtpLoading: boolean;
  emailUpdateLoading: boolean;
  onChangeNewEmail: (value: string) => void;
  onChangeOtp: (value: string) => void;
  onSendOtp: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

const EmailChangeModalComponent: React.FC<EmailChangeModalProps> = ({
  visible,
  newEmail,
  emailOtp,
  emailOtpSent,
  emailOtpLoading,
  emailUpdateLoading,
  onChangeNewEmail,
  onChangeOtp,
  onSendOtp,
  onConfirm,
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
          <Text style={styles.modalTitle}>Change Email</Text>
          <Text style={styles.modalSubLabel}>New Email Address</Text>
          <TextInput
            style={styles.modalInput}
            value={newEmail}
            onChangeText={onChangeNewEmail}
            placeholder="Enter new email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!emailOtpSent}
          />

          {emailOtpSent ? (
            <>
              <Text
                style={[styles.modalSubLabel, { marginTop: scale(12) }]}
              >
                Enter OTP
              </Text>
              <TextInput
                style={styles.modalInput}
                value={emailOtp}
                onChangeText={onChangeOtp}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  emailUpdateLoading && { opacity: 0.6 },
                ]}
                onPress={onConfirm}
                disabled={emailUpdateLoading}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {emailUpdateLoading ? 'Updating...' : 'Confirm Update'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                emailOtpLoading && { opacity: 0.6 },
              ]}
              onPress={onSendOtp}
              disabled={emailOtpLoading}
            >
              <Text style={styles.modalConfirmBtnText}>
                {emailOtpLoading ? 'Sending...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const EmailChangeModal = memo(EmailChangeModalComponent);
