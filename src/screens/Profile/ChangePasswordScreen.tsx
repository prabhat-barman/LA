import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { user } = useUser();

  const [sending, setSending] = useState(false);

  const email = user?.email || '';

  const handleSendCode = async () => {
    if (sending) return;
    if (!email) {
      showToast('No email found on your account.', 'error');
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('type', 'change_password');
      formData.append('email', email);
      await apiClient.post(API_ENDPOINTS.REQUEST_OTP, formData);

      showToast('Verification code sent to your email!', 'success');
      navigation.navigate('OTP', { email, flow: 'changePassword' });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send code. Please try again.';
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <SubHeader title="Change Password" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Verify it's you</Text>
          <Text style={styles.description}>
            We'll send a 6-digit verification code to your registered email
            address. Use it to set a new password.
          </Text>

          {email ? (
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSendCode}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendBtnText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: scale(20),
  },
  formContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(24),
  },
  title: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(8),
  },
  description: {
    fontSize: scale(13),
    lineHeight: scale(20),
    color: '#5A6172',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(24),
  },
  emailRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    marginBottom: scale(24),
  },
  emailLabel: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  emailValue: {
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  sendBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
});
