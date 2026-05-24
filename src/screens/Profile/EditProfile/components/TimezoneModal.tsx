import React, { memo, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  FlatList,
} from 'react-native';
import { styles } from '../styles';
import { TIMEZONES } from '../constants';

interface TimezoneModalProps {
  visible: boolean;
  selectedTimezone: string;
  search: string;
  onChangeSearch: (value: string) => void;
  onSelect: (timezone: string) => void;
  onClose: () => void;
}

const TimezoneModalComponent: React.FC<TimezoneModalProps> = ({
  visible,
  selectedTimezone,
  search,
  onChangeSearch,
  onSelect,
  onClose,
}) => {
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return TIMEZONES;
    return TIMEZONES.filter(tz => tz.toLowerCase().includes(query));
  }, [search]);

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
            <Text style={styles.modalTitle}>Select Timezone</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarWrapper}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search timezone..."
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={onChangeSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item === selectedTimezone && styles.selectedModalItem,
                ]}
                onPress={() => onSelect(item)}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item === selectedTimezone &&
                      styles.selectedModalItemText,
                  ]}
                >
                  {item}
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

export const TimezoneModal = memo(TimezoneModalComponent);
