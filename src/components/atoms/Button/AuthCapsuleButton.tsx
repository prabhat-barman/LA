import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../../theme/colors';
import { theme } from '../../../theme';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface AuthCapsuleButtonProps {
  title: string;
  onPress: () => void;
  activeOpacity?: number;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

const AuthCapsuleButton: React.FC<AuthCapsuleButtonProps> = ({
  title,
  onPress,
  activeOpacity = 0.8,
  style,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.buttonWrapper, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
    height: scale(54),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    // marginVertical: scale(20),
    marginTop: scale(12),
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: scale(27),
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...theme.typography.bold,
    color: colors.white,
    fontSize: scale(17),
  },
});

export default AuthCapsuleButton;
