import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ReportFlagIcon } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';

interface Props {
  attemptCount: number;
  onReport: () => void;
}

export const CardFooter: React.FC<Props> = ({ attemptCount, onReport }) => (
  <>
    <View style={styles.cardFooterDivider} />
    <View style={styles.cardFooterRow}>
      <Text style={styles.attemptCountText}>{attemptCount} X ATTEMPTED</Text>
      <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
        <ReportFlagIcon size={scale(14)} color="#8E8E93" />
        <Text style={styles.reportBtnText}>Report</Text>
      </TouchableOpacity>
    </View>
  </>
);
