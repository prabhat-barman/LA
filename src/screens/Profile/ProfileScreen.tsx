import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import {
  UserProfileIcon,
  LockIcon,
  BellIcon,
  CardIcon,
  FileTextIcon,
  ChatBubbleIcon,
  MicSolidIcon,
  ChevronRightIcon,
  LogOutIcon,
  TrashIcon,
} from '../../components/atoms/Icon';
import { getItem, removeItem } from '../../utils/secureStorage';
import { useUser } from '../../context/UserContext';
import { useDashboardData } from '../../context/DashboardDataContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { persistBackendActiveSubscription } from '../../utils/subscriptionValidator';
import { getTierFromBackendSub } from '../../utils/subscriptionMapping';
import apiClient from '../../services/apiClient';
import { logger } from '../../services/logger';
import { API_ENDPOINTS } from '../../config/apiConfig';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, refreshUser, clearUser } = useUser();
  const { dashboardData } = useDashboardData();

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const clearAuthArtifacts = async () => {
    await removeItem('user_token');
    await removeItem('user_data');
    await removeItem('dashboard_data_cache');
    await removeItem('timezone_synced');
    // Force push-token re-registration on next login (fcm_device_token itself
    // is device-scoped and intentionally kept).
    await removeItem('device_token_registered');
    await persistBackendActiveSubscription(null);
  };

  // Best-effort: tell the backend to drop this device's push token while we
  // still have a valid JWT. Silent on failure — local logout proceeds either way.
  const tryDeregisterDeviceToken = async () => {
    try {
      const deviceToken = await getItem('fcm_device_token');
      if (!deviceToken) return;
      await apiClient.delete(API_ENDPOINTS.DEVICE_TOKEN, {
        data: {
          device_token: deviceToken,
          device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        },
      });
    } catch (err) {
      logger.warn('Silent device-token deregister failed:', err);
    }
  };

  // Best-effort: invalidate the JWT on the server (standard Laravel JWT logout).
  // Silent on failure — we always log out locally regardless.
  const tryServerLogout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } catch (err) {
      logger.warn('Silent server logout failed:', err);
    }
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    // Order matters: deregister push token first (still authenticated), then
    // call /logout which invalidates the JWT, then wipe local state.
    await tryDeregisterDeviceToken();
    await tryServerLogout();
    await clearAuthArtifacts();
    await clearUser();
    navigation.replace('SignIn');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(API_ENDPOINTS.USER_PROFILE_DELETE);
    } catch (err) {
      // Even if API fails, clear local data and sign out
      logger.warn('Delete account API error:', err);
    } finally {
      await clearAuthArtifacts();
      await clearUser();
      setDeleting(false);
      setDeleteModalVisible(false);
      navigation.replace('SignIn');
    }
  };

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
  const emailAddress = user?.email || '';

  // Plan-driven membership badge (defaults to FREE if no active backend subscription).
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

  // Real stats from dashboard (with safe fallbacks to "—" rather than fake numbers).
  const attempted = dashboardData?.user_attempted_questions
    ?? dashboardData?.user?.user_attempted_questions
    ?? {};
  const overallScore = dashboardData?.score
    ?? dashboardData?.user?.score
    ?? '—';
  const totalMocks = attempted?.total_mock_practiced ?? '—';
  const totalQuestions = attempted?.total_ques_practiced ?? '—';

  const menuOptions = [
    {
      id: 'PersonalInfo',
      title: 'Personal Information',
      subtitle: 'View, edit your phone number',
      icon: <UserProfileIcon />,
      onPress: () => navigation.navigate('PersonalInfo'),
    },
    {
      id: 'ChangePassword',
      title: 'Change Password',
      subtitle: 'Update your account password and security',
      icon: <LockIcon />,
      onPress: () => navigation.navigate('ChangePassword'),
    },
    {
      id: 'Notifications',
      title: 'Notifications',
      subtitle: 'Manage your email/push notifications',
      icon: <BellIcon size={scale(20)} color="#FF3B30" />,
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      id: 'Subscription',
      title: 'Subscription',
      subtitle: 'Manage your plans and status',
      icon: <CardIcon />,
      onPress: () => navigation.navigate('Subscription'),
    },
    {
      id: 'LegalSupport',
      title: 'Legal & Support',
      subtitle: 'View our terms, privacy, policy',
      icon: <FileTextIcon />,
      onPress: () => navigation.navigate('LegalSupport'),
    },
    {
      id: 'ContactSupport',
      title: 'Contact Support',
      subtitle: 'Contact support for help and feedback',
      icon: <ChatBubbleIcon />,
      onPress: () => navigation.navigate('ContactSupport'),
    },
    {
      id: 'MicrophoneSetup',
      title: 'Microphone Setup',
      subtitle: 'Configure and test microphone input',
      icon: <MicSolidIcon />,
      onPress: () => navigation.navigate('MicrophoneSetup'),
    },
    {
      id: 'LogOut',
      title: 'Log Out',
      subtitle: 'Sign out of your account safely',
      icon: <LogOutIcon />,
      onPress: () => setLogoutModalVisible(true),
    },
  ];

  return (
    <View style={styles.container}>
      <SubHeader title="My Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: displayImageUri }}
            onError={() => setImageError(true)}
            style={styles.avatar}
          />
          <Text style={styles.nameText}>{fullName}</Text>
          {emailAddress ? <Text style={styles.emailText}>{emailAddress}</Text> : null}

          <View style={[styles.vipBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
            <Text style={[styles.vipText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: '#F0F9FF' }]}>
            <Text style={[styles.statVal, { color: '#007AFF' }]}>{overallScore}</Text>
            <Text style={styles.statLabel}>Overall Score</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statVal, { color: '#34C759' }]}>{totalMocks}</Text>
            <Text style={styles.statLabel}>Total Mock</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FAF5FF' }]}>
            <Text style={[styles.statVal, { color: '#AF52DE' }]}>{totalQuestions}</Text>
            <Text style={styles.statLabel}>Test Taken</Text>
          </View>
        </View>

        {/* Menu Options Section */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionHeader}>ACCOUNT SETTINGS</Text>
          {menuOptions.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconWrapper}>{item.icon}</View>
                <View style={styles.textWrapper}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <ChevronRightIcon size={scale(14)} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account button */}
        <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.deleteButtonText}>DELETE & DEACTIVATE ACCOUNT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Modal Dialog */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.trashCircle}>
              <TrashIcon size={scale(24)} />
            </View>

            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              This action is permanent and cannot be undone. All your progress, test results and
              personal data will be wiped from our servers.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>No, Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, deleting && { opacity: 0.7 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.confirmBtnText}>{deleting ? 'Deleting...' : 'Yes, Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Modal Dialog */}
      <Modal
        visible={logoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.trashCircle, { backgroundColor: '#FFE5E5' }]}>
              <LogOutIcon size={scale(24)} color="#FF3B30" />
            </View>

            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out of your account?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#FF3B30' }]}
                onPress={handleLogout}
              >
                <Text style={styles.confirmBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: scale(40),
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    borderColor: '#F2F2F7',
    marginBottom: scale(12),
  },
  nameText: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  emailText: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: scale(12),
  },
  vipBadge: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#94C23C',
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
  },
  vipText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#94C23C',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  statBox: {
    flex: 1,
    marginHorizontal: scale(4),
    borderRadius: scale(12),
    paddingVertical: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  statVal: {
    fontSize: scale(16),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
  },
  statLabel: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  menuContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(24),
  },
  sectionHeader: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(12),
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
  },
  optionSubtitle: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  deleteButton: {
    marginTop: scale(24),
    marginHorizontal: scale(16),
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FFB3B3',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#FF3B30',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  trashCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(8),
  },
  modalText: {
    fontSize: scale(13),
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
    marginBottom: scale(20),
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(8),
    paddingVertical: scale(10),
    alignItems: 'center',
    marginRight: scale(8),
  },
  cancelBtnText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: scale(8),
    paddingVertical: scale(10),
    alignItems: 'center',
    marginLeft: scale(8),
  },
  confirmBtnText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
