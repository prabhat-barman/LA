import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Logo from '../../assets/images/logo.svg';

import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

import { getItem } from '../../utils/secureStorage';
import { logger } from '../../services/logger';

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Native bootsplash already handles the visual splash via
    // react-native-bootsplash, so this screen is essentially a route
    // gate that decides where to send the user. We avoid any artificial
    // delay so cold-start feels instant once the bundle is loaded.
    const checkSessionAndNavigate = async () => {
      try {
        const userToken = await getItem('user_token');
        if (userToken) {
          navigation.replace('Dashboard');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (error) {
        logger.warn('Session verification failed:', error);
        navigation.replace('Onboarding');
      }
    };

    checkSessionAndNavigate();
  }, [navigation]);

  const logoWidth = width * 0.6;
  // Aspect ratio based on original viewBox 223x93
  const logoHeight = (logoWidth * 93) / 223;

  return (
    <View style={styles.container}>
      <Logo width={logoWidth} height={logoHeight} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
