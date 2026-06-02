import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SPEAKING_INSTRUCTIONS_BODY } from '../constants';
import { styles } from '../styles';

export interface SpeakingInstructionsSlideProps {
  onReadyChange: (ready: boolean) => void;
}

const SpeakingInstructionsSlide: React.FC<SpeakingInstructionsSlideProps> = ({
  onReadyChange,
}) => {
  useEffect(() => {
    onReadyChange(true);
  }, [onReadyChange]);

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Speaking Instructions</Text>
      <Text style={styles.slideDescription}>
        Some questions require you to first listen to an audio clip and then
        record your answer by speaking clearly into the microphone.
      </Text>

      <View style={styles.tipBox}>
        {SPEAKING_INSTRUCTIONS_BODY.map(section => (
          <View key={section.heading}>
            <Text style={styles.speakingHeading}>{section.heading}</Text>
            <Text style={styles.speakingParagraph}>{section.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default SpeakingInstructionsSlide;
