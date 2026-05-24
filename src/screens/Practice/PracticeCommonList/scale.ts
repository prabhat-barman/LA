import { Dimensions } from 'react-native';

export const { width: screenWidth } = Dimensions.get('window');
export const scale = (size: number) => (screenWidth / 375) * size;
