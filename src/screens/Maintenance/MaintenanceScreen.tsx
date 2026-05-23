import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { WrenchInCircleIcon } from '../../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export const MaintenanceScreen: React.FC = () => {
  const [checking, setChecking] = useState(false);

  const handleSupportPress = () => {
    Linking.openURL('mailto:support@languageacademy.com.au').catch((err) =>
      console.warn('Failed to open email link:', err)
    );
  };

  const handleCheckAgain = () => {
    setChecking(true);
    // Simulate checking status with a small aesthetic loader
    setTimeout(() => {
      setChecking(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Maintenance Illustration/Icon */}
        <View style={styles.illustrationContainer}>
          <WrenchInCircleIcon size={scale(120)} />
        </View>

        {/* Text Details */}
        <Text style={styles.title}>System Maintenance</Text>
        <Text style={styles.subtitle}>We'll be back shortly!</Text>
        <Text style={styles.description}>
          Language Academy is currently undergoing scheduled upgrades to bring you an improved experience. We apologize for any inconvenience.
        </Text>

        {/* Buttons & Actions */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckAgain}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Check Status Again</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSupportPress}>
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  illustrationContainer: {
    marginBottom: scale(32),
    alignItems: 'center',
  },
  title: {
    fontSize: scale(24),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#94C23C',
    fontFamily: 'BricolageGrotesque-Bold',
    textAlign: 'center',
    marginBottom: scale(16),
  },
  description: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(40),
  },
  buttonContainer: {
    width: '100%',
    gap: scale(12),
  },
  primaryButton: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: scale(48),
  },
  primaryButtonText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: scale(48),
  },
  secondaryButtonText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
