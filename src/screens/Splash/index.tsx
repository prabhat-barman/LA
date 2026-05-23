import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Logo from '../../assets/images/logo.svg';

import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

import { getItem } from '../../utils/secureStorage';

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const checkSessionAndNavigate = async () => {
      try {
        const userToken = await getItem('user_token');
        // Small delay to let splash animation settle
        await new Promise((resolve) => setTimeout(() => resolve(null), 2000));
        
        if (userToken) {
          navigation.replace('Dashboard');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (error) {
        console.warn('Session verification failed:', error);
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
