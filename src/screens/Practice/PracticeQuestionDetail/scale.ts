import { Dimensions } from 'react-native';

export const { width: screenWidth } = Dimensions.get('window');

// Linear scale relative to a 375pt baseline so layout numbers stay
// proportional across phone widths.
export const scale = (size: number) => (screenWidth / 375) * size;
