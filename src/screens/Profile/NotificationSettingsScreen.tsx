import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [emailUpdates, setEmailUpdates] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [promotionalOffers, setPromotionalOffers] = useState(false);

  return (
    <View style={styles.container}>
      <SubHeader title="Notifications" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {/* Email Updates */}
          <View style={styles.settingRow}>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Email Updates</Text>
              <Text style={styles.descText}>
                Stay informed about the latest news and updates delivered straight to your inbox.
              </Text>
            </View>
            <Switch
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              trackColor={{ false: '#D1D1D6', true: '#94C23C' }}
              thumbColor={emailUpdates ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* Push Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Push Notifications</Text>
              <Text style={styles.descText}>
                Get instant alerts for test results and feedback.
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#D1D1D6', true: '#94C23C' }}
              thumbColor={pushNotifications ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* Promotional Offers */}
          <View style={styles.settingRow}>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Promotional Offers</Text>
              <Text style={styles.descText}>
                Stay updated on discounts and new VIP features.
              </Text>
            </View>
            <Switch
              value={promotionalOffers}
              onValueChange={setPromotionalOffers}
              trackColor={{ false: '#D1D1D6', true: '#94C23C' }}
              thumbColor={promotionalOffers ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
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
  settingRow: {
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
  textContainer: {
    flex: 1,
    marginRight: scale(16),
  },
  titleText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  descText: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(15),
  },
});
