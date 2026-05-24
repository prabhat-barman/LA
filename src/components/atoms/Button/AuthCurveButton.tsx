import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { theme } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCurveShape } from '../Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface AuthCurveButtonProps {
  title: string;
  onPress: () => void;
  activeOpacity?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

const AuthCurveButton: React.FC<AuthCurveButtonProps> = ({
  title,
  onPress,
  activeOpacity = 0.8,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}) => {
  const insets = useSafeAreaInsets();
  const dynamicBottom = scale(15) + (insets.bottom > 0 ? insets.bottom * 0.5 : 0);

  return (
    <TouchableOpacity
      style={styles.svgButtonContainer}
      onPress={onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
    >
      <AuthCurveShape
        width={screenWidth}
        height={scale(120)}
        color={colors.primary}
        style={styles.svgArch}
      />
      <View style={[styles.buttonTextWrapper, { bottom: dynamicBottom }]}>
        <Text style={styles.buttonText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  svgButtonContainer: {
    width: '100%',
    height: scale(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgArch: {
    position: 'absolute',
    bottom: 0,
  },
  buttonTextWrapper: {
    position: 'absolute',
    zIndex: 1,
  },
  buttonText: {
    ...theme.typography.bold,
    fontSize: scale(18),
    color: colors.white,
  },
});

export default AuthCurveButton;
