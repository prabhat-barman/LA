import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../../theme/colors';
import { CATEGORIES } from '../constants';
import { styles } from '../styles';
import type { SkillCategory } from '../types';

interface CategoryPillsProps {
  selectedCategory: SkillCategory;
  onSelect: (category: SkillCategory) => void;
}

const CategoryPillsComponent: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelect,
}) => (
  <View style={styles.categoryContainer}>
    {CATEGORIES.map(category => {
      const isActive = selectedCategory === category.name;
      return (
        <TouchableOpacity
          key={category.name}
          style={[
            styles.categoryPill,
            isActive
              ? {
                  borderColor: colors.primary,
                  backgroundColor: colors.white,
                  borderWidth: 1,
                }
              : { borderColor: 'transparent', backgroundColor: '#E5E5EA' },
          ]}
          onPress={() => onSelect(category.name)}
        >
          <View
            style={[styles.dot, { backgroundColor: category.color }]}
          />
          <Text
            style={[
              styles.categoryPillText,
              isActive
                ? { color: colors.primary, fontWeight: '700' }
                : { color: colors.gray },
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const CategoryPills = memo(CategoryPillsComponent);
