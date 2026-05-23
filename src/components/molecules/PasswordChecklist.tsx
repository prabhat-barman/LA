import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { evaluatePasswordRules } from '../../utils/validation';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface PasswordChecklistProps {
  password: string;
  /** When provided, an extra "Passwords match" row is appended. */
  confirmPassword?: string;
  /** Use 'light' on white/light surfaces, 'dark' on the auth-template card. */
  variant?: 'light' | 'dark';
}

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  password,
  confirmPassword,
  variant = 'light',
}) => {
  const items = useMemo<ChecklistItem[]>(() => {
    const rules: ChecklistItem[] = evaluatePasswordRules(password).map(r => ({
      id: r.id,
      label: r.label,
      passed: r.passed,
    }));

    if (confirmPassword !== undefined) {
      rules.push({
        id: 'match',
        label: 'Passwords match',
        passed: password.length > 0 && password === confirmPassword,
      });
    }

    return rules;
  }, [password, confirmPassword]);

  const isDark = variant === 'dark';

  return (
    <View style={styles.container}>
      {items.map(item => (
        <View key={item.id} style={styles.row}>
          <View
            style={[
              styles.iconCircle,
              item.passed ? styles.iconCircleOk : styles.iconCircleIdle,
            ]}
          >
            <Text style={styles.iconText}>{item.passed ? '✓' : '•'}</Text>
          </View>
          <Text
            style={[
              styles.label,
              isDark && styles.labelDark,
              item.passed && (isDark ? styles.labelOkDark : styles.labelOk),
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: scale(4),
    marginBottom: scale(16),
    paddingHorizontal: scale(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(3),
  },
  iconCircle: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  iconCircleIdle: {
    backgroundColor: '#E6E8EE',
  },
  iconCircleOk: {
    backgroundColor: '#22A06B',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: scale(10),
    lineHeight: scale(12),
    fontWeight: 'bold',
  },
  label: {
    fontSize: scale(12),
    color: '#5A6172',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  labelDark: {
    color: '#9097A6',
  },
  labelOk: {
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  labelOkDark: {
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Medium',
  },
});

export default PasswordChecklist;
