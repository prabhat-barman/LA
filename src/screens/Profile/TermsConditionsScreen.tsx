import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const TermsConditionsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <SubHeader title="Terms & Conditions" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.textBlock}>
          <Text style={styles.docTitle}>Terms & Conditions</Text>
          <Text style={styles.docSubtitle}>Last updated 24th March 2026</Text>

          <Text style={styles.sectionTitle}>1. Introduction & Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            These Terms and Conditions, together with our Privacy Policy, are collectively referred
            to as the "Terms". They govern your access to and use of the website(languageacademy.com.au)
            and any associated mobile applications (the "Platform"), operated by Language Academy Australia Pty Ltd
            ("Language Academy", "We", "Us", "Our" or "the Company").
          </Text>
          <Text style={styles.paragraph}>
            By accessing or using the Platform in any capacity – including browsing, viewing,
            registering an account, or purchasing a subscription – you affirmatively agree to be bound by these
            Terms. If you do not agree, please discontinue use of the Platform immediately.
          </Text>

          <Text style={styles.sectionTitle}>2. Amendments to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to amend these Terms at any time. Updated terms will be published on the Website and
            will supersede previous versions. We will run reasonable notifications of changes. Your continued use of the
            Platform after any amendments take effect constitutes your acceptance of the revised Terms.
          </Text>

          <Text style={styles.sectionTitle}>3. User Representations and Warranties</Text>
          <Text style={styles.paragraph}>
            When registering an account or conducting any transaction on the Platform, you warrant that:
            {"\n"}• You are using your actual identity.
            {"\n"}• All personal information you provide is true, accurate, complete, and current.
            {"\n"}• You will promptly update your personal information to maintain its accuracy.
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
