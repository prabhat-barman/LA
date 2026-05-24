import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Text, Animated, Dimensions, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, toastType: ToastType = 'info') => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(msg);
    setType(toastType);
    setVisible(true);

    // Animation in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Auto hide after 3 seconds
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
        });
      }, 3000);
    });
  }, [fadeAnim, slideAnim]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B981'; // vibrant green
      case 'error':
        return '#EF4444'; // vibrant red
      case 'info':
      default:
        return colors.primary || '#3B82F6';
    }
  };

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {visible && (
        <SafeAreaView style={styles.toastWrapper} pointerEvents="none">
          <Animated.View
            style={[
              styles.toastContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                backgroundColor: getBackgroundColor(),
              },
            ]}
          >
            <Text style={styles.toastText}>{message}</Text>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContainer: {
    width: width - 40,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    ...theme.typography.semiBold,
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});
