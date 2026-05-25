import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CountryData } from 'country-codes-list';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { Alert } from 'react-native';
import { useUser } from '../../../../context/UserContext';
import { useToast } from '../../../../context/ToastContext';
import { validatePhone } from '../../../../utils/validation';
import { logger } from '../../../../services/logger';
import { getPdfPath } from '../../../../config/appVariantConfig';
import apiClient from '../../../../services/apiClient';
import { API_ENDPOINTS } from '../../../../config/apiConfig';
import { DEFAULT_COUNTRY, FALLBACK_AVATAR_URI } from '../constants';
import {
  buildProfileImageUrl,
  parsePhoneWithCountry,
  toISODate,
} from '../helpers';

interface SelectedImage {
  uri?: string;
  type?: string;
  fileName?: string;
}

interface UseEditProfileFormResult {
  name: string;
  setName: (v: string) => void;
  email: string;
  phone: string;
  setPhone: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  score: string;
  setScore: (v: string) => void;
  examDate: Date | null;
  setExamDate: (v: Date | null) => void;

  selectedCountry: CountryData;
  setSelectedCountry: (c: CountryData) => void;
  selectedImage: SelectedImage | null;
  imageError: boolean;
  setImageError: (v: boolean) => void;
  displayImageUri: string;

  handleSelectImage: () => void;

  // Email-change OTP flow
  newEmail: string;
  setNewEmail: (v: string) => void;
  emailOtp: string;
  setEmailOtp: (v: string) => void;
  emailOtpSent: boolean;
  setEmailOtpSent: (v: boolean) => void;
  emailOtpLoading: boolean;
  emailUpdateLoading: boolean;
  handleSendEmailOtp: () => Promise<void>;
  handleConfirmEmailUpdate: () => Promise<boolean>;

  handleUpdate: () => Promise<boolean>;
}

// Lifts every piece of EditProfileScreen's form state + side-effecting
// handlers behind one hook so the screen body stays focused on layout.
export const useEditProfileForm = (): UseEditProfileFormResult => {
  const { user, updateUser, updateExamDate } = useUser();
  const { showToast } = useToast();

  const [imageError, setImageError] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [score, setScore] = useState('');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryData>(DEFAULT_COUNTRY);

  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);

  // Hydrate form from user context whenever it changes.
  useEffect(() => {
    if (!user) return;
    setName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
    setEmail(user.email || '');
    setLanguage(user.language || 'English - UK');
    setTimezone(user.timezone || 'Asia/Kolkata');
    setScore(String(user.score || '79+'));

    if (user.exam_date) {
      const parsed = new Date(user.exam_date);
      setExamDate(!isNaN(parsed.getTime()) ? parsed : null);
    } else {
      setExamDate(null);
    }

    const rawPhone = user.phone || user.phone_number || '';
    const parsed = parsePhoneWithCountry(rawPhone);
    setSelectedCountry(parsed.country || DEFAULT_COUNTRY);
    setPhone(parsed.localPhone);
  }, [user]);

  const profileImage = useMemo(
    () =>
      buildProfileImageUrl(user?.image, getPdfPath(), FALLBACK_AVATAR_URI),
    [user?.image],
  );

  const displayImageUri =
    selectedImage?.uri || (imageError ? FALLBACK_AVATAR_URI : profileImage);

  const applyAsset = useCallback((asset: Asset) => {
    setSelectedImage({
      uri: asset.uri,
      type: asset.type,
      fileName: asset.fileName || 'profile.jpg',
    });
    setImageError(false);
  }, []);

  const handleSelectImage = useCallback(() => {
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
                applyAsset(result.assets[0]);
              }
            } catch (err) {
              logger.warn('Error launching camera:', err);
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
                applyAsset(result.assets[0]);
              }
            } catch (err) {
              logger.warn('Error launching image library:', err);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [applyAsset]);

  const handleSendEmailOtp = useCallback(async () => {
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
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to send OTP.';
      showToast(msg, 'error');
    } finally {
      setEmailOtpLoading(false);
    }
  }, [newEmail, showToast]);

  const handleConfirmEmailUpdate = useCallback(async (): Promise<boolean> => {
    if (!emailOtp) {
      showToast('Please enter the OTP from your email.', 'error');
      return false;
    }
    setEmailUpdateLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', newEmail.trim());
      formData.append('otp', emailOtp);
      await apiClient.post(API_ENDPOINTS.UPDATE_USER_EMAIL, formData);
      setEmail(newEmail.trim());
      setNewEmail('');
      setEmailOtp('');
      setEmailOtpSent(false);
      showToast('Email updated successfully!', 'success');
      return true;
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update email.';
      showToast(msg, 'error');
      return false;
    } finally {
      setEmailUpdateLoading(false);
    }
  }, [emailOtp, newEmail, showToast]);

  const handleUpdate = useCallback(async (): Promise<boolean> => {
    try {
      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const phoneCheck = validatePhone(phone, selectedCountry.countryCode);
      if (!phoneCheck.isValid) {
        showToast(phoneCheck.error || 'Invalid phone', 'error');
        return false;
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
        ...(selectedImage && selectedImage.uri
          ? {
              imageFile: {
                uri: selectedImage.uri,
                type: selectedImage.type,
                fileName: selectedImage.fileName,
              },
            }
          : {}),
      });

      // Persist exam date via dedicated endpoint when changed/set.
      const currentExamISO = user?.exam_date
        ? user.exam_date.slice(0, 10)
        : '';
      const nextExamISO = examDate ? toISODate(examDate) : '';
      if (nextExamISO && nextExamISO !== currentExamISO) {
        try {
          await updateExamDate(nextExamISO);
        } catch (examErr: unknown) {
          const error = examErr as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          };
          const msg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            'Profile saved, but exam date failed to update';
          showToast(msg, 'error');
        }
      }

      showToast('Profile updated successfully!', 'success');
      return true;
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update profile';
      showToast(msg, 'error');
      return false;
    }
  }, [
    name,
    phone,
    selectedCountry,
    email,
    language,
    timezone,
    score,
    selectedImage,
    examDate,
    user?.exam_date,
    updateUser,
    updateExamDate,
    showToast,
  ]);

  return {
    name,
    setName,
    email,
    phone,
    setPhone,
    language,
    setLanguage,
    timezone,
    setTimezone,
    score,
    setScore,
    examDate,
    setExamDate,
    selectedCountry,
    setSelectedCountry,
    selectedImage,
    imageError,
    setImageError,
    displayImageUri,
    handleSelectImage,
    newEmail,
    setNewEmail,
    emailOtp,
    setEmailOtp,
    emailOtpSent,
    setEmailOtpSent,
    emailOtpLoading,
    emailUpdateLoading,
    handleSendEmailOtp,
    handleConfirmEmailUpdate,
    handleUpdate,
  };
};
