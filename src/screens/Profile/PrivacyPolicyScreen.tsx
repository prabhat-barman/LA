import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <SubHeader title="Privacy Policy" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.textBlock}>
          <Text style={styles.docTitle}>Privacy Policy</Text>
          <Text style={styles.docSubtitle}>Last updated 24th March 2026</Text>

          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            By accessing and utilizing the Website, the Apps and the Services provided by Language Academy
            Australia Pty Ltd ("Language Academy"), you agree that any Personal Data policy, and collectively
            referred to as the "Terms", they govern your access to and use of the website(languageacademy.com.au)
            and any associated mobile applications (the "Platform"), operated by Language Academy Australia Pty Ltd
            (Language Academy). We collect, protect, and use personal information provided by you in accordance
            with applicable privacy laws.
          </Text>
          <Text style={styles.paragraph}>
            As part of our commitment to responsibility, safety, safeguard, and process your Personal Data,
            we regularly review our policies, procedures, and processes. We retain the right to amend this Privacy
            Policy at our discretion by posting a revised version on the Website. Although we make reasonable
            efforts to run updates to our Privacy Policy, your continued use of the Website, the Apps, or the
            Services following such changes will constitute your agreement to be bound by the revised Privacy
            Policy.
          </Text>
          <Text style={styles.paragraph}>
            When registering with our Services, we collect various information about and from you, your devices,
            and your interactions with our Services. Some of this information directly identifies your account
            or can be combined with other personal data to identify you, while other data is anonymous and used
            collectively to improve Platform performance.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(40),
  },
  textBlock: {
    flex: 1,
  },
  docTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  docSubtitle: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(20),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  paragraph: {
    fontSize: scale(12),
    color: '#4F5E7B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
    marginBottom: scale(12),
  },
});
