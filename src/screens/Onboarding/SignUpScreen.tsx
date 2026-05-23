import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { theme } from '../../theme';
import { all, CountryData } from 'country-codes-list';
import { validateName, validateEmail, validatePhone } from '../../utils/validation';
import { signInWithGoogle, signInWithApple } from '../../services/socialAuthService';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

// Common Components
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import AuthCapsuleButton from '../../components/atoms/Button/AuthCapsuleButton';

// Import SVG Icons
import MailIcon from '../../assets/images/mail.svg';
import GoogleIcon from '../../assets/images/signIn/google.svg';
import {
  AppleIcon,
  UserInputIcon,
  PhoneInputIcon,
  CaretDownIcon,
} from '../../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const COUNTRIES = all();
const DEFAULT_COUNTRY = COUNTRIES.find(c => c.countryCode === 'IN') || COUNTRIES[0];

const getPhoneMaxLength = (countryCode: string): number => {
  const code = countryCode.toUpperCase();
  switch (code) {
    case 'IN': // India
    case 'US': // US
    case 'CA': // Canada
    case 'GB': // UK
      return 10;
    case 'AU': // Australia
    case 'AE': // UAE
      return 9;
    case 'SG': // Singapore
      return 8;
    default:
      return 15;
  }
};

const SignUpScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(DEFAULT_COUNTRY);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredCountries = COUNTRIES.filter(country => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      country.countryNameEn.toLowerCase().includes(query) ||
      country.countryCallingCode.includes(query) ||
      country.countryCode.toLowerCase().includes(query)
    );
  });

  const { showToast } = useToast();

  const handleRegister = async () => {
    const nameCheck = validateName(fullName);
    if (!nameCheck.isValid) {
      showToast(nameCheck.error || 'Invalid name', 'error');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      showToast(emailCheck.error || 'Invalid email', 'error');
      return;
    }

    const phoneCheck = validatePhone(phoneNumber, selectedCountry.countryCode);
    if (!phoneCheck.isValid) {
      showToast(phoneCheck.error || 'Invalid phone', 'error');
      return;
    }

    if (!agreeTerms) {
      showToast('Please agree to the Terms & Conditions.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Register user
      const nameParts = fullName.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      const fullPhone = `+${selectedCountry.countryCallingCode}${phoneNumber}`;

      const formData = new FormData();
      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('email', email.trim());
      formData.append('phone', fullPhone);
      await apiClient.post(API_ENDPOINTS.SIGN_UP, formData);

      // Step 2: Send OTP for email verification
      const otpForm = new FormData();
      otpForm.append('email', email.trim());
      await apiClient.post(API_ENDPOINTS.SEND_SIGN_UP, otpForm);

      showToast('Registration successful! Check your email for OTP.', 'success');
      setTimeout(() => {
        navigation.navigate('OTP', { email: email.trim() });
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Registration failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (res.success) {
      showToast('Google registration successful!', 'success');
      navigation.navigate('Dashboard');
    } else {
      showToast(res.error || 'Google registration failed', 'error');
    }
  };

  const handleAppleSignIn = async () => {
    const res = await signInWithApple();
    if (res.success) {
      showToast('Apple registration successful!', 'success');
      navigation.navigate('Dashboard');
    } else {
      showToast(res.error || 'Apple registration failed', 'error');
    }
  };

  return (
    <AuthTemplate type="signup" onBackPress={() => navigation.goBack()}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.titleText}>Let's get you{'\n'}signed up!</Text>
        <View style={styles.signInRow}>
          <Text style={styles.alreadyAccountText}>You have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <View style={styles.iconContainer}>
            <UserInputIcon size={scale(20)} color={colors.textSecondary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textPlaceholder}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.iconContainer}>
            <MailIcon width={scale(20)} height={scale(20)} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={colors.textPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.iconContainer}>
            <PhoneInputIcon size={scale(20)} color={colors.textSecondary} />
          </View>
          <TouchableOpacity
            style={styles.countryCodeSelector}
            onPress={() => setShowCountryModal(true)}
          >
            <Text style={styles.countryCodeText}>+{selectedCountry.countryCallingCode}</Text>
            <CaretDownIcon size={scale(10)} color={colors.textSecondary} strokeWidth={3} />
          </TouchableOpacity>
          <View style={styles.codeDivider} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.textPlaceholder}
            keyboardType="number-pad"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            maxLength={getPhoneMaxLength(selectedCountry.countryCode)}
          />
        </View>

        <View style={styles.termsRow}>
          <TouchableOpacity
            style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            {agreeTerms && <View style={styles.checkboxInner} />}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text>.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBtn}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <AuthCapsuleButton
            title="Register"
            onPress={handleRegister}
          />
        )}

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
      </View>

      {/* Country Code Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCountryModal(false);
          setSearchQuery('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCountryModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TextInput
                style={styles.searchBar}
                placeholder="Search country name or code..."
                placeholderTextColor={colors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.countryCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.countryNameEn}</Text>
                  <Text style={styles.countryCode}>+{item.countryCallingCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </AuthTemplate>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  titleText: {
    ...theme.typography.extraBold,
    fontSize: scale(24),
    color: colors.primary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  signInRow: {
    flexDirection: 'row',
  },
  alreadyAccountText: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textSecondary,
  },
  signInText: {
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(4),
    marginBottom: scale(10),
  },
  checkbox: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(4),
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginRight: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  checkboxInner: {
    width: scale(8),
    height: scale(8),
    backgroundColor: colors.white,
    borderRadius: scale(1),
  },
  termsText: {
    ...theme.typography.regular,
    fontSize: scale(13),
    color: colors.textSecondary,
  },
  termsLink: {
    ...theme.typography.bold,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(12),
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
    borderColor: '#EEE',
  },
  socialButtonFull: {
    width: '100%',
  },
  loadingBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialText: {
    ...theme.typography.medium,
    fontSize: scale(16),
    color: colors.text,
    marginRight: scale(10),
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: scale(5),
    paddingRight: scale(8),
    height: '100%',
  },
  countryCodeText: {
    ...theme.typography.medium,
    fontSize: scale(15),
    color: colors.text,
    marginRight: scale(4),
  },
  codeDivider: {
    width: 1,
    height: scale(20),
    backgroundColor: colors.border,
    marginRight: scale(10),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '60%',
    paddingBottom: scale(20),
  },
  modalHeader: {
    padding: scale(18),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.bold,
    fontSize: scale(18),
    color: colors.primary,
  },
  searchBar: {
    ...theme.typography.medium,
    width: '100%',
    height: scale(40),
    backgroundColor: '#F5F5F5',
    borderRadius: scale(20),
    paddingHorizontal: scale(15),
    fontSize: scale(14),
    color: colors.text,
    marginTop: scale(12),
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(15),
    paddingHorizontal: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  countryFlag: {
    fontSize: scale(22),
    marginRight: scale(12),
  },
  countryName: {
    ...theme.typography.medium,
    fontSize: scale(16),
    color: colors.text,
    flex: 1,
  },
  countryCode: {
    ...theme.typography.bold,
    fontSize: scale(16),
    color: colors.accent,
  },
});

export default SignUpScreen;
