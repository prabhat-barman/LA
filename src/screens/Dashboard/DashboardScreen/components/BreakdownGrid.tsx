import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  BookIcon,
  HeadphonesIcon,
  MicIcon,
  PenIcon,
} from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';
import type { BreakdownMeta, BreakdownSkill } from '../types';

interface BreakdownGridProps {
  breakdownMeta: BreakdownMeta;
  selectedBreakdown: BreakdownSkill;
  onSelectBreakdown: (skill: BreakdownSkill) => void;
}

interface BreakdownItemProps {
  skill: BreakdownSkill;
  Icon: typeof MicIcon;
  selected: boolean;
  meta: BreakdownMeta[BreakdownSkill];
  onPress: (skill: BreakdownSkill) => void;
}

const BreakdownItem = React.memo<BreakdownItemProps>(({
  skill,
  Icon,
  selected,
  meta,
  onPress,
}) => {
  const handlePress = useCallback(() => onPress(skill), [onPress, skill]);
  return (
    <TouchableOpacity
      style={[
        styles.breakdownItem,
        selected && {
          backgroundColor: meta.tint,
          borderColor: meta.color,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Icon size={scale(18)} color={meta.color} />
      <Text style={styles.breakdownLabel}>{meta.label}</Text>
      <Text style={styles.breakdownValue}>{meta.score}</Text>
    </TouchableOpacity>
  );
});
BreakdownItem.displayName = 'BreakdownItem';

// 2x2 grid of speaking/listening/writing/reading skill cards inside the
// AI Predicted Score card. Tapping a row cell drives the parent's
// `selectedBreakdown` state which in turn re-paints the circular score.
export const BreakdownGrid: React.FC<BreakdownGridProps> = React.memo(({
  breakdownMeta,
  selectedBreakdown,
  onSelectBreakdown,
}) => {
  return (
    <View style={styles.breakdownGrid}>
      <View style={styles.breakdownRow}>
        <BreakdownItem
          skill="Speaking"
          Icon={MicIcon}
          selected={selectedBreakdown === 'Speaking'}
          meta={breakdownMeta.Speaking}
          onPress={onSelectBreakdown}
        />
        <BreakdownItem
          skill="Listening"
          Icon={HeadphonesIcon}
          selected={selectedBreakdown === 'Listening'}
          meta={breakdownMeta.Listening}
          onPress={onSelectBreakdown}
        />
      </View>
      <View style={styles.breakdownRow}>
        <BreakdownItem
          skill="Writing"
          Icon={PenIcon}
          selected={selectedBreakdown === 'Writing'}
          meta={breakdownMeta.Writing}
          onPress={onSelectBreakdown}
        />
        <BreakdownItem
          skill="Reading"
          Icon={BookIcon}
          selected={selectedBreakdown === 'Reading'}
          meta={breakdownMeta.Reading}
          onPress={onSelectBreakdown}
        />
      </View>
    </View>
  );
});
BreakdownGrid.displayName = 'BreakdownGrid';
