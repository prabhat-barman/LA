import React from 'react';
import { Text, View } from 'react-native';
import { InfoOutlineIcon } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';

interface Props {
  text: string;
}

export const InstructionBanner: React.FC<Props> = ({ text }) => (
  <View style={styles.lavenderInstructionBanner}>
    <InfoOutlineIcon size={scale(16)} color="#5C527F" />
    <Text style={styles.lavenderInstructionText}>{text}</Text>
  </View>
);
