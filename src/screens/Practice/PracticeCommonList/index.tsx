import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CaretDownIcon,
  FilterIcon,
  SearchIcon,
} from '../../../components/atoms/Icon';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PracticeCommonListSkeleton } from '../../../components/atoms/Skeleton';
import { SubHeader } from '../../../components/molecules/SubHeader';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import { isPteCore } from '../../../config/appVariantConfig';
import { useToast } from '../../../context/ToastContext';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import apiClient from '../../../services/apiClient';
import { logger } from '../../../services/logger';
import { colors } from '../../../theme/colors';
import { tagColorStore } from '../../../utils/tagColorStore';

import { QuestionRow } from './components/QuestionRow';
import { SubcategoryDropdownModal } from './components/SubcategoryDropdownModal';
import { TabBar } from './components/TabBar';
import { TagColorPickerModal } from './components/TagColorPickerModal';
import {
  DEBOUNCE_FETCH_MS,
  PAGE_SIZE,
  TAB_PARAMS,
} from './constants';
import {
  extractListItems,
  extractPageSize,
  extractTotalCount,
  parseQuestion,
} from './helpers';
import { scale } from './scale';
import { styles } from './styles';
import type {
  ApiSubcategory,
  QuestionItem,
  TabName,
  TagColor,
} from './types';

type PracticeCommonListRouteProp = RouteProp<
  RootStackParamList,
  'PracticeCommonList'
>;

