import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Linking,
  RefreshControl,
} from 'react-native';
import { PdfFileIcon, EmptyFileIcon } from '../../components/atoms/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { PdfListSkeleton } from '../../components/atoms/Skeleton';
import apiClient from '../../services/apiClient';
import { colors } from '../../theme/colors';
import { useToast } from '../../context/ToastContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Types ────────────────────────────────────────────────────────────────────

type PdfListRouteProp = RouteProp<RootStackParamList, 'PdfList'>;

interface PdfItem {
  id: number | string;
  title: string;
  subtitle?: string;
  fileUrl?: string;
  raw: any;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export const PdfListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PdfListRouteProp>();
  const { showToast } = useToast();

  const { title, endpoint, pdfBasePath } = route.params;

  const [items, setItems] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Parse PDF items from various API response shapes ──────────────────────
  const parseItems = (rawData: any): PdfItem[] => {
    let list: any[] = [];

    if (Array.isArray(rawData)) {
      list = rawData;
    } else if (Array.isArray(rawData?.data)) {
      list = rawData.data;
    } else if (Array.isArray(rawData?.list)) {
      list = rawData.list;
    } else if (Array.isArray(rawData?.result)) {
      list = rawData.result;
    } else if (Array.isArray(rawData?.templates)) {
      list = rawData.templates;
    } else if (Array.isArray(rawData?.predictions)) {
      list = rawData.predictions;
    }

    return list.map((item, index) => {
      const id = item?.id ?? item?._id ?? `pdf-${index}`;

      const itemTitle =
        item?.title ??
        item?.name ??
        item?.question_title ??
        item?.template_title ??
        item?.file_name ??
        `File ${index + 1}`;

      // Prefer real human-readable fields. Skip anything that's purely
      // numeric (e.g. backend `type: 2` is a category id, not user copy)
      // and only use `category`/`type` as a last resort when they're text.
      const isMeaningful = (v: any): v is string =>
        typeof v === 'string' && v.trim().length > 0 && !/^\d+(\.\d+)?$/.test(v.trim());
      const dateLike =
        item?.date ??
        item?.month_year ??
        item?.created_at ??
        item?.upload_date ??
        item?.published_at;
      const formattedDate = (() => {
        if (!dateLike) return undefined;
        if (typeof dateLike === 'string' && !isMeaningful(dateLike)) return undefined;
        const d = new Date(dateLike);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
        return typeof dateLike === 'string' ? dateLike : undefined;
      })();
      const subtitle =
        (isMeaningful(item?.description) && item.description) ||
        (isMeaningful(item?.subtitle) && item.subtitle) ||
        formattedDate ||
        (isMeaningful(item?.category) && item.category) ||
        (isMeaningful(item?.type) && item.type) ||
        undefined;

      // Build full PDF URL
      const rawFile =
        item?.file ??
        item?.pdf ??
        item?.file_url ??
        item?.pdf_url ??
        item?.url ??
        '';
      const fileUrl =
        rawFile && pdfBasePath
          ? rawFile.startsWith('http')
            ? rawFile
            : `${pdfBasePath}/${rawFile.replace(/^\//, '')}`
          : rawFile || undefined;

      return { id, title: itemTitle, subtitle, fileUrl, raw: item };
    });
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const res = await apiClient.get(endpoint);
      const rawData = res.data?.data ?? res.data ?? {};
      const parsed = parseItems(rawData);
      setItems(parsed);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleOpen = (item: PdfItem, action: 'view' | 'download') => {
    if (!item.fileUrl) {
      showToast('No file available', 'error');
      return;
    }
    // Both actions delegate to the OS — Linking.openURL opens the PDF in the
    // system viewer (iOS) or browser/PDF viewer (Android), which lets the user
    // save or share from there. We don't have a native download lib installed.
    Linking.openURL(item.fileUrl).catch(() =>
      showToast(
        action === 'view' ? 'Could not open file' : 'Could not download file',
        'error',
      ),
    );
  };

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: PdfItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.iconBox}>
        <PdfFileIcon size={scale(22)} />
      </View>
      <View style={styles.itemTextBox}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleOpen(item, 'view')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.actionLink}>View</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            onPress={() => handleOpen(item, 'download')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.actionLink}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SubHeader title={title} onBack={() => navigation.goBack()} />

      {loading ? (
        <PdfListSkeleton count={5} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyFileIcon size={scale(48)} />
              <Text style={styles.emptyText}>No files available</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(32),
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: scale(10),
  },
  iconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  itemTextBox: {
    flex: 1,
    marginRight: scale(10),
  },
  itemTitle: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1C1F2A',
    lineHeight: scale(18),
    marginBottom: scale(3),
  },
  itemSubtitle: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    marginBottom: scale(8),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(2),
  },
  actionLink: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  actionDivider: {
    width: 1,
    height: scale(12),
    backgroundColor: '#E5E5EA',
    marginHorizontal: scale(12),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(80),
    gap: scale(12),
  },
  emptyText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
});
