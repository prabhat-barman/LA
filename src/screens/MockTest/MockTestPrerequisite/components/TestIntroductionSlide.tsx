import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { TEST_INTRODUCTION_TIPS } from '../constants';
import { styles } from '../styles';

export interface TestIntroductionSlideProps {
  onReadyChange: (ready: boolean) => void;
}

const TestIntroductionSlide: React.FC<TestIntroductionSlideProps> = ({
  onReadyChange,
}) => {
  // Pure read-only slide — user just acknowledges by hitting Next.
  useEffect(() => {
    onReadyChange(true);
  }, [onReadyChange]);

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Test Introduction</Text>
      <Text style={styles.slideDescription}>
        This test measures the Reading, Writing, Listening and Speaking
        skills in English that you will need in an academic setting.
      </Text>

      <View style={styles.tipBox}>
        {TEST_INTRODUCTION_TIPS.map(tip => (
          <View key={tip} style={styles.introTipRow}>
            <View style={styles.introTipDot} />
            <Text style={styles.introTipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default TestIntroductionSlide;
