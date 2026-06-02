import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SubHeader } from '../../../components/molecules/SubHeader';
import { Tooltip } from '../../../components/organisms/Tooltip';
import { colors } from '../../../theme/colors';
import { isPteCore } from '../../../config/appVariantConfig';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { TOUR_KEYS } from '../../../services/tourStorage';

import { SubcategoryProgressCard } from './components/SubcategoryProgressCard';
import { useProgressData } from './hooks/useProgressData';
import { styles } from './styles';
import { PROGRESS_SKILLS } from './types';
import type { ProgressSkill, ProgressSubcategory } from './types';

type ProgressTrackerRouteProp = RouteProp<RootStackParamList, 'ProgressTracker'>;
type ProgressTrackerNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProgressTracker'
>;

const isValidSkill = (v: unknown): v is ProgressSkill =>
  typeof v === 'string' && (PROGRESS_SKILLS as readonly string[]).includes(v);

export const ProgressTrackerScreen: React.FC = () => {
  const navigation = useNavigation<ProgressTrackerNavProp>();
  const route = useRoute<ProgressTrackerRouteProp>();
  const queryClient = useQueryClient();

  // Seed the selected tab from the route param when present so a tap on
  // the Dashboard "Speaking" card lands the user on the Speaking tab.
  // Default to Speaking otherwise — matches the visual order of the
  // dashboard category grid.
  const initialSkill = isValidSkill(route.params?.initialSkill)
    ? route.params.initialSkill
    : 'Speaking';
  const [selectedSkill, setSelectedSkill] = useState<ProgressSkill>(initialSkill);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    isSkillLoading,
  } = useProgressData();

  // Display titles need to swap to pte_core_title when we're running the
  // PTE-Core variant — `isPteCore()` is a sync flag so this is just a
  // read inside render.
  const isCore = isPteCore();

  const visibleSubcategories = useMemo<ProgressSubcategory[]>(() => {
    if (!data) return [];
    const raw = data.bySkill[selectedSkill] ?? [];
    if (!isCore) return raw;
    return raw.map(sub =>
      sub.pteCoreTitle ? { ...sub, title: sub.pteCoreTitle } : sub,
    );
  }, [data, selectedSkill, isCore]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRefresh = useCallback(() => {
    // Refetch directly instead of invalidate so we surface the loading
    // spinner via `isRefetching` for the RefreshControl indicator.
    refetch();
  }, [refetch]);

  // Subcategory tap → straight into the question list for that section.
  // We use `replace`-equivalent semantics by going through `navigate`
  // because the user typically wants to come back here when they bail
  // out of the list (so push, don't replace).
  const handleOpenSubcategory = useCallback(
    (sub: ProgressSubcategory) => {
      navigation.navigate('PracticeCommonList', {
        categoryId: sub.id,
        categoryName: sub.title,
        parentCategory: sub.skill,
      });
    },
    [navigation],
  );

  const handleRetry = useCallback(() => {
    // Invalidate every cache slot the screen reads (categories + every
    // per-skill bucket) by matching the shared prefix.
    queryClient.invalidateQueries({ queryKey: ['progressTracker'] });
  }, [queryClient]);

  const renderTabs = () => (
    <View style={styles.tabsRow}>
      {PROGRESS_SKILLS.map(skill => {
        const isActive = skill === selectedSkill;
        return (
          <TouchableOpacity
            key={skill}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setSelectedSkill(skill)}
            accessibilityRole="tab"
            accessibilityLabel={skill}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {skill}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }

    if (isError) {
      const message =
        (error as { message?: string } | undefined)?.message ??
        'Could not load your progress. Please try again.';
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (visibleSubcategories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing to show yet</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any {selectedSkill} subcategories. Try switching
            tabs or pull down to refresh.
          </Text>
        </View>
      );
    }

    // While the current skill's progress query is still in flight we keep
    // rendering the subcategory list (with attempted-from-categories +
    // accuracy="—") and just hint that fresher numbers are coming. Avoids
    // the jarring "list disappears, spinner shows, list re-appears"
    // flash on first tab switch.
    return (
      <>
        {isSkillLoading(selectedSkill) && (
          <View style={styles.skillLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.skillLoadingText}>Updating accuracy…</Text>
          </View>
        )}
        {visibleSubcategories.map(item => (
          <SubcategoryProgressCard
            key={item.id}
            item={item}
            onPress={handleOpenSubcategory}
          />
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SubHeader title="Progress Tracker" onBack={handleBack} />

      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.titleText}>Practice Material</Text>
          <View style={styles.titleBadge}>
            <Text style={styles.titleBadgeText}>Progress Tracker</Text>
          </View>
        </View>
      </View>

      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderBody()}
      </ScrollView>

      <Tooltip
        tourKey={TOUR_KEYS.ProgressTrackerIntro}
        title="Track your improvement"
        body="Watch your accuracy per skill and per question type as you log more attempts. Tap any skill tab above to drill in."
      />
    </View>
  );
};
