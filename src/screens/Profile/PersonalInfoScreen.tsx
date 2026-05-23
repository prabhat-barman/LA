import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { useUser } from '../../context/UserContext';
import { useDashboardData } from '../../context/DashboardDataContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { getTierFromBackendSub } from '../../utils/subscriptionMapping';
import Data from '../../config/practiceData';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const PersonalInfoScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [imageError, setImageError] = useState(false);
  const { user, refreshUser } = useUser();
  const { dashboardData } = useDashboardData();

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

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
  const displayImageUri = imageError ? fallbackUri : profileImage;

  const fullName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
    : 'User';

  // Plan-driven membership chip — mirrors ProfileScreen behaviour.
  const activeSubscription = dashboardData?.active_subscription?.[0]
    ?? dashboardData?.user?.active_subscription?.[0]
    ?? null;
  const planTier = activeSubscription ? getTierFromBackendSub(activeSubscription) : null;
  const planTitle: string = activeSubscription?.plan?.title?.toString().trim() || '';
  const badgeText = planTitle
    ? `${planTitle.toUpperCase()} MEMBER`
    : planTier
      ? `${planTier.toUpperCase()} MEMBER`
      : 'FREE USER';
  const badgeColor = planTier === 'Gold' ? '#FFB300' : planTier === 'Silver' ? '#94C23C' : '#8E8E93';
  const badgeBg = planTier === 'Gold' ? '#FFF7E6' : planTier === 'Silver' ? '#E6F4EA' : '#F2F2F7';

  const getScoreLabel = () => {
    const scoreVal = String(user?.score || '79+');
    const matched = Data.selectDesiredScoreWhole.find(
      item => item.value === scoreVal || item.pte_overall === scoreVal
    );
    return matched ? matched.label : scoreVal;
  };

  // Pull dob/timezone/etc. from the broader dashboard payload so we never
  // fall back to the hardcoded "October 1994" placeholder.
  const dashUser: any = dashboardData?.user ?? dashboardData ?? {};
  const tz =
    user?.timezone
    ?? dashUser?.user_timezone?.timezone
    ?? dashUser?.timezone
    ?? '—';
  const dob = (user as any)?.dob ?? dashUser?.dob ?? (user as any)?.birthdate ?? '—';
  const altEmailRaw: string | null = dashUser?.alternative_email ?? null;
  const altEmailVerified: boolean = dashUser?.is_alternative_email_verified === true;

  const details = [
    { label: 'EMAIL ADDRESS', value: user?.email || 'N/A' },
    { label: 'PHONE NUMBER', value: user?.phone || user?.phone_number || 'N/A' },
    { label: 'BIRTHDATE', value: dob },
    { label: 'LANGUAGE', value: user?.language || 'English - UK' },
    { label: 'TIMEZONE', value: tz },
    { label: 'DESIRED SCORE (BANDS)', value: getScoreLabel() },
    ...(altEmailRaw
      ? [{
          label: 'ALTERNATIVE EMAIL',
          value: `${altEmailRaw}${altEmailVerified ? ' ✓ Verified' : ' · Not verified'}`,
        }]
      : []),
  ];

  return (
    <View style={styles.container}>
      <SubHeader title="Personal Information" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card with Edit Button */}
        <View style={styles.profileHeaderCard}>
          <Image
            source={{ uri: displayImageUri }}
            onError={() => setImageError(true)}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.nameText}>{fullName}</Text>
            <View style={[styles.vipBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
              <Text style={[styles.vipText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Details List */}
        <View style={styles.detailsContainer}>
          {details.map((item, idx) => (
            <View key={idx} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  avatar: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    marginRight: scale(16),
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  vipBadge: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#94C23C',
    borderRadius: scale(12),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    alignSelf: 'flex-start',
  },
  vipText: {
    fontSize: scale(9),
    fontWeight: 'bold',
    color: '#94C23C',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  detailsContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  detailRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  detailLabel: {
    fontSize: scale(10),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
