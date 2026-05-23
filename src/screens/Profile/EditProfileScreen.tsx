import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CaretDownIcon, SmallCalendarIcon } from '../../components/atoms/Icon';
import Data from '../../config/practiceData';
import { all, CountryData } from 'country-codes-list';
import { validatePhone } from '../../utils/validation';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { DatePickerModal } from '../../components/molecules/DatePickerModal';

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


const TIMEZONES = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'America/Argentina/Buenos_Aires',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Baghdad',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Dhaka',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Darwin',
  'Australia/Hobart',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Zurich',
  'Pacific/Auckland',
  'UTC',
];

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { user, updateUser, updateExamDate } = useUser();
  const [imageError, setImageError] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [score, setScore] = useState('');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(DEFAULT_COUNTRY);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Email change OTP flow
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);

  const filteredCountries = COUNTRIES.filter(country => {
    const query = countrySearch.toLowerCase().trim();
    if (!query) return true;
    return (
      country.countryNameEn.toLowerCase().includes(query) ||
      country.countryCallingCode.includes(query) ||
      country.countryCode.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (user) {
      setName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
      setEmail(user.email || '');
      setLanguage(user.language || 'English - UK');
      setTimezone(user.timezone || 'Asia/Kolkata');
      setScore(String(user.score || '79+'));
      if (user.exam_date) {
        const parsed = new Date(user.exam_date);
        if (!isNaN(parsed.getTime())) {
          setExamDate(parsed);
        }
      } else {
        setExamDate(null);
      }

      // Parse phone number
      const rawPhone = user.phone || user.phone_number || '';
      if (rawPhone) {
        let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        const sortedCountries = [...COUNTRIES].sort(
          (a, b) => b.countryCallingCode.length - a.countryCallingCode.length
        );
        let matched = false;
        for (const country of sortedCountries) {
          if (cleanPhone.startsWith(country.countryCallingCode)) {
            setSelectedCountry(country);
            setPhone(cleanPhone.slice(country.countryCallingCode.length));
            matched = true;
            break;
          }
        }
        if (!matched) {
          setPhone(cleanPhone);
        }
      } else {
        setPhone('');
      }
    }
  }, [user]);

  const getProfileImage = () => {
    const photoPath = user?.image;
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    }
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    const baseUrl = getPdfPath();
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `${baseUrl}${separator}${cleanPath}`;
  };

  const profileImage = getProfileImage();
  const fallbackUri = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const displayImageUri = selectedImage?.uri || (imageError ? fallbackUri : profileImage);

  const handleSelectImage = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option to select a profile picture:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 800,
                maxHeight: 800,
              });
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedImage({
                  uri: asset.uri,
                  type: asset.type,
                  fileName: asset.fileName || 'profile.jpg',
                });
                setImageError(false);
              }
            } catch (err) {
              console.warn('Error launching camera:', err);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 800,
                maxHeight: 800,
              });
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedImage({
                  uri: asset.uri,
                  type: asset.type,
                  fileName: asset.fileName || 'profile.jpg',
                });
                setImageError(false);
              }
            } catch (err) {
              console.warn('Error launching image library:', err);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setEmailOtpLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', newEmail.trim());
      await apiClient.post(API_ENDPOINTS.SEND_UPDATE_EMAIL_OTP, formData);
      setEmailOtpSent(true);
      showToast('OTP sent to your new email!', 'info');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send OTP.';
      showToast(msg, 'error');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleConfirmEmailUpdate = async () => {
    if (!emailOtp) {
      showToast('Please enter the OTP from your email.', 'error');
      return;
    }
    setEmailUpdateLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', newEmail.trim());
      formData.append('otp', emailOtp);
      await apiClient.post(API_ENDPOINTS.UPDATE_USER_EMAIL, formData);
      setEmail(newEmail.trim());
      setShowEmailModal(false);
      setNewEmail('');
      setEmailOtp('');
      setEmailOtpSent(false);
      showToast('Email updated successfully!', 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update email.';
      showToast(msg, 'error');
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const formatExamDateDisplay = (d: Date | null) => {
    if (!d) return 'Set your exam date';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toISODate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleUpdate = async () => {
    try {
      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      // Phone validation using selected country
      const phoneCheck = validatePhone(phone, selectedCountry.countryCode);
      if (!phoneCheck.isValid) {
        showToast(phoneCheck.error || 'Invalid phone', 'error');
        return;
      }

      const fullPhone = `+${selectedCountry.countryCallingCode}${phone}`;

      await updateUser({
        first_name,
        last_name,
        email,
        phone: fullPhone,
        language,
        timezone,
        score,
        ...(selectedImage ? { imageFile: selectedImage } : {}),
      });

      // Persist exam date via dedicated endpoint if changed/set
      const currentExamISO = user?.exam_date ? user.exam_date.slice(0, 10) : '';
      const nextExamISO = examDate ? toISODate(examDate) : '';
      if (nextExamISO && nextExamISO !== currentExamISO) {
        try {
          await updateExamDate(nextExamISO);
        } catch (examErr: any) {
          const msg =
            examErr?.response?.data?.message ||
            examErr?.response?.data?.error ||
            examErr?.message ||
            'Profile saved, but exam date failed to update';
          showToast(msg, 'error');
        }
      }

      showToast('Profile updated successfully!', 'success');
      navigation.goBack();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update profile';
      showToast(msg, 'error');
    }
  };

  return (
    <View style={styles.container}>
      <SubHeader title="Edit Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar edit section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleSelectImage} style={{ alignItems: 'center' }}>
            <Image
              source={{ uri: displayImageUri }}
              onError={() => setImageError(true)}
              style={styles.avatar}
            />
            <View style={styles.changePicBtn}>
              <Text style={styles.changePicText}>Click to change profile picture</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Input Forms */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                value={email}
                editable={false}
                keyboardType="email-address"
                placeholder="Email"
              />
              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => {
                  setNewEmail('');
                  setEmailOtp('');
                  setEmailOtpSent(false);
                  setShowEmailModal(true);
                }}
              >
                <Text style={styles.changeEmailBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity
                style={styles.countryCodeSelector}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={styles.countryCodeText}>
                  {selectedCountry.flag} +{selectedCountry.countryCallingCode}
                </Text>
                <CaretDownIcon size={scale(10)} color="#8E8E93" strokeWidth={3} />
              </TouchableOpacity>
              <View style={styles.codeDivider} />
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Phone"
                maxLength={getPhoneMaxLength(selectedCountry.countryCode)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Language</Text>
            <TextInput
              style={styles.input}
              value={language}
              onChangeText={setLanguage}
              placeholder="Language"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Timezone</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowTimezoneModal(true)}
            >
              <Text style={styles.pickerTriggerText}>{timezone || 'Select Timezone'}</Text>
              <CaretDownIcon size={scale(10)} color="#8E8E93" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Desired Score (Bands)</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowScoreModal(true)}
            >
              <Text style={styles.pickerTriggerText}>
                {Data.selectDesiredScoreWhole.find(item => item.pte_overall === score || item.value === score)?.label || score}
              </Text>
              <CaretDownIcon size={scale(10)} color="#8E8E93" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Exam Date</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowExamDatePicker(true)}
            >
              <Text
                style={[
                  styles.pickerTriggerText,
                  !examDate && styles.pickerPlaceholderText,
                ]}
              >
                {formatExamDateDisplay(examDate)}
              </Text>
              <SmallCalendarIcon size={scale(16)} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Update button */}
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
            <Text style={styles.updateBtnText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Email Change Modal */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmailModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Email</Text>

            <Text style={styles.modalSubLabel}>New Email Address</Text>
            <TextInput
              style={styles.modalInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!emailOtpSent}
            />

            {emailOtpSent ? (
              <>
                <Text style={[styles.modalSubLabel, { marginTop: scale(12) }]}>Enter OTP</Text>
                <TextInput
                  style={styles.modalInput}
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                  placeholder="6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, emailUpdateLoading && { opacity: 0.6 }]}
                  onPress={handleConfirmEmailUpdate}
                  disabled={emailUpdateLoading}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {emailUpdateLoading ? 'Updating...' : 'Confirm Update'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalConfirmBtn, emailOtpLoading && { opacity: 0.6 }]}
                onPress={handleSendEmailOtp}
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

      {/* Timezone Modal */}
      <Modal
        visible={showTimezoneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowTimezoneModal(false);
          setTimezoneSearch('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowTimezoneModal(false);
            setTimezoneSearch('');
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowTimezoneModal(false);
                  setTimezoneSearch('');
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBarWrapper}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search timezone..."
                placeholderTextColor="#8E8E93"
                value={timezoneSearch}
                onChangeText={setTimezoneSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={TIMEZONES.filter(tz =>
                tz.toLowerCase().includes(timezoneSearch.toLowerCase())
              )}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item === timezone && styles.selectedModalItem,
                  ]}
                  onPress={() => {
                    setTimezone(item);
                    setShowTimezoneModal(false);
                    setTimezoneSearch('');
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item === timezone && styles.selectedModalItemText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.modalScroll}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Score Modal */}
      <Modal
        visible={showScoreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScoreModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowScoreModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Desired Score (Bands)</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowScoreModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={Data.selectDesiredScoreWhole}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    (item.pte_overall === score || item.value === score) && styles.selectedModalItem,
                  ]}
                  onPress={() => {
                    setScore(item.pte_overall);
                    setShowScoreModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      (item.pte_overall === score || item.value === score) && styles.selectedModalItemText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.modalScroll}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCountryModal(false);
          setCountrySearch('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCountryModal(false);
            setCountrySearch('');
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowCountryModal(false);
                  setCountrySearch('');
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBarWrapper}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search country name or code..."
                placeholderTextColor="#8E8E93"
                value={countrySearch}
                onChangeText={setCountrySearch}
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
                    setCountrySearch('');
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.countryNameEn}</Text>
                  <Text style={styles.countryCallingCode}>+{item.countryCallingCode}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalScroll}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exam Date Picker */}
      <DatePickerModal
        visible={showExamDatePicker}
        onClose={() => setShowExamDatePicker(false)}
        onConfirm={(d) => {
          setExamDate(d);
          setShowExamDatePicker(false);
        }}
        initialDate={examDate}
        minDate={new Date()}
        title="Pick your exam date"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: scale(30),
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: scale(20),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  avatar: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    marginBottom: scale(8),
  },
  changePicBtn: {
    padding: scale(4),
  },
  changePicText: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  formContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  inputGroup: {
    marginBottom: scale(14),
  },
  inputLabel: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
    marginLeft: scale(4),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    fontSize: scale(13),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  disabledInput: {
    backgroundColor: '#F0F2F5',
    color: '#8E8E93',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    height: scale(44),
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: scale(4),
  },
  countryCodeText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1C1F2A',
    marginRight: scale(6),
  },
  codeDivider: {
    width: 1,
    height: scale(20),
    backgroundColor: '#EAECEF',
    marginHorizontal: scale(8),
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: scale(13),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
    padding: 0,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  countryFlag: {
    fontSize: scale(18),
    marginRight: scale(10),
  },
  countryName: {
    flex: 1,
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  countryCallingCode: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  pickerTrigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTriggerText: {
    fontSize: scale(13),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  pickerPlaceholderText: {
    color: '#8E8E93',
  },
  updateBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(16),
  },
  updateBtnText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '60%',
    paddingBottom: scale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  modalTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  closeButton: {
    padding: scale(4),
  },
  closeButtonText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#94C23C',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  searchBarWrapper: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
  },
  searchBar: {
    backgroundColor: '#F2F2F7',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  modalScroll: {
    paddingHorizontal: scale(10),
  },
  modalItem: {
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    marginVertical: scale(2),
  },
  selectedModalItem: {
    backgroundColor: '#F5F9E9',
  },
  modalItemText: {
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  selectedModalItemText: {
    fontWeight: 'bold',
    color: '#94C23C',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  // Email change styles
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  emailInput: {
    flex: 1,
  },
  changeEmailBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
  },
  changeEmailBtnText: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  modalSubLabel: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(6),
  },
  modalInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(14),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(8),
  },
  modalConfirmBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(10),
    paddingVertical: scale(12),
    alignItems: 'center',
    marginTop: scale(8),
  },
  modalConfirmBtnText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});

