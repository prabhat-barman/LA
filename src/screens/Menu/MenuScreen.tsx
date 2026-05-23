import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Header } from '../../components/organisms/Header';
import { colors } from '../../theme/colors';
import { useDashboardData } from '../../context/DashboardDataContext';
import { getPdfPath } from '../../config/appVariantConfig';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { API_ENDPOINTS } from '../../config/apiConfig';
import {
  CalendarIcon,
  HeartDocIcon,
  QuestionDocIcon,
  TargetIcon,
  LaptopIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  HeadphonesIcon,
  StarOutlineIcon,
} from '../../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Types ─────────────────────────────────────────────────────────────────────

type MenuAction =
  | { type: 'navigate'; screen: keyof RootStackParamList; params?: any }
  | { type: 'pdfList'; title: string; endpoint: string }
  | { type: 'toast'; message: string };

interface MenuItem {
  id: number;
  title: string;
  subtitle: string;
  iconBg: string;
  color: string;
  icon: (color: string) => React.ReactNode;
  action: MenuAction;
  section?: 'main' | 'support';
}

interface MenuScreenProps {
  dashboardData: any;
  hasNotifications: boolean;
  profileImage: string;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const MenuScreen: React.FC<Partial<MenuScreenProps>> = (props) => {
  const contextData = useDashboardData();
  const toastContext = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dashboardData = props.dashboardData !== undefined ? props.dashboardData : contextData.dashboardData;
  const hasNotifications = props.hasNotifications !== undefined ? props.hasNotifications : contextData.hasNotifications;
  const showToast = props.showToast !== undefined ? props.showToast : toastContext.showToast;

  const getProfileImage = () => {
    if (props.profileImage !== undefined) return props.profileImage;
    const photoPath = dashboardData?.image || dashboardData?.user?.image;
    if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    }
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = getPdfPath();
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `${baseUrl}${separator}${cleanPath}`;
  };
  const profileImage = getProfileImage();
  const pdfBase = getPdfPath();

  const onNotificationPress = props.onNotificationPress || (() => navigation.navigate('NotificationsList'));
  const onProfilePress = props.onProfilePress || (() => navigation.navigate('Profile'));

  // ── Menu items ─────────────────────────────────────────────────────────────
  const mainItems: MenuItem[] = [
    {
      id: 1,
      title: 'Monthly Prediction',
      subtitle: 'Upcoming test trends',
      iconBg: '#E5F1FF',
      color: '#007AFF',
      icon: (c) => <CalendarIcon color={c} />,
      action: { type: 'navigate', screen: 'MonthlyPrediction' },
    },
    {
      id: 2,
      title: 'Templates',
      subtitle: 'Writing & Speaking guides',
      iconBg: '#FFF0E5',
      color: '#FF9500',
      icon: (c) => <HeartDocIcon color={c} />,
      action: {
        type: 'pdfList',
        title: 'Templates',
        endpoint: `${API_ENDPOINTS.TEMPLATE_DATA}0`,
      },
    },
    {
      id: 3,
      title: 'Prediction Files',
      subtitle: 'Highly probability questions',
      iconBg: '#E5FFE5',
      color: '#34C759',
      icon: (c) => <QuestionDocIcon color={c} />,
      action: {
        type: 'pdfList',
        title: 'Prediction Files',
        endpoint: API_ENDPOINTS.PREDICTION_DATA,
      },
    },
    {
      id: 4,
      title: 'Daily Feedback',
      subtitle: 'Your performance history',
      iconBg: '#FFFFE5',
      color: '#FFCC00',
      icon: (c) => <TargetIcon color={c} />,
      action: { type: 'navigate', screen: 'DailyFeedback' },
    },
    {
      id: 5,
      title: 'Live Sessions',
      subtitle: 'Join interactive classes',
      iconBg: '#F8F3EE',
      color: '#A0522D',
      icon: (c) => <LaptopIcon color={c} />,
      action: { type: 'navigate', screen: 'LiveSessions' },
    },
  ];

  const supportItems: MenuItem[] = [
    {
      id: 10,
      title: 'Help & Resources',
      subtitle: 'Tips, guides & study material',
      iconBg: '#EEF4FF',
      color: '#5856D6',
      icon: (c) => <HelpCircleIcon size={scale(20)} color={c} />,
      action: {
        type: 'pdfList',
        title: 'Help & Resources',
        endpoint: API_ENDPOINTS.HELP_DATA,
      },
    },
    {
      id: 11,
      title: 'Contact Us',
      subtitle: 'Get in touch with our team',
      iconBg: '#E5F8FF',
      color: '#32ADE6',
      icon: (c) => <HeadphonesIcon size={scale(20)} color={c} />,
      action: { type: 'navigate', screen: 'ContactSupport' },
    },
    {
      id: 12,
      title: 'Feedback',
      subtitle: 'Rate & improve your experience',
      iconBg: '#FFF9E5',
      color: '#FF9500',
      icon: (c) => <StarOutlineIcon size={scale(20)} color={c} />,
      action: { type: 'navigate', screen: 'FAQ' },
    },
  ];

  // ── Handle press ──────────────────────────────────────────────────────────
  const handlePress = (item: MenuItem) => {
    const { action } = item;
    if (action.type === 'navigate') {
      navigation.navigate(action.screen as any, action.params);
    } else if (action.type === 'pdfList') {
      navigation.navigate('PdfList', {
        title: action.title,
        endpoint: action.endpoint,
        pdfBasePath: pdfBase,
      });
    } else {
      showToast(action.message, 'info');
    }
  };

  // ── Render single card ────────────────────────────────────────────────────
  const renderCard = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuCard}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
          {item.icon(item.color)}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{item.title}</Text>
          <Text style={styles.subtitleText}>{item.subtitle}</Text>
        </View>
      </View>
      <ChevronRightIcon size={scale(14)} color="#8E8E93" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header
        hasNotifications={hasNotifications}
        profileImage={profileImage}
        onNotificationPress={onNotificationPress}
        onProfilePress={onProfilePress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Main Section ── */}
        <View style={styles.menuContainer}>
          {mainItems.map(renderCard)}
        </View>

        {/* ── Support & Help Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
        </View>
        <View style={styles.menuContainer}>
          {supportItems.map(renderCard)}
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: scale(30) },
  menuContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(8),
  },
  sectionHeader: {
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(4),
  },
  sectionTitle: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  textContainer: { flex: 1 },
  titleText: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(2),
    fontFamily: 'BricolageGrotesque-Bold',
  },
  subtitleText: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
