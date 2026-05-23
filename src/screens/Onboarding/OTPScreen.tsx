import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useToast } from '../../context/ToastContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { theme } from '../../theme';
import { validateOTP } from '../../utils/validation';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

// Common Components
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import AuthCapsuleButton from '../../components/atoms/Button/AuthCapsuleButton';
import { SubHeader } from '../../components/molecules/SubHeader';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const OTPScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OTP'>>();
  const email = route.params?.email || 'your email';
  const flow = route.params?.flow;
  // Backend issues a 10-digit OTP for change_password, 6 digits for other flows
  const otpLength = flow === 'changePassword' ? 10 : 6;
  const [otp, setOtp] = useState<string[]>(() => Array(otpLength).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  const { showToast } = useToast();

  // Sizing scales down when more boxes are needed so 10 still fit on one row
  const isCompact = otpLength > 6;
  const boxWidth = isCompact ? scale(28) : scale(45);
  const boxHeight = isCompact ? scale(44) : scale(55);
  const boxFontSize = isCompact ? scale(15) : scale(18);
  const boxRadius = isCompact ? scale(20) : scale(25);

  const handleVerify = async () => {
    const otpCheck = validateOTP(otp);
    if (!otpCheck.isValid) {
      showToast(otpCheck.error || 'Invalid OTP', 'error');
      return;
    }

    const otpCode = otp.join('');

    // Change-password flow: no separate verify endpoint — OTP is submitted
    // together with the new password on the next screen.
    if (flow === 'changePassword') {
      navigation.navigate('NewPassword', {
        email,
        flow: 'changePassword',
        otp: otpCode,
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('otp', otpCode);
      await apiClient.post(API_ENDPOINTS.VERIFY_EMAIL_PHONE, formData);

      showToast('OTP verified successfully!', 'success');
      setTimeout(() => {
        if (flow === 'forgotPassword') {
          navigation.navigate('NewPassword', { email, flow: 'forgotPassword' });
        } else {
          navigation.navigate('SignIn');
        }
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid OTP. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      if (flow === 'changePassword') {
        formData.append('type', 'change_password');
      }
      await apiClient.post(API_ENDPOINTS.REQUEST_OTP, formData);
      showToast('OTP resent successfully!', 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to resend OTP.';
      showToast(msg, 'error');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    // Paste support: if the user pastes the whole OTP into one box,
    // distribute the digits across all boxes.
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, otpLength);
      if (digits.length === 0) return;
      const newOtp = Array(otpLength).fill('');
      for (let i = 0; i < digits.length; i++) {
        newOtp[i] = digits[i];
      }
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length, otpLength - 1);
      inputs.current[focusIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value.length !== 0 && index < otpLength - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // In-app render (used when reached from logged-in flows like Change Password).
  // Uses SubHeader + plain View instead of the auth template so it doesn't look
  // like a sign-in screen.
  if (flow === 'changePassword') {
    return (
      <View style={inAppStyles.container}>
        <SubHeader title="Verify Code" onBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={inAppStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={inAppStyles.title}>Enter verification code</Text>
          <Text style={inAppStyles.description}>
            We've sent a {otpLength}-digit code to{'\n'}
            <Text style={inAppStyles.emailHighlight}>{email}</Text>
          </Text>

          <View style={[inAppStyles.otpRow, isCompact && inAppStyles.otpRowCompact]}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  if (ref) inputs.current[index] = ref;
                }}
                style={[
                  inAppStyles.otpInput,
                  {
                    width: boxWidth,
                    height: boxHeight,
                    borderRadius: scale(10),
                    fontSize: boxFontSize,
                  },
                  digit.length > 0 && inAppStyles.otpInputActive,
                ]}
                maxLength={index === 0 ? otpLength : 1}
                keyboardType="number-pad"
                value={digit}
                onChangeText={value => handleOtpChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                textAlign="center"
                editable={!loading}
              />
            ))}
          </View>

          <View style={inAppStyles.resendRow}>
            <Text style={inAppStyles.resendLabel}>Didn't get it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color="#94C23C" />
              ) : (
                <Text style={inAppStyles.resendLink}>Resend Now</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[inAppStyles.primaryBtn, loading && inAppStyles.primaryBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={inAppStyles.primaryBtnText}>Verify</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <AuthTemplate type="otp" onBackPress={() => navigation.goBack()}>
      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>We just sent an{'\n'}Email</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>
          Enter {otpLength}-digit verification code we sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* OTP Inputs */}
        <View style={[styles.otpRow, isCompact && styles.otpRowCompact]}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                if (ref) inputs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                {
                  width: boxWidth,
                  height: boxHeight,
                  borderRadius: boxRadius,
                  fontSize: boxFontSize,
                },
                digit.length > 0 && styles.otpInputActive,
              ]}
              maxLength={index === 0 ? otpLength : 1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              textAlign="center"
              editable={!loading}
            />
          ))}
        </View>

        {/* Resend Section */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't get it? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.resendLink}>Resend Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <AuthCapsuleButton title="Verify" onPress={handleVerify} />
        )}
      </View>
    </AuthTemplate>
  );
};

const inAppStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(24),
    paddingBottom: scale(40),
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
  emailHighlight: {
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(5),
    marginBottom: scale(24),
  },
  otpRowCompact: {
    paddingHorizontal: 0,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#EAECEF',
    backgroundColor: '#FFFFFF',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  otpInputActive: {
    borderColor: '#94C23C',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
  },
  resendLabel: {
    fontSize: scale(13),
    color: '#5A6172',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  resendLink: {
    fontSize: scale(13),
    color: '#94C23C',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  primaryBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  titleSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  titleText: {
    ...theme.typography.extraBold,
    fontSize: scale(32),
    color: colors.primary,
    textAlign: 'center',
    lineHeight: scale(40),
  },
  descriptionText: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(30),
  },
  emailText: {
    ...theme.typography.bold,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(5),
    marginBottom: scale(30),
  },
  otpRowCompact: {
    paddingHorizontal: 0,
  },
  otpInput: {
    ...theme.typography.bold,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
  },
  otpInputActive: {
    borderColor: colors.accent,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  resendLabel: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textSecondary,
  },
  resendLink: {
    ...theme.typography.bold,
    fontSize: scale(14),
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    height: scale(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OTPScreen;
