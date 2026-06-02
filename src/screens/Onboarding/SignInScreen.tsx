import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppleIcon } from '../../components/atoms/Icon';
import { colors } from '../../theme/colors';
import { theme } from '../../theme';
import { validateEmail, validateSignInPassword } from '../../utils/validation';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { setItem } from '../../utils/secureStorage';
import { signInWithGoogle, signInWithApple } from '../../services/socialAuthService';

// Common Components
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import AuthCapsuleButton from '../../components/atoms/Button/AuthCapsuleButton';

// Import SVG Icons
import MailIcon from '../../assets/images/mail.svg';
import LockIcon from '../../assets/images/lock.svg';
import EyeIcon from '../../assets/images/eye.svg';
import EyeOffIcon from '../../assets/images/eye-off.svg';
import GoogleIcon from '../../assets/images/signIn/google.svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const SignInScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { showToast } = useToast();

  const handleSignIn = async () => {
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      showToast(emailCheck.error || 'Invalid email', 'error');
      return;
    }

    const passwordCheck = validateSignInPassword(password);
    if (!passwordCheck.isValid) {
      showToast(passwordCheck.error || 'Please enter your password.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);

      const response = await apiClient.post(API_ENDPOINTS.SIGN_IN, formData);
      if (response.data && response.data.access_token) {
        await setItem('user_token', response.data.access_token);
        await setItem('user_data', JSON.stringify(response.data.user || {}));
        showToast('Logged in successfully!', 'success');
        navigation.navigate('Dashboard');
      } else {
        showToast(response.data.message || 'Login failed', 'error');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Login failed';
      showToast(msg, 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (res.success) {
      showToast('Google login successful!', 'success');
      navigation.navigate('Dashboard');
    } else {
      showToast(res.error || 'Google login failed', 'error');
    }
  };

  const handleAppleSignIn = async () => {
    const res = await signInWithApple();
    if (res.success) {
      showToast('Apple login successful!', 'success');
      navigation.navigate('Dashboard');
    } else {
      showToast(res.error || 'Apple login failed', 'error');
    }
  };

  return (
    <AuthTemplate type="signin" onBackPress={() => navigation.goBack()}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.titleText}>Let's get you{'\n'}signed in!</Text>

        <View style={styles.signUpRow}>
          <Text style={styles.noAccountText}>You don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Section */}
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
          />
        </View>

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

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxActive]}
            >
              {rememberMe && <View style={styles.checkboxInner} />}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.line} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[
              styles.socialButton,
              Platform.OS !== 'ios' && styles.socialButtonFull,
            ]}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.socialText}>Google</Text>
            <GoogleIcon width={scale(24)} height={scale(24)} />
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
              <Text style={styles.socialText}>Apple</Text>
              <AppleIcon size={scale(24)} />
            </TouchableOpacity>
          )}
        </View>

        {/* Terms Text */}
        <Text style={styles.footerText}>
          By signing in, you agree to our{'\n'}
          <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>

        <AuthCapsuleButton title="Sign In" onPress={handleSignIn} />
      </View>
    </AuthTemplate>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: scale(15),
    // paddingTop: scale(10),
  },
  titleText: {
    ...theme.typography.extraBold,
    fontSize: scale(24),
    color: colors.primary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  signUpRow: {
    flexDirection: 'row',
  },
  noAccountText: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textSecondary,
  },
  signUpText: {
    ...theme.typography.bold,
    fontSize: scale(14),
    color: colors.accent,
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
    marginBottom: scale(12),
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(15),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: colors.accent,
    marginRight: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
  },
  checkboxInner: {
    width: scale(8),
    height: scale(8),
    backgroundColor: colors.white,
    borderRadius: scale(1),
  },
  rememberText: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textSecondary,
  },
  forgotText: {
    ...theme.typography.bold,
    fontSize: scale(14),
    color: colors.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    ...theme.typography.regular,
    marginHorizontal: scale(10),
    fontSize: scale(14),
    color: colors.textPlaceholder,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: scale(50),
    borderRadius: scale(25),
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialButtonFull: {
    width: '100%',
  },
  socialText: {
    ...theme.typography.medium,
    fontSize: scale(16),
    color: colors.text,
    marginRight: scale(10),
  },
  footerSection: {
    marginTop: scale(15),
    alignItems: 'center',
  },

  footerText: {
    marginTop: scale(10),
    ...theme.typography.regular,
    fontSize: scale(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    ...theme.typography.semiBold,
    color: colors.primary,
  },
});

export default SignInScreen;
