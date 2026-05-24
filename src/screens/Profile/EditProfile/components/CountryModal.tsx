import React, { memo, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  FlatList,
} from 'react-native';
import type { CountryData } from 'country-codes-list';
import { styles } from '../styles';
import { COUNTRIES } from '../constants';
import { filterCountriesByQuery } from '../helpers';

interface CountryModalProps {
  visible: boolean;
  search: string;
  onChangeSearch: (value: string) => void;
  onSelect: (country: CountryData) => void;
  onClose: () => void;
}

const CountryModalComponent: React.FC<CountryModalProps> = ({
  visible,
  search,
  onChangeSearch,
  onSelect,
  onClose,
}) => {
  const filtered = useMemo(
    () => filterCountriesByQuery(COUNTRIES, search),
    [search],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarWrapper}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search country name or code..."
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={onChangeSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item.countryCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.countryNameEn}</Text>
                <Text style={styles.countryCallingCode}>
                  +{item.countryCallingCode}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const CountryModal = memo(CountryModalComponent);
