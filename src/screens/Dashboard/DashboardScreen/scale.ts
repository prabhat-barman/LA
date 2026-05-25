import { Dimensions } from 'react-native';

export const { width: screenWidth } = Dimensions.get('window');

// Linear scale anchored to a 375pt design width (iPhone X). Same scale
// helper used across the rest of the app — kept local so the screen's
// constants/styles can import without pulling in the whole theme.
export const scale = (size: number) => (screenWidth / 375) * size;

// Cinema-mode video player keeps the standard 16:9 YouTube aspect.
export const FULLSCREEN_PLAYER_HEIGHT = (screenWidth * 9) / 16;
