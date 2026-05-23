import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const RefundPolicyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <SubHeader title="Refund Policy" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.textBlock}>
          <Text style={styles.docTitle}>Refund Policy</Text>
          <Text style={styles.docSubtitle}>Last updated 24th March 2026</Text>

          <Text style={styles.sectionTitle}>Refund Policy</Text>
          <Text style={styles.paragraph}>
            We stand behind our Platform, but we understand that things happen. We offer refunds only
            in limited circumstances. Merely changing your mind or choosing not to use a subscription is not
            considered a valid reason for refund.
          </Text>
          <Text style={styles.paragraph}>
            A refund request must be submitted within 24 hours of purchase by sending an email with all
            the details and transaction logs to support@languageacademy.com.au.
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
