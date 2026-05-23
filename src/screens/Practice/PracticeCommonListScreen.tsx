import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  CaretDownIcon,
  SearchIcon,
  FilterIcon,
  TagIcon,
  ChevronRightIcon,
  CheckIcon,
} from '../../components/atoms/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { SubHeader } from '../../components/molecules/SubHeader';
import { PracticeCommonListSkeleton } from '../../components/atoms/Skeleton';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { isPteCore } from '../../config/appVariantConfig';
import { useToast } from '../../context/ToastContext';
import { tagColorStore } from '../../utils/tagColorStore';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Tab Config ───────────────────────────────────────────────────────────────

type TabName = 'All' | 'Prediction' | 'Exam Ques';

const TABS: TabName[] = ['All', 'Prediction', 'Exam Ques'];

// Tab → API params mapping (same as Softude app)
const TAB_PARAMS: Record<TabName, { prediction: number; type: number }> = {
  'All':        { prediction: 0, type: 1 },
  'Prediction': { prediction: 1, type: 2 },
  'Exam Ques':  { prediction: 2, type: 3 },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiSubcategory {
  id: number;
  title: string;
  pte_core_title?: string;
  category: string;
  total_questions?: number;
  attempted?: number;
}

interface QuestionItem {
  id: number | string;
  title: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
  isNew: boolean;
  isTagged?: boolean;
  tagColor?: TagColor;
  raw: any;
}

// ── Coloured Tagging ─────────────────────────────────────────────────────────
// Matches the picker on PracticeQuestionDetailScreen so both screens stay in sync.
type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';

const TAG_COLOR_HEX: Record<Exclude<TagColor, 'none'>, string> = {
  grey: '#8E8E93',
  red: '#FF3B30',
  green: '#94C23C',
  yellow: '#FFCC00',
};

const TAG_PICKER_OPTIONS: ReadonlyArray<{ key: Exclude<TagColor, 'none'>; label: string }> = [
  { key: 'grey', label: 'Grey' },
  { key: 'red', label: 'Red' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
];

// Accept a tag colour from the backend in any reasonable shape. The canonical
// list/detail response carries it as an array of relations, e.g.
//   "tag": [{ "id": 586274, "tag": "green", ... }]
// We also handle a few other shapes defensively so older endpoints keep working.
const VALID_TAG_COLORS = ['grey', 'red', 'green', 'yellow'] as const;

const pickColorString = (value: unknown): TagColor | null => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if ((VALID_TAG_COLORS as ReadonlyArray<string>).includes(v)) {
    return v as TagColor;
  }
  return null;
};

export const parseTagColor = (raw: any): TagColor => {
  // 1. Canonical shape: `tag` is an array of relations from the backend.
  //    Pick the most recent entry (last one) and read its inner `tag` field.
  if (Array.isArray(raw?.tag) && raw.tag.length > 0) {
    const last = raw.tag[raw.tag.length - 1];
    const matched = pickColorString(last?.tag) || pickColorString(last?.color);
    if (matched) return matched;
  }

  // 2. Various flat fields that may carry the colour name directly.
  const candidates: unknown[] = [
    raw?.tag_color,
    raw?.tagColor,
    raw?.tag_colour,
    raw?.tagColour,
    raw?.bookmark_color,
    raw?.bookmarkColor,
    raw?.color,
    raw?.tag, // some backends overload `tag` with the colour name itself.
  ];
  for (const c of candidates) {
    const matched = pickColorString(c);
    if (matched) return matched;
  }

  // 3. Legacy: boolean / 0-1 flag means "tagged" → show as green by default.
  const legacy =
    raw?.is_tagged === true ||
    raw?.is_tagged === 1 ||
    raw?.is_tagged === '1' ||
    raw?.isTagged === true ||
    raw?.isTagged === 1 ||
    raw?.isTagged === '1' ||
    raw?.tag === 1 ||
    raw?.tag === '1' ||
    raw?.tag === true ||
    raw?.bookmarked === true ||
    raw?.bookmarked === 1 ||
    raw?.bookmarked === '1';
  return legacy ? 'green' : 'none';
};

type PracticeCommonListRouteProp = RouteProp<RootStackParamList, 'PracticeCommonList'>;

// ── Tab Bar Component ─────────────────────────────────────────────────────────

interface TabBarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => (
  <View style={styles.tabBarContainer}>
    {TABS.map((tab) => {
      const isActive = tab === activeTab;
      return (
        <TouchableOpacity
          key={tab}
          style={[styles.tabItem, isActive && styles.tabItemActive]}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
            {tab}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────

export const PracticeCommonListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PracticeCommonListRouteProp>();
  const { showToast } = useToast();

  const { categoryId, categoryName, parentCategory } = route.params;

  // Active subcategory
  const [activeCategoryId, setActiveCategoryId] = useState<number>(categoryId);
  const [activeCategoryName, setActiveCategoryName] = useState<string>(categoryName);

  // Subcategories dropdown
  const [subcategories, setSubcategories] = useState<ApiSubcategory[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabName>('All');

  // ── Questions state ───────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Tracks the picked colour for every question by id. Items with no colour
  // (or `none`) are simply absent from the map. Mirrored from `tagColorStore`
  // so changes made on the detail screen are reflected here automatically.
  const [tagColorById, setTagColorById] = useState<Map<string | number, Exclude<TagColor, 'none'>>>(
    () => tagColorStore.snapshot(),
  );
  const [taggingId, setTaggingId] = useState<string | number | null>(null);
  // Which item's colour picker is currently open. `null` = none.
  const [pickerForId, setPickerForId] = useState<string | number | null>(null);

  // Subscribe to the shared store so list ↔ detail stay in sync without
  // requiring a network refresh when the user goes back from the detail page.
  useEffect(() => {
    const unsubscribe = tagColorStore.subscribe(() => {
      setTagColorById(tagColorStore.snapshot());
    });
    return unsubscribe;
  }, []);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  // `totalPages` value isn't read in the render path right now — only the
  // setter is used to drive `hasMoreData`. Prefix with `_` to satisfy the
  // linter without losing the calculation.
  const [, setTotalPages] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [isLoadMore, setIsLoadMore] = useState(false);

  // Refs to avoid stale closures
  const currentRequestRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoreDataRef = useRef(false);
  const isLoadMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const loadingRef = useRef(loading);
  const refreshingRef = useRef(refreshing);

  const isCore = isPteCore();

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadingRef.current = loading;
    refreshingRef.current = refreshing;
    hasMoreDataRef.current = hasMoreData;
    isLoadMoreRef.current = isLoadMore;
    currentPageRef.current = currentPage;
  }, [loading, refreshing, hasMoreData, isLoadMore, currentPage]);

  // ── Fetch Subcategories ───────────────────────────────────────────────────
  const fetchSubcategories = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
      const raw = res.data?.data ?? res.data ?? {};
      const flatSubs: ApiSubcategory[] = raw.subcategories ?? [];
      const filtered = flatSubs.filter((s) => s.category === parentCategory);
      setSubcategories(filtered);
    } catch (err) {
      console.warn('Failed to load categories', err);
    }
  }, [parentCategory]);

  // ── Parse question items from raw API response ────────────────────────────
  const parseQuestion = (item: any, index: number): QuestionItem => {
    const id = item?.id ?? item?._id ?? `q-${index}`;
    const title =
      item?.q_title ??
      item?.title ??
      item?.question_title ??
      item?.name ??
      item?.question ??
      item?.text ??
      `Question ${index + 1}`;

    let difficulty = 'BEGINNER';
    const rawDiff = String(item?.difficulty ?? item?.level ?? item?.difficulty_level ?? '').toUpperCase();
    if (rawDiff.includes('ADV') || rawDiff.includes('HIGH') || rawDiff === '3') {
      difficulty = 'ADVANCED';
    } else if (rawDiff.includes('INT') || rawDiff.includes('MED') || rawDiff === '2') {
      difficulty = 'INTERMEDIATE';
    } else if (rawDiff.includes('BEG') || rawDiff.includes('LOW') || rawDiff === '1') {
      difficulty = 'BEGINNER';
    }

    const isNew =
      item?.is_new === true ||
      item?.is_new === 1 ||
      item?.is_new === '1' ||
      String(item?.is_new).toLowerCase() === 'true' ||
      item?.isNew === true ||
      item?.isNew === 1 ||
      item?.isNew === '1' ||
      String(item?.isNew).toLowerCase() === 'true' ||
      item?.status === 'new' ||
      item?.status === 'NEW' ||
      item?.attempt_count === 0 ||
      item?.attempt_count === '0' ||
      false;

    const tagColor = parseTagColor(item);

    return { id, title, difficulty, isNew, tagColor, raw: item };
  };

  // ── Fetch Questions ───────────────────────────────────────────────────────
  const fetchQuestions = useCallback(
    async (page: number = 1, shouldAppend: boolean = false) => {
      const requestId = Date.now();
      currentRequestRef.current = requestId;

      if (!shouldAppend) {
        setLoading(true);
        if (page === 1) setQuestions([]);
      }

      try {
        const { prediction, type } = TAB_PARAMS[activeTab];

        const queryParams = {
          prediction,
          type,
          count: 20,
          list: 1,
          practice: true,
          page,
          search: searchQuery.trim() || undefined,
          orderby: 'desc',
        };

        const res = await apiClient.get(
          `${API_ENDPOINTS.LIST_QUESTION}/${activeCategoryId}`,
          { params: queryParams },
        );

        // Request still valid?
        if (currentRequestRef.current !== requestId) return;

        // The backend wraps the items array under `data` alongside a
        // top-level `total` count, e.g. `{ data: [...], total: 1822 }`.
        // Keep the FULL response object around so we can extract pagination
        // metadata (total / count) from the wrapper — earlier we were
        // collapsing into the inner array and losing those fields, which
        // caused `hasMoreData` to be `false` after page 1.
        const responseData = res.data ?? {};
        let list: any[] = [];
        if (Array.isArray(responseData)) {
          list = responseData;
        } else if (Array.isArray(responseData.data)) {
          list = responseData.data;
        } else if (Array.isArray(responseData.questions)) {
          list = responseData.questions;
        } else if (responseData.data && Array.isArray(responseData.data.data)) {
          list = responseData.data.data;
        } else if (Array.isArray(responseData.result)) {
          list = responseData.result;
        }

        const parsed = list.map(parseQuestion);

        // Pagination metadata can live either on the wrapper (`total`) or,
        // on some endpoints, on a nested `meta` object — check both.
        const totalItems: number =
          responseData.total ??
          responseData.totalCount ??
          responseData.meta?.total ??
          list.length;
        const itemsPerPage: number =
          responseData.count ??
          responseData.per_page ??
          responseData.meta?.per_page ??
          20;
        const calcTotalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

        setQuestions((prev) => (shouldAppend ? [...prev, ...parsed] : parsed));
        // Seed/refresh the shared colour store from the latest API response.
        // The local `tagColorById` map mirrors the store via subscription.
        tagColorStore.seed(parsed.map(q => [q.id, q.tagColor ?? 'none']));
        setTotalPages(calcTotalPages);
        setHasMoreData(page < calcTotalPages);
        hasMoreDataRef.current = page < calcTotalPages;
      } catch (err: any) {
        if (currentRequestRef.current !== requestId) return;
        showToast(err?.message || 'Failed to load questions', 'error');
      } finally {
        if (currentRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          setIsLoadMore(false);
          isLoadMoreRef.current = false;
          currentRequestRef.current = null;
        }
      }
    },
    [activeCategoryId, activeTab, searchQuery, showToast],
  );

  // ── Reset pagination helper ───────────────────────────────────────────────
  const resetPagination = () => {
    setCurrentPage(1);
    setTotalPages(1);
    setHasMoreData(false);
    setIsLoadMore(false);
    hasMoreDataRef.current = false;
    isLoadMoreRef.current = false;
    currentPageRef.current = 1;
  };

  // ── Debounced re-fetch when tab / category / search changes ──────────────
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    currentRequestRef.current = null;

    resetPagination();

    debounceTimerRef.current = setTimeout(() => {
      fetchQuestions(1, false);
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, activeTab, searchQuery]);

  // Fetch subcategories once on mount / parentCategory change
  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTabChange = (tab: TabName) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    resetPagination();
    await fetchQuestions(1, false);
  };

  const handleLoadMore = useCallback(() => {
    if (loadingRef.current || isLoadMoreRef.current || !hasMoreDataRef.current) return;
    const nextPage = currentPageRef.current + 1;
    setIsLoadMore(true);
    isLoadMoreRef.current = true;
    setCurrentPage(nextPage);
    currentPageRef.current = nextPage;
    fetchQuestions(nextPage, true);
  }, [fetchQuestions]);

  const handleSubcategorySwitch = (sub: ApiSubcategory) => {
    setIsDropdownOpen(false);
    setActiveCategoryId(sub.id);
    setActiveCategoryName(isCore ? (sub.pte_core_title ?? sub.title) : sub.title);
  };

  const getDifficultyStyles = (diff: string) => {
    switch (diff) {
      case 'ADVANCED':    return { bg: '#EFEBFF', text: '#7F56D9' };
      case 'INTERMEDIATE': return { bg: '#E5F1FF', text: '#007AFF' };
      case 'BEGINNER':
      default:             return { bg: '#E2FBE9', text: '#34C759' };
    }
  };

  // Keep a ref to the latest `questions` so the stable `handleViewQuestion`
  // callback below always sees the freshest list — without it, the memoised
  // `renderItem` captures a stale closure and ends up navigating with an
  // empty `questionsList` (resulting in `open_ques=1` and wrong question data
  // on the detail screen).
  const questionsRef = useRef<QuestionItem[]>(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const handleViewQuestion = useCallback(
    (item: QuestionItem) => {
      const list = questionsRef.current;
      const idx = list.findIndex(q => q.id === item.id);
      navigation.navigate('PracticeQuestionDetail', {
        questionId: item.id,
        categoryId: activeCategoryId,
        categoryName: activeCategoryName,
        parentCategory: parentCategory,
        questionsList: list.map(q => ({
          id: q.id,
          title: q.title,
          difficulty: q.difficulty,
          isNew: q.isNew,
        })),
        initialIndex: idx >= 0 ? idx : 0,
      });
    },
    [navigation, activeCategoryId, activeCategoryName, parentCategory],
  );

  // Persist a colour change to the backend. Sends both the legacy `tag` (0/1)
  // flag and a `tag_color` field so older endpoints keep working.
  const persistTagColor = async (item: QuestionItem, next: TagColor) => {
    if (taggingId === item.id) return;
    const previous: TagColor = tagColorStore.get(item.id);
    // Optimistic update through the shared store (subscribers auto-sync).
    tagColorStore.set(item.id, next);
    setPickerForId(null);
    setTaggingId(item.id);
    try {
      const formData = new FormData();
      formData.append('question_id', String(item.id));
      // Backend stores the colour name directly in the `tag` column, so send it
      // as the colour string. For "untag", send "0" to mirror the legacy flag.
      formData.append('tag', next === 'none' ? '0' : next);
      // Extra field for endpoints that read a dedicated `tag_color`.
      formData.append('tag_color', next);
      await apiClient.post(API_ENDPOINTS.SET_TAG, formData);
      showToast(next === 'none' ? 'Tag removed' : `Tagged as ${next}`, 'info');
    } catch (err: any) {
      tagColorStore.set(item.id, previous);
      showToast(err?.response?.data?.message || 'Failed to update tag', 'error');
    } finally {
      setTaggingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: QuestionItem; index: number }) => {
      const diffStyle = getDifficultyStyles(item.difficulty);
      const currentColor = tagColorById.get(item.id);
      const tagIconColor = currentColor ? TAG_COLOR_HEX[currentColor] : '#8E8E93';
      return (
        <View style={styles.questionsCardWrapper}>
          <View style={styles.questionItemRow}>
            <View style={styles.questionLeft}>
              <Text style={styles.questionTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>#{item.id}</Text>
                </View>
                {item.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
                <View style={[styles.diffBadge, { backgroundColor: diffStyle.bg }]}>
                  <Text style={[styles.diffBadgeText, { color: diffStyle.text }]}>
                    {item.difficulty}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.tagWrapper}
                  onPress={() => setPickerForId(item.id)}
                  disabled={taggingId === item.id}
                >
                  <TagIcon color={tagIconColor} tagged={!!currentColor} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewQuestion(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewButtonText}>View</Text>
              <ChevronRightIcon size={scale(12)} color="#94C23C" strokeWidth={3} />
            </TouchableOpacity>
          </View>
          <View style={styles.separator} />
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagColorById, taggingId, handleViewQuestion],
  );

  // The question currently being tagged (for the modal's context).
  const pickerItem = pickerForId != null ? questions.find(q => q.id === pickerForId) ?? null : null;
  const pickerCurrentColor: TagColor = pickerItem ? (tagColorById.get(pickerItem.id) ?? 'none') : 'none';

  const isInitialLoading = loading && questions.length === 0;

  return (
    <View style={styles.container}>
      <SubHeader title={parentCategory} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* ── Subcategory Dropdown ── */}
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setIsDropdownOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownText}>{activeCategoryName}</Text>
          <CaretDownIcon size={scale(16)} color="#1C1C1E" />
        </TouchableOpacity>

        {/* ── Tab Bar ── */}
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ── Search & Filter Row ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <View style={styles.searchIconWrapper}>
              <SearchIcon />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title or ID..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <FilterIcon />
          </TouchableOpacity>
        </View>

        {/* ── Question List ── */}
        {isInitialLoading ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.questionsCardContainer}>
              <PracticeCommonListSkeleton count={6} />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={questions}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No questions found.</Text>
                  </View>
                ) : null
              }
              ListFooterComponent={
                isLoadMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#94C23C" />
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </View>

      {/* ── Tag Colour Picker Modal ── */}
      <Modal
        visible={pickerItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerForId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerForId(null)}>
          <View style={styles.tagPickerOverlay}>
            <TouchableWithoutFeedback onPress={() => { /* swallow taps inside */ }}>
              <View style={styles.tagPickerCard}>
                <Text style={styles.tagPickerTitle} numberOfLines={2}>
                  {pickerItem?.title ?? 'Choose tag colour'}
                </Text>
                {TAG_PICKER_OPTIONS.map((opt, idx, arr) => {
                  const selected = pickerCurrentColor === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.tagPickerItem,
                        idx === arr.length - 1 && styles.tagPickerItemLast,
                        selected && styles.tagPickerItemActive,
                      ]}
                      onPress={() => pickerItem && persistTagColor(pickerItem, opt.key)}
                      disabled={!pickerItem || taggingId === pickerItem?.id}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.tagPickerDot,
                          { backgroundColor: TAG_COLOR_HEX[opt.key] },
                        ]}
                      />
                      <Text
                        style={[
                          styles.tagPickerItemText,
                          selected && styles.tagPickerItemTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {selected && <Text style={styles.tagPickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                {pickerCurrentColor !== 'none' && (
                  <TouchableOpacity
                    style={styles.tagPickerRemoveItem}
                    onPress={() => pickerItem && persistTagColor(pickerItem, 'none')}
                    disabled={!pickerItem || taggingId === pickerItem?.id}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagPickerRemoveText}>Remove tag</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Subcategory Dropdown Modal ── */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Subcategory</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {subcategories.map((sub) => {
                  const displayName = isCore ? (sub.pte_core_title ?? sub.title) : sub.title;
                  const isSelected = sub.id === activeCategoryId;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.modalItem, isSelected && { backgroundColor: '#F2F2F7' }]}
                      onPress={() => handleSubcategorySwitch(sub)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {displayName}
                      </Text>
                      {isSelected && (
                        <CheckIcon size={scale(16)} color={colors.primary} strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
  },
  // ── Dropdown ──
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dropdownText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
  },
  // ── Tab Bar ──
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: scale(10),
    padding: scale(3),
    marginBottom: scale(12),
  },
  tabItem: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: scale(12),
    height: scale(44),
  },
  searchIconWrapper: {
    marginRight: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1C1F2A',
    height: '100%',
    padding: 0,
  },
  filterButton: {
    width: scale(44),
    height: scale(44),
    backgroundColor: '#94C23C',
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  // ── List ──
  scrollView: { flex: 1 },
  listContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  listContent: { flexGrow: 1 },
  footerLoader: {
    paddingVertical: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionsCardContainer: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: scale(16),
  },
  questionsCardWrapper: {
    backgroundColor: colors.white,
    paddingHorizontal: scale(16),
  },
  questionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
  },
  questionLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  questionTitle: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
    marginBottom: scale(8),
    lineHeight: scale(20),
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flexWrap: 'wrap',
  },
  idBadge: {
    backgroundColor: '#E5E5EA',
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
  },
  idBadgeText: {
    fontSize: scale(9),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1C1C1E',
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#1A2151',
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
  },
  newBadgeText: {
    color: colors.white,
    fontSize: scale(9),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  diffBadge: {
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
  },
  diffBadgeText: {
    fontSize: scale(9),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  tagWrapper: { padding: scale(2) },
  viewButton: {
    borderWidth: 1,
    borderColor: '#94C23C',
    borderRadius: scale(10),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  viewButtonText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F7',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(20),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: scale(16),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1C1F2A',
    fontWeight: 'bold',
    marginBottom: scale(16),
    textAlign: 'center',
  },
  modalScroll: { width: '100%' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    marginBottom: scale(4),
  },
  modalItemText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#333333',
  },
  // ── Tag Colour Picker (modal) ──
  tagPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  tagPickerCard: {
    width: '100%',
    maxWidth: scale(320),
    backgroundColor: colors.white,
    borderRadius: scale(14),
    paddingVertical: scale(8),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  tagPickerTitle: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1C1F2A',
    paddingHorizontal: scale(14),
    paddingTop: scale(8),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tagPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: scale(10),
  },
  tagPickerItemLast: {
    borderBottomWidth: 0,
  },
  tagPickerItemActive: {
    backgroundColor: '#F8F9FA',
  },
  tagPickerDot: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tagPickerItemText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
  },
  tagPickerItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tagPickerCheck: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tagPickerRemoveItem: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  tagPickerRemoveText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});
