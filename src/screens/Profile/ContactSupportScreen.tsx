import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { EnvelopeIcon, PhoneCallIcon, MapPinIcon } from '../../components/atoms/Icon';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import { logger } from '../../services/logger';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { useUser } from '../../context/UserContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const ContactSupportScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { user } = useUser();

  const userData = user || {};
  const initialName = [userData?.first_name, userData?.last_name].filter(Boolean).join(' ');
  const initialEmail = userData?.email || '';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [apiContactDetails, setApiContactDetails] = useState<{
    email?: string;
    phone?: string;
    address?: string;
  } | null>(null);

  useEffect(() => {
    // Only seed the fields when they're still empty — using the functional
    // setter form means we don't need to depend on `name`/`email`, which
    // would otherwise overwrite the user's edits on every keystroke.
    if (initialName) {
      setName((curr) => (curr ? curr : initialName));
    }
    if (initialEmail) {
      setEmail((curr) => (curr ? curr : initialEmail));
    }
  }, [initialName, initialEmail]);

  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CONTACT_DETAILS);
        const data = res.data?.data ?? res.data ?? {};
        setApiContactDetails({
          email: data?.email || data?.support_email || data?.contact_email,
          phone: data?.phone || data?.phone_no || data?.contact_no || data?.contact_number,
          address: data?.address || data?.office_address || data?.location,
        });
      } catch (err) {
        logger.warn('Failed to fetch contact details from API:', err);
      }
    };
    fetchContactDetails();
  }, []);

  const handleContactPress = (type: 'email' | 'phone' | 'address', value: string) => {
    if (!value) return;
    try {
      if (type === 'email') {
        Linking.openURL(`mailto:${value}`);
      } else if (type === 'phone') {
        const cleanPhone = value.replace(/[^+\d]/g, '');
        Linking.openURL(`tel:${cleanPhone}`);
      } else if (type === 'address') {
        const query = encodeURIComponent(value);
        const mapUrl = Platform.select({
          ios: `maps://0,0?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://www.google.com/maps/search/?api=1&query=${query}`,
        });
        Linking.canOpenURL(mapUrl).then((supported) => {
          if (supported) {
            Linking.openURL(mapUrl);
          } else {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
          }
        });
      }
    } catch (err) {
      logger.warn('Could not redirect contact option:', err);
      showToast('Could not open external app.', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!name || !email || !subject || !message) {
      showToast('Please fill out all message fields.', 'error');
      return;
    }
    setSending(true);
    try {
      await apiClient.post(API_ENDPOINTS.CONTACT_US, {
        name,
        email,
        subject,
        message,
      });
      showToast('Your message has been sent successfully!', 'success');
      navigation.goBack();
    } catch (err: any) {
      logger.warn('Failed to submit support query:', err);
      showToast(err?.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const contactOptions = [
    {
      id: 1,
      title: 'EMAIL US',
      value: apiContactDetails?.email || 'info@languageacademy.com.au',
      icon: <EnvelopeIcon />,
      iconBg: '#E5F1FF',
      color: '#007AFF',
      type: 'email' as const,
    },
    {
      id: 2,
      title: 'CALL US',
      value: apiContactDetails?.phone || '+61 430 383 041',
      icon: <PhoneCallIcon />,
      iconBg: '#E5FFE5',
      color: '#34C759',
      type: 'phone' as const,
    },
    {
      id: 3,
      title: 'VISIT US',
      value: apiContactDetails?.address || '45 George Street, Parramatta',
      icon: <MapPinIcon />,
      iconBg: '#FFF0E5',
      color: '#FF9500',
      type: 'address' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <SubHeader title="Contact Support" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Contact Info list */}
        <View style={styles.infoContainer}>
          {contactOptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.infoCard}
              onPress={() => handleContactPress(item.type, item.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, { backgroundColor: item.iconBg }]}>
                {item.icon}
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>{item.title}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Send message form */}
        <View style={styles.formContainer}>
          <Text style={styles.formHeader}>Send us a Message</Text>
          <Text style={styles.formSubHeader}>
            Fill out the form below and we'll get back to you as soon as possible.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name/username"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="Enter email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Write subject"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help you?"
              multiline={true}
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.8 }]}
            onPress={handleSendMessage}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send Message</Text>
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
    paddingBottom: scale(30),
  },
  infoContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  iconWrapper: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scale(9),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  formContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  formHeader: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  formSubHeader: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(15),
    marginBottom: scale(16),
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
  messageInput: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(10),
  },
  sendBtnText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
