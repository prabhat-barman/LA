import React from 'react';
import { Image, ImageBackground, Text, View } from 'react-native';
import { images } from '../../../../assets/imageUrl';
import { styles } from '../styles';
import type { MockResultUserInfo, PteScore } from '../types';

interface Props {
  user: MockResultUserInfo | null | undefined;
  score: PteScore;
  // Headline label backend ships under the big score (e.g.
  // "Speaking Score", "Mock Test Score"). Defaults handled by the
  // normalizer — passed through verbatim here.
  label: string;
}

const formatName = (
  firstName: string | null,
  lastName: string | null,
): string => {
  const parts = [firstName, lastName].filter(
    (n): n is string => typeof n === 'string' && n.length > 0,
  );
  if (parts.length === 0) return '-';
  return parts.join(' ');
};

const initialFromName = (firstName: string | null): string => {
  if (firstName && firstName.length > 0) {
    return firstName.charAt(0).toUpperCase();
  }
  return '?';
};

// Top card of the result screen. Mirrors legacy
// CommunicationScoreCard.js — left side carries the avatar + name +
// "Communication Skills" subtitle, right side carries the purple
// scorecard pill (background image) with the numeric score + label.
// The pill bleeds past the card's right edge by design — matches
// the original visual hierarchy where the score is the page hero.
export const CommunicationScoreCard: React.FC<Props> = ({
  user,
  score,
  label,
}) => {
  const safeUser: MockResultUserInfo = user ?? {
    firstName: null,
    lastName: null,
    imageUrl: null,
    email: null,
    dob: null,
    countryResidence: null,
    countryCitizenship: null,
  };
  const name = formatName(safeUser.firstName, safeUser.lastName);
  const initial = initialFromName(safeUser.firstName);
  // Empty string when grading is pending so the pill still renders
  // (matches legacy which painted `0` in this slot, but we prefer
  // a dash over a misleading zero).
  const displayScore = score == null ? '—' : String(score);

  return (
    <View style={styles.commCard}>
      <View style={styles.commLeft}>
        {safeUser.imageUrl ? (
          <Image
            source={{ uri: safeUser.imageUrl }}
            style={styles.commAvatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.commAvatarFallback}>
            <Text style={styles.commAvatarFallbackText}>{initial}</Text>
          </View>
        )}
        <View style={styles.commTextBlock}>
          <Text style={styles.commName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.commSubtitle} numberOfLines={1}>
            Communication Skills
          </Text>
        </View>
      </View>

      <ImageBackground
        source={images.scorecard_image}
        style={styles.commScorePill}
        resizeMode="contain"
      >
        <View style={styles.commScorePillContent}>
          <Text style={styles.commScoreValue}>{displayScore}</Text>
          <Text style={styles.commScoreLabel} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
};

export default CommunicationScoreCard;
