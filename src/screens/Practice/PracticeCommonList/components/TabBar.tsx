import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TABS } from '../constants';
import { styles } from '../styles';
import type { TabName } from '../types';

interface TabBarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export const TabBar: React.FC<TabBarProps> = React.memo(
  ({ activeTab, onTabChange }) => (
    <View style={styles.tabBarContainer}>
      {TABS.map(tab => {
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
  ),
);
TabBar.displayName = 'TabBar';
