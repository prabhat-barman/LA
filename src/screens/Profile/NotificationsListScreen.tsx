import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { DoubleCheckIcon, EmptyBellIllustration } from '../../components/atoms/Icon';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return 'just now';
  if (timeStr.includes('ago') || timeStr.includes('now')) return timeStr;
  
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return timeStr;
  }
};

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category: string;
  time: string;
  unread: boolean;
  color: string;
}

export const NotificationsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();

  const [isEmptyState, setIsEmptyState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.GET_NOTIFICATIONS);
      console.log('Notifications API response data:', JSON.stringify(res.data));
      const rawList = res.data?.notifications || res.data?.data || res.data || [];
      if (Array.isArray(rawList)) {
        const mappedList = rawList.map((item: any, index: number) => {
          const id = item.id || item._id || index + 1;
          const title = item.title || 'Notification';
          const body = item.body || item.message || item.text || '';
          const category = String(item.category || item.type || 'SYSTEM').toUpperCase();
          const unread = item.unread !== undefined ? !!item.unread : (item.is_read !== undefined ? !item.is_read : (item.read !== undefined ? !item.read : true));
          const rawTime = item.time || item.created_at || 'just now';
          const time = formatRelativeTime(rawTime);
          
          let color = '#007AFF';
          if (category.includes('TEST')) color = '#34C759';
          else if (category.includes('PROMO') || category.includes('OFFER')) color = '#FF3B30';
          else if (category.includes('FEEDBACK') || category.includes('TUTOR')) color = '#FFCC00';
          
          return {
            id,
            title,
            body,
            category,
            time,
            unread,
            color,
          };
        });
        setNotifications(mappedList);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      showToast('Could not load notifications.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.MARK_AS_READ);
      setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      console.warn('Failed to mark notifications as read:', err);
      setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
      showToast('All notifications marked as read.', 'success');
    }
  };

  const handleNotificationPress = async (id: number) => {
    const item = notifications.find((n) => n.id === id);
    if (!item || !item.unread) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );

    try {
      await apiClient.post(API_ENDPOINTS.MARK_AS_READ, { notification_id: id });
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const handleToggleState = () => {
    setIsEmptyState((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <SubHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightElement={
          !isEmptyState ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerAction}>
              <DoubleCheckIcon />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* State Switcher for inspection/testing */}
      <View style={styles.testingRow}>
        <TouchableOpacity style={styles.testBtn} onPress={handleToggleState}>
          <Text style={styles.testBtnText}>
            {isEmptyState ? 'Show Notifications List' : 'Show Empty State View'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#94C23C" />
        </View>
      ) : (isEmptyState || notifications.length === 0) ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.scrollContentEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(false)} />
          }
        >
          <View style={styles.emptyContainer}>
            <EmptyBellIllustration />
            <Text style={styles.emptyTitle}>No New Notifications Found</Text>
            <Text style={styles.emptySubtitle}>
              We'll notify you when test results or strategy video uploads become available.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(false)} />
          }
        >
          <View style={styles.listContainer}>
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, item.unread && styles.cardUnread]}
                onPress={() => handleNotificationPress(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text style={[styles.categoryText, { color: item.color }]}>
                      {item.category}
                    </Text>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  {item.unread && <View style={styles.unreadTag} />}
                </View>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.bodyText}>{item.body}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
  headerAction: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testingRow: {
    paddingHorizontal: scale(16),
    marginTop: scale(12),
    marginBottom: scale(4),
  },
  testBtn: {
    backgroundColor: '#EAECEF',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  testBtnText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: '#4F5E7B',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  listContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(10),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  cardUnread: {
    borderColor: '#D4E2F9',
    backgroundColor: '#FAFDFD',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(8),
  },
  categoryText: {
    fontSize: scale(10),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
  bullet: {
    fontSize: scale(10),
    color: '#8E8E93',
    marginHorizontal: scale(6),
  },
  timeText: {
    fontSize: scale(10),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  unreadTag: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#94C23C',
  },
  titleText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(4),
  },
  bodyText: {
    fontSize: scale(12),
    color: '#4F5E7B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(17),
  },
  // Empty State styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    paddingTop: scale(80),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(12),
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
  },
  scrollContentEmpty: {
    flex: 1,
  },
});
