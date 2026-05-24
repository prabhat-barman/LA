import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const screenWidth = width;
export const scale = (size: number) => (screenWidth / 375) * size;
