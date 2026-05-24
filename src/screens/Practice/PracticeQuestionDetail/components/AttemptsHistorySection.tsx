import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CaretDownIcon } from '../../../../components/atoms/Icon';
import { SORT_FILTERS } from '../constants';
import { scale } from '../scale';
import { styles } from '../styles';
import type { HistoryTab, SortFilter } from '../types';
import { MemoizedAttemptsList } from './AttemptsList';

interface Props {
  activeHistoryTab: HistoryTab;
  onChangeHistoryTab: (tab: HistoryTab) => void;
  filterDropdownOpen: boolean;
  onToggleFilter: () => void;
  selectedFilter: SortFilter;
  onSelectFilter: (filter: SortFilter) => void;
  loadingAttempts: boolean;
  attempts: any[];
  playingAttemptId: string | number | null;
  isAttemptPlaying: boolean;
  onToggleAttemptAudio: (attempt: any) => void;
}

export const AttemptsHistorySection: React.FC<Props> = ({
  activeHistoryTab,
  onChangeHistoryTab,
  filterDropdownOpen,
  onToggleFilter,
  selectedFilter,
  onSelectFilter,
  loadingAttempts,
  attempts,
  playingAttemptId,
  isAttemptPlaying,
  onToggleAttemptAudio,
}) => (
  <View style={styles.logsSection}>
    <View style={styles.logsTabSwitcher}>
      <TouchableOpacity
        style={[styles.logsTabBtn, activeHistoryTab === 'me' && styles.logsTabBtnActive]}
        onPress={() => onChangeHistoryTab('me')}
      >
        <Text
          style={[styles.logsTabText, activeHistoryTab === 'me' && styles.logsTabTextActive]}
        >
          Me
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.logsTabBtn, activeHistoryTab === 'others' && styles.logsTabBtnActive]}
        onPress={() => onChangeHistoryTab('others')}
      >
        <Text
          style={[styles.logsTabText, activeHistoryTab === 'others' && styles.logsTabTextActive]}
        >
          Others
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.filterWrapper}>
      <TouchableOpacity style={styles.filterDropdownHeader} onPress={onToggleFilter}>
        <Text style={styles.filterDropdownLabel}>
          Sort / Filter: <Text style={styles.filterDropdownValue}>{selectedFilter}</Text>
        </Text>
        <CaretDownIcon size={scale(12)} color="#1C1C1E" expanded={filterDropdownOpen} />
      </TouchableOpacity>

      {filterDropdownOpen && (
        <View style={styles.filterDropdownList}>
          {SORT_FILTERS.map(filterItem => (
            <TouchableOpacity
              key={filterItem}
              style={[
                styles.filterDropdownItem,
                selectedFilter === filterItem && styles.filterDropdownItemActive,
              ]}
              onPress={() => onSelectFilter(filterItem)}
            >
              <Text
                style={[
                  styles.filterDropdownItemText,
                  selectedFilter === filterItem && styles.filterDropdownItemTextActive,
                ]}
              >
                {filterItem}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>

    {loadingAttempts ? (
      <ActivityIndicator
        size="small"
        color="#007AFF"
        style={{ marginVertical: scale(20) }}
      />
    ) : (
      <MemoizedAttemptsList
        attempts={attempts}
        isOthers={activeHistoryTab === 'others'}
        playingAttemptId={playingAttemptId}
        isAttemptPlaying={isAttemptPlaying}
        onToggleAttemptAudio={onToggleAttemptAudio}
      />
    )}
  </View>
);
