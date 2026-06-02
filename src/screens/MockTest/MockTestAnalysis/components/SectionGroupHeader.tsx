import React from 'react';
import { Text, View } from 'react-native';
import type { MockSection } from '../../MockTestRunner/types';
import { styles } from '../styles';

interface Props {
  section: MockSection;
  count: number;
}

// Divider rendered before each section's group of question cards on
// the analysis list. Includes a small count badge ("12 questions")
// so the user sees the section's scope at a glance — useful for
// Full Mocks where Speaking and Listening have very different sizes.
export const SectionGroupHeader: React.FC<Props> = ({ section, count }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderName}>{section}</Text>
    <Text style={styles.sectionHeaderCount}>
      {count} {count === 1 ? 'question' : 'questions'}
    </Text>
  </View>
);

export default SectionGroupHeader;
