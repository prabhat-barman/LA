import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { theme } from '../../theme';
import { validateEmail } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

// Common Components
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import AuthCapsuleButton from '../../components/atoms/Button/AuthCapsuleButton';

// Icons
import MailIcon from '../../assets/images/mail.svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSendCode = async () => {
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      showToast(emailCheck.error || 'Invalid email', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      await apiClient.post(API_ENDPOINTS.FORGOTPASSWORD, formData);

      showToast('Reset code sent successfully!', 'success');
      setTimeout(() => {
        navigation.navigate('OTP', { email, flow: 'forgotPassword' });
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send reset code. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate type="forgotpassword" onBackPress={() => navigation.goBack()}>
      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Forgot{"\n"}password</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>
          Enter your email address to receive a verification code to reset your password.
        </Text>

        {/* Input */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <MailIcon width={scale(20)} height={scale(20)} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Email"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <AuthCapsuleButton title="Send Code" onPress={handleSendCode} />
          )}
        </View>
      </View>
    </AuthTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  titleSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  titleText: {
    ...theme.typography.extraBold,
    fontSize: scale(32),
    lineHeight: scale(40),
    color: colors.primary,
    textAlign: 'center',
  },
  descriptionText: {
    ...theme.typography.regular,
    fontSize: scale(14),
    lineHeight: scale(22),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: scale(30),
    paddingHorizontal: scale(10),
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: scale(30),
    borderWidth: 1,
    borderColor: colors.border,
    height: scale(48),
    paddingHorizontal: scale(15),
    marginBottom: scale(20),
  },
  iconContainer: {
    marginRight: scale(10),
  },
  input: {
    ...theme.typography.medium,
    flex: 1,
    height: '100%',
    fontSize: scale(16),
    color: colors.primary,
    padding: 0,
  },
  loadingContainer: {
    height: scale(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ForgotPasswordScreen;
