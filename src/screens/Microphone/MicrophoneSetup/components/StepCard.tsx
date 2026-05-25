import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { CheckIcon } from '../../../../components/atoms/Icon';
import { scale } from '../scale';
import { styles } from '../styles';

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  done: boolean;
  active: boolean;
}

const StepCardComponent: React.FC<StepCardProps> = ({
  number,
  title,
  description,
  done,
  active,
}) => (
  <View style={[styles.stepCard, active && styles.stepCardActive]}>
    <View
      style={[
        styles.stepNumber,
        done && styles.stepNumberDone,
        active && styles.stepNumberActive,
      ]}
    >
      {done ? (
        <CheckIcon size={scale(14)} color="#FFFFFF" strokeWidth={3} />
      ) : (
        <Text style={[styles.stepNumberText, active && { color: '#FFFFFF' }]}>
          {number}
        </Text>
      )}
    </View>
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, active && { color: '#1A2151' }]}>
        {title}
      </Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
);

export const StepCard = memo(StepCardComponent);
