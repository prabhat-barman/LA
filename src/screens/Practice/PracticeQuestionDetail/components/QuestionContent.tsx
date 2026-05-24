import React from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from '../styles';
import type { QuestionDetails } from '../types';

interface Props {
  categoryId: number;
  questionDetails: QuestionDetails | null;
  questionText: string;
  resolveImageUrl: (img: string | undefined) => string;
}

// Per-category prompt block: image (Describe Image, id 3) /
// situation (Respond to a situation, id 21) / paragraph (Read Aloud, id 1).
export const QuestionContent: React.FC<Props> = ({
  categoryId,
  questionDetails,
  questionText,
  resolveImageUrl,
}) => {
  if (categoryId === 3 && questionDetails?.image) {
    return (
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri: resolveImageUrl(
              questionDetails.image ??
                questionDetails.question_image ??
                questionDetails.image_file,
            ),
          }}
          style={styles.questionImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (categoryId === 21 && questionText.length > 0) {
    return (
      <View style={styles.situationContainer}>
        <Text style={styles.situationHeader}>Situation Description:</Text>
        <Text style={styles.situationText}>{questionText}</Text>
      </View>
    );
  }

  if (categoryId === 1 && questionText.length > 0) {
    return <Text style={styles.paragraphText}>{questionText}</Text>;
  }

  return null;
};