export const PracticeCommonListScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PracticeCommonListRouteProp>();
  const { showToast } = useToast();

  const { categoryId, categoryName, parentCategory } = route.params;

  // Active subcategory
  const [activeCategoryId, setActiveCategoryId] = useState<number>(categoryId);
  const [activeCategoryName, setActiveCategoryName] = useState<string>(
    categoryName,
  );

  // Subcategories dropdown
  const [subcategories, setSubcategories] = useState<ApiSubcategory[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>('All');

  // Phased rendering state — we delay heavy modals until the list is on
  // screen so the initial render isn't blocked by their JSX.
  const [renderPhase, setRenderPhase] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setRenderPhase(1);
    let cancelled = false;
    // Yield twice via rAF before promoting phases — same intent as the
    // (now-deprecated in RN 0.85) InteractionManager.runAfterInteractions.
    requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        setRenderPhase(2);
        requestAnimationFrame(() => {
          if (cancelled) return;
          setRenderPhase(3);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, activeTab]);

  // Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Per-question colour map. Mirrored from the shared `tagColorStore`
  // so changes made on the detail screen reflect here without forcing
  // a network round-trip.
  const [tagColorById, setTagColorById] = useState<
    Map<string | number, Exclude<TagColor, 'none'>>
  >(() => tagColorStore.snapshot());
  const [taggingId, setTaggingId] = useState<string | number | null>(null);
  // Which item's colour picker is currently open. `null` = none.
  const [pickerForId, setPickerForId] = useState<string | number | null>(null);

  useEffect(() => {
    const unsubscribe = tagColorStore.subscribe(() => {
      setTagColorById(tagColorStore.snapshot());
    });
    return unsubscribe;
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [isLoadMore, setIsLoadMore] = useState(false);

  // Refs to avoid stale closures inside callbacks
  const currentRequestRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoreDataRef = useRef(false);
  const isLoadMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const loadingRef = useRef(loading);
  const refreshingRef = useRef(refreshing);

  const isCore = isPteCore();

  useEffect(() => {
    loadingRef.current = loading;
    refreshingRef.current = refreshing;
    hasMoreDataRef.current = hasMoreData;
    isLoadMoreRef.current = isLoadMore;
    currentPageRef.current = currentPage;
  }, [loading, refreshing, hasMoreData, isLoadMore, currentPage]);

  // Fetch subcategories
  const fetchSubcategories = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
      const raw = res.data?.data ?? res.data ?? {};
      const flatSubs: ApiSubcategory[] = raw.subcategories ?? [];
      const filtered = flatSubs.filter(s => s.category === parentCategory);
      setSubcategories(filtered);
    } catch (err) {
      logger.warn('Failed to load categories', err);
    }
  }, [parentCategory]);

  // Fetch Questions
  const fetchQuestions = useCallback(
    async (page = 1, shouldAppend = false) => {
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
          count: PAGE_SIZE,
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

        // Bail if a newer request supplanted this one mid-flight.
        if (currentRequestRef.current !== requestId) return;

        const responseData = (res.data ?? {}) as Record<string, unknown>;
        const list = extractListItems(responseData);
        const parsed = list.map(parseQuestion);

        const totalItems = extractTotalCount(responseData, list.length);
        const itemsPerPage = extractPageSize(responseData, PAGE_SIZE);
        const calcTotalPages = Math.max(
          1,
          Math.ceil(totalItems / itemsPerPage),
        );

        setQuestions(prev => (shouldAppend ? [...prev, ...parsed] : parsed));
        // Seed the shared colour store so list ↔ detail stay in sync.
        tagColorStore.seed(
          parsed.map(q => [q.id, q.tagColor ?? 'none'] as const),
        );
        setTotalPages(calcTotalPages);
        setHasMoreData(page < calcTotalPages);
        hasMoreDataRef.current = page < calcTotalPages;
      } catch (err: unknown) {
        if (currentRequestRef.current !== requestId) return;
        const e = err as { message?: string };
        showToast(e?.message || 'Failed to load questions', 'error');
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

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setHasMoreData(false);
    setIsLoadMore(false);
    hasMoreDataRef.current = false;
    isLoadMoreRef.current = false;
    currentPageRef.current = 1;
  }, []);

  // Debounced re-fetch when tab / category / search changes
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    currentRequestRef.current = null;

    resetPagination();

    debounceTimerRef.current = setTimeout(() => {
      fetchQuestions(1, false);
    }, DEBOUNCE_FETCH_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // fetchQuestions is intentionally omitted to avoid a refetch storm
    // every time the search input keystroke updates the captured ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, activeTab, searchQuery]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // Handlers
  const handleTabChange = useCallback(
    (tab: TabName) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
    },
    [activeTab],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    resetPagination();
    await fetchQuestions(1, false);
  }, [fetchQuestions, resetPagination]);

  const handleLoadMore = useCallback(() => {
    if (
      loadingRef.current ||
      isLoadMoreRef.current ||
      !hasMoreDataRef.current
    )
      return;
    const nextPage = currentPageRef.current + 1;
    setIsLoadMore(true);
    isLoadMoreRef.current = true;
    setCurrentPage(nextPage);
    currentPageRef.current = nextPage;
    fetchQuestions(nextPage, true);
  }, [fetchQuestions]);

  const handleSubcategorySwitch = useCallback(
    (sub: ApiSubcategory) => {
      setIsDropdownOpen(false);
      setActiveCategoryId(sub.id);
      setActiveCategoryName(
        isCore ? sub.pte_core_title ?? sub.title : sub.title,
      );
    },
    [isCore],
  );

  // Keep a ref to the latest `questions` so the stable `handleViewQuestion`
  // callback below always sees the freshest list — without it, the
  // memoised `renderItem` captures a stale closure and ends up navigating
  // with an empty `questionsList` on the detail screen.
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

  // Persist a colour change to the backend.
  const persistTagColor = useCallback(
    async (item: QuestionItem, next: TagColor) => {
      if (taggingId === item.id) return;
      const previous: TagColor = tagColorStore.get(item.id);
      tagColorStore.set(item.id, next);
      setPickerForId(null);
      setTaggingId(item.id);
      try {
        const formData = new FormData();
        formData.append('question_id', String(item.id));
        // Backend stores the colour name directly in the `tag` column,
        // so send it as the colour string. For "untag", send "0" to
        // mirror the legacy flag.
        formData.append('tag', next === 'none' ? '0' : next);
        formData.append('tag_color', next);
        await apiClient.post(API_ENDPOINTS.SET_TAG, formData);
        showToast(
          next === 'none' ? 'Tag removed' : `Tagged as ${next}`,
          'info',
        );
      } catch (err: unknown) {
        tagColorStore.set(item.id, previous);
        const e = err as {
          response?: { data?: { message?: string } };
        };
        showToast(
          e?.response?.data?.message || 'Failed to update tag',
          'error',
        );
      } finally {
        setTaggingId(null);
      }
    },
    [taggingId, showToast],
  );

  const handlePickTag = useCallback((id: string | number) => {
    setPickerForId(id);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: QuestionItem; index: number }) => (
      <QuestionRow
        item={item}
        currentColor={tagColorById.get(item.id)}
        taggingId={taggingId}
        onPickTag={handlePickTag}
        onView={handleViewQuestion}
      />
    ),
    [tagColorById, taggingId, handlePickTag, handleViewQuestion],
  );

  const pickerItem =
    pickerForId != null
      ? questions.find(q => q.id === pickerForId) ?? null
      : null;
  const pickerCurrentColor: TagColor = pickerItem
    ? tagColorById.get(pickerItem.id) ?? 'none'
    : 'none';

  const isInitialLoading =
    (loading && questions.length === 0) || renderPhase < 2;

  return (
    <View style={styles.container}>
      <SubHeader title={parentCategory} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setIsDropdownOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownText}>{activeCategoryName}</Text>
          <CaretDownIcon size={scale(16)} color="#1C1C1E" />
        </TouchableOpacity>

        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

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

        {isInitialLoading ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.questionsCardContainer}>
              <PracticeCommonListSkeleton count={6} />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={questions}
              keyExtractor={item => String(item.id)}
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
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
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

      {renderPhase >= 3 && (
        <>
          <TagColorPickerModal
            pickerItem={pickerItem}
            pickerCurrentColor={pickerCurrentColor}
            taggingId={taggingId}
            onClose={() => setPickerForId(null)}
            onSelect={persistTagColor}
          />
          <SubcategoryDropdownModal
            visible={isDropdownOpen}
            subcategories={subcategories}
            activeCategoryId={activeCategoryId}
            isCore={isCore}
            onClose={() => setIsDropdownOpen(false)}
            onSelect={handleSubcategorySwitch}
          />
        </>
      )}
    </View>
  );
};

export default PracticeCommonListScreen;
