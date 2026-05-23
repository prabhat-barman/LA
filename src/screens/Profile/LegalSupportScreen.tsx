import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { ChevronRightIcon } from '../../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const LegalSupportScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const menuOptions = [
    {
      id: 'TermsConditions',
      title: 'Terms & Conditions',
      subtitle: 'Last updated 24th March 2026',
      onPress: () => navigation.navigate('TermsConditions'),
    },
    {
      id: 'PrivacyPolicy',
      title: 'Privacy Policy',
      subtitle: 'Last updated 24th March 2026',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      id: 'RefundPolicy',
      title: 'Refund Policy',
      subtitle: 'Last updated 24th March 2026',
      onPress: () => navigation.navigate('RefundPolicy'),
    },
    {
      id: 'FAQ',
      title: 'FAQs',
      subtitle: 'Frequently asked questions',
      onPress: () => navigation.navigate('FAQ'),
    },
  ];

  return (
    <View style={styles.container}>
      <SubHeader title="Legal & Support" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {menuOptions.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuCard} onPress={item.onPress}>
              <View style={styles.cardLeft}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.subtitleText}>{item.subtitle}</Text>
              </View>
              <ChevronRightIcon size={scale(14)} />
            </TouchableOpacity>
          ))}
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
    paddingBottom: scale(20),
  },
  listContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  cardLeft: {
    flex: 1,
  },
  titleText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  subtitleText: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
