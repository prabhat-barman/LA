import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import { styles } from './Button.styles';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  disabled,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      accessibilityRole={accessibilityRole ?? 'button'}
      // Fall back to the visible title so screen readers always have
      // something meaningful to announce, even when callers forget to
      // pass an explicit label.
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};
