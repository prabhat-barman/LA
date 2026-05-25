import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { SubHeader } from '../../../components/molecules/SubHeader';
import {
  CaretDownIcon,
  SmallCalendarIcon,
} from '../../../components/atoms/Icon';
import { DatePickerModal } from '../../../components/molecules/DatePickerModal';
import Data from '../../../config/practiceData';
import { scale } from './scale';
import { styles } from './styles';
import { formatExamDateDisplay, getPhoneMaxLength } from './helpers';
import { useEditProfileForm } from './hooks/useEditProfileForm';
import { EmailChangeModal } from './components/EmailChangeModal';
import { TimezoneModal } from './components/TimezoneModal';
import { ScoreModal } from './components/ScoreModal';
import { CountryModal } from './components/CountryModal';

interface ScoreItem {
  value: string;
  pte_overall: string;
  label: string;
}

export const EditProfileScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const form = useEditProfileForm();

  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  const closeTimezoneModal = () => {
    setShowTimezoneModal(false);
    setTimezoneSearch('');
  };

  const closeCountryModal = () => {
    setShowCountryModal(false);
    setCountrySearch('');
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    form.setNewEmail('');
    form.setEmailOtp('');
    form.setEmailOtpSent(false);
  };

  const handleUpdatePress = async () => {
    const ok = await form.handleUpdate();
    if (ok) navigation.goBack();
  };

  const scoreLabel =
    (Data.selectDesiredScoreWhole as ScoreItem[]).find(
      item =>
        item.pte_overall === form.score || item.value === form.score,
    )?.label || form.score;

  return (
    <View style={styles.container}>
      <SubHeader title="Edit Details" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={form.handleSelectImage}
            style={{ alignItems: 'center' }}
          >
            <Image
              source={{ uri: form.displayImageUri }}
              onError={() => form.setImageError(true)}
              style={styles.avatar}
            />
            <View style={styles.changePicBtn}>
              <Text style={styles.changePicText}>
                Click to change profile picture
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={form.setName}
              placeholder="Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                value={form.email}
                editable={false}
                keyboardType="email-address"
                placeholder="Email"
              />
              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => {
                  form.setNewEmail('');
                  form.setEmailOtp('');
                  form.setEmailOtpSent(false);
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
                  {form.selectedCountry.flag} +
                  {form.selectedCountry.countryCallingCode}
                </Text>
                <CaretDownIcon
                  size={scale(10)}
                  color="#8E8E93"
                  strokeWidth={3}
                />
              </TouchableOpacity>
              <View style={styles.codeDivider} />
              <TextInput
                style={styles.phoneInput}
                value={form.phone}
                onChangeText={text => form.setPhone(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Phone"
                maxLength={getPhoneMaxLength(form.selectedCountry.countryCode)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Language</Text>
            <TextInput
              style={styles.input}
              value={form.language}
              onChangeText={form.setLanguage}
              placeholder="Language"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Timezone</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowTimezoneModal(true)}
            >
              <Text style={styles.pickerTriggerText}>
                {form.timezone || 'Select Timezone'}
              </Text>
              <CaretDownIcon
                size={scale(10)}
                color="#8E8E93"
                strokeWidth={3}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Desired Score (Bands)</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowScoreModal(true)}
            >
              <Text style={styles.pickerTriggerText}>{scoreLabel}</Text>
              <CaretDownIcon
                size={scale(10)}
                color="#8E8E93"
                strokeWidth={3}
              />
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
                  !form.examDate && styles.pickerPlaceholderText,
                ]}
              >
                {formatExamDateDisplay(form.examDate)}
              </Text>
              <SmallCalendarIcon size={scale(16)} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.updateBtn}
            onPress={handleUpdatePress}
          >
            <Text style={styles.updateBtnText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showEmailModal && (
        <EmailChangeModal
          visible={showEmailModal}
          newEmail={form.newEmail}
          emailOtp={form.emailOtp}
          emailOtpSent={form.emailOtpSent}
          emailOtpLoading={form.emailOtpLoading}
          emailUpdateLoading={form.emailUpdateLoading}
          onChangeNewEmail={form.setNewEmail}
          onChangeOtp={form.setEmailOtp}
          onSendOtp={form.handleSendEmailOtp}
          onConfirm={async () => {
            const ok = await form.handleConfirmEmailUpdate();
            if (ok) setShowEmailModal(false);
          }}
          onClose={closeEmailModal}
        />
      )}

      {showTimezoneModal && (
        <TimezoneModal
          visible={showTimezoneModal}
          selectedTimezone={form.timezone}
          search={timezoneSearch}
          onChangeSearch={setTimezoneSearch}
          onSelect={tz => {
            form.setTimezone(tz);
            closeTimezoneModal();
          }}
          onClose={closeTimezoneModal}
        />
      )}

      {showScoreModal && (
        <ScoreModal
          visible={showScoreModal}
          selectedScore={form.score}
          onSelect={value => {
            form.setScore(value);
            setShowScoreModal(false);
          }}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {showCountryModal && (
        <CountryModal
          visible={showCountryModal}
          search={countrySearch}
          onChangeSearch={setCountrySearch}
          onSelect={country => {
            form.setSelectedCountry(country);
            closeCountryModal();
          }}
          onClose={closeCountryModal}
        />
      )}

      <DatePickerModal
        visible={showExamDatePicker}
        onClose={() => setShowExamDatePicker(false)}
        onConfirm={d => {
          form.setExamDate(d);
          setShowExamDatePicker(false);
        }}
        initialDate={form.examDate}
        minDate={new Date()}
        title="Pick your exam date"
      />
    </View>
  );
};

export default EditProfileScreen;
