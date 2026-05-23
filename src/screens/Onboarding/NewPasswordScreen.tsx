import React, { useState } from 'react';
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
import { validateConfirmPassword } from '../../utils/validation';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

// Common Components
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import AuthCapsuleButton from '../../components/atoms/Button/AuthCapsuleButton';
import { SubHeader } from '../../components/molecules/SubHeader';
import PasswordChecklist from '../../components/molecules/PasswordChecklist';

// Icons
import LockIcon from '../../assets/images/lock.svg';
import EyeIcon from '../../assets/images/eye.svg';
import EyeOffIcon from '../../assets/images/eye-off.svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const NewPasswordScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewPassword'>>();
  const email = route.params?.email || '';
  const flow = route.params?.flow;
  const otp = route.params?.otp;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const handleNext = async () => {
    const passwordCheck = validateConfirmPassword(password, confirmPassword);
    if (!passwordCheck.isValid) {
      showToast(passwordCheck.error || 'Password mismatch', 'error');
      return;
    }

    if (flow === 'forgotPassword') {
      // Reset password via API
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('password_confirmation', confirmPassword);
        await apiClient.post(API_ENDPOINTS.RESET_FORGOTPASSWORD, formData);

        showToast('Password updated successfully!', 'success');
        setTimeout(() => {
          navigation.navigate('SignIn');
        }, 800);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to reset password. Please try again.';
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    } else if (flow === 'changePassword') {
      if (!otp) {
        showToast('Verification code missing. Please request a new one.', 'error');
        return;
      }
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('otp', otp);
        formData.append('password', password);
        formData.append('password_confirmation', confirmPassword);
        await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, formData);

        showToast('Password updated successfully!', 'success');
        setTimeout(() => {
          // Pop back to Profile, which is already in the stack
          navigation.navigate('Profile');
        }, 800);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to update password. Please try again.';
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // SignUp flow — navigate to OTP verification
      navigation.navigate('OTP', { email });
    }
  };

  // In-app render for the Change Password flow (user is already logged in,
  // so don't show the sign-in style hero/gradient).
  if (flow === 'changePassword') {
    return (
      <View style={inAppStyles.container}>
        <SubHeader title="New Password" onBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={inAppStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={inAppStyles.title}>Create new password</Text>
          <Text style={inAppStyles.description}>
            Set a strong password to keep your account secure.
          </Text>

          <View style={inAppStyles.inputGroup}>
            <Text style={inAppStyles.inputLabel}>New Password</Text>
            <View style={inAppStyles.inputWrapper}>
              <View style={inAppStyles.iconContainer}>
                <LockIcon width={scale(18)} height={scale(18)} />
              </View>
              <TextInput
                style={inAppStyles.input}
                placeholder="Enter new password"
                placeholderTextColor="#8E8E93"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={inAppStyles.eyeContainer}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOffIcon width={scale(18)} height={scale(18)} />
                ) : (
                  <EyeIcon width={scale(18)} height={scale(18)} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={inAppStyles.inputGroup}>
            <Text style={inAppStyles.inputLabel}>Confirm Password</Text>
            <View style={inAppStyles.inputWrapper}>
              <View style={inAppStyles.iconContainer}>
                <LockIcon width={scale(18)} height={scale(18)} />
              </View>
              <TextInput
                style={inAppStyles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#8E8E93"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={inAppStyles.eyeContainer}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOffIcon width={scale(18)} height={scale(18)} />
                ) : (
                  <EyeIcon width={scale(18)} height={scale(18)} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <PasswordChecklist
            password={password}
            confirmPassword={confirmPassword}
            variant="light"
          />

          <TouchableOpacity
            style={[inAppStyles.primaryBtn, loading && inAppStyles.primaryBtnDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={inAppStyles.primaryBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <AuthTemplate type="newpassword" onBackPress={() => navigation.goBack()}>
      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Create new{"\n"}password</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>
          Set a strong password to keep secure your account.
        </Text>

        {/* Form Section */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <LockIcon width={scale(20)} height={scale(20)} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Password"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeContainer}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOffIcon width={scale(20)} height={scale(20)} />
              ) : (
                <EyeIcon width={scale(20)} height={scale(20)} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <LockIcon width={scale(20)} height={scale(20)} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirm Your Password"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeContainer}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOffIcon width={scale(20)} height={scale(20)} />
              ) : (
                <EyeIcon width={scale(20)} height={scale(20)} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <PasswordChecklist
          password={password}
          confirmPassword={confirmPassword}
          variant="light"
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <AuthCapsuleButton
            title={
              flow === 'forgotPassword'
                ? 'Reset Password'
                : flow === 'changePassword'
                  ? 'Update Password'
                  : 'Next'
            }
            onPress={handleNext}
          />
        )}
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
    paddingHorizontal: scale(20),
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
    height: scale(55),
    paddingHorizontal: scale(15),
    marginBottom: scale(15),
  },
  iconContainer: {
    marginRight: scale(10),
  },
  input: {
    ...theme.typography.medium,
    flex: 1,
    height: '100%',
    fontSize: scale(16),
    color: colors.text,
  },
  eyeContainer: {
    padding: scale(5),
  },
  loadingContainer: {
    height: scale(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

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
  inputGroup: {
    marginBottom: scale(16),
  },
  inputLabel: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
    marginLeft: scale(4),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
    height: scale(48),
    paddingHorizontal: scale(12),
  },
  iconContainer: {
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
    padding: 0,
  },
  eyeContainer: {
    padding: scale(4),
  },
  primaryBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(8),
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

export default NewPasswordScreen;
