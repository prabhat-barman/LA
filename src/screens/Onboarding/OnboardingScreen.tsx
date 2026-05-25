import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { theme } from '../../theme';

// Import SVG Icons
import BooksIcon from '../../assets/images/welcome/books.svg';
import CapIcon from '../../assets/images/welcome/cap.svg';
import CenterTV from '../../assets/images/welcome/centerTV.svg';
import GolobIcon from '../../assets/images/welcome/golob.svg';
import NoteIcon from '../../assets/images/welcome/note.svg';

const { width } = Dimensions.get('window');

// Simple scale utility
const scale = (size: number) => (width / 375) * size;

interface FloatingAssetProps {
  SvgComponent: React.ComponentType<{ width: number; height: number }>;
  radius: number;
  speed: number;
  startAngle: number;
  size: number;
  // When false, the orbit pauses. Used to halt animations when the
  // screen is unfocused so we don't burn CPU/GPU off-screen and don't
  // accumulate runaway loops on every navigation back.
  active: boolean;
}

const FloatingAsset: React.FC<FloatingAssetProps> = ({
  SvgComponent,
  radius,
  speed,
  startAngle,
  size,
  active,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
        // Decorative — don't block interaction priority queues.
        isInteraction: false,
      }),
    );
    loop.start();
    // Critical: stop the loop on unmount AND on `active` flip so we
    // don't leak overlapping loops on Fast Refresh / re-focus.
    return () => {
      loop.stop();
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
    };
  }, [animatedValue, speed, active]);

  const angle = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [`${startAngle}rad`, `${startAngle + Math.PI * 2}rad`],
  });

  const counterAngle = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [`${-startAngle}rad`, `${-(startAngle + Math.PI * 2)}rad`],
  });

  return (
    <Animated.View
      style={[styles.orbitContainer, { transform: [{ rotate: angle }] }]}
    >
      <Animated.View
        style={[
          styles.assetWrapper,
          { top: -radius, transform: [{ rotate: counterAngle }] },
        ]}
      >
        <View style={styles.svgWrapper}>
          <SvgComponent width={size} height={size} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const OnboardingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const baseSize = width;
  const illustrationHeight = baseSize * 1.1;
  // Make sure the "Sign In" link clears the Android gesture bar.
  // SafeAreaView from react-native doesn't pad the bottom on Android,
  // so we mix in the safe-area inset manually with a sensible floor.
  const bottomPadding = Math.max(scale(20), insets.bottom + scale(8));

  // Pause the orbit animations whenever the screen isn't focused —
  // saves a meaningful amount of CPU/GPU on slow devices and prevents
  // overlapping loops piling up across navigations / Fast Refresh.
  const [animationsActive, setAnimationsActive] = React.useState(true);
  useFocusEffect(
    useCallback(() => {
      setAnimationsActive(true);
      return () => setAnimationsActive(false);
    }, []),
  );

  const handleStartToday = () => {
    navigation.navigate('SignUp');
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={colors.bgGradient}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={[styles.illustrationContainer, { height: illustrationHeight }]}>
              
              {/* Purple Glow */}
              <View style={[styles.purpleGlow, { width: baseSize * 0.9, height: baseSize * 0.9, borderRadius: baseSize }]} />

              {/* Concentric Circles */}
              <View style={[styles.circleWrapper, { width: baseSize, height: illustrationHeight }]}>
                  <View style={[styles.ellipse22, { width: baseSize * 1.05, height: baseSize * 1.05, borderRadius: baseSize }]}>
                      <View style={[styles.ellipse21, { width: baseSize * 0.88, height: baseSize * 0.88, borderRadius: baseSize }]}>
                          <View style={[styles.ellipse23, { width: baseSize * 0.70, height: baseSize * 0.70, borderRadius: baseSize }]}>
                              <LinearGradient
                                  colors={[colors.accentLight, colors.accent]}
                                  style={[styles.ellipse24, { width: baseSize * 0.53, height: baseSize * 0.53, borderRadius: baseSize }]}
                              >
                                  <CenterTV
                                      width={baseSize * 0.38}
                                      height={baseSize * 0.28}
                                  />
                              </LinearGradient>
                          </View>
                      </View>
                  </View>
              </View>

              {/* Animated Orbits */}
              <FloatingAsset
                SvgComponent={CapIcon}
                size={scale(50)}
                radius={baseSize * 0.36}
                speed={8000}
                startAngle={-Math.PI / 1.5}
                active={animationsActive}
              />

              <FloatingAsset
                SvgComponent={GolobIcon}
                size={scale(60)}
                radius={baseSize * 0.38}
                speed={12000}
                startAngle={-Math.PI / 4}
                active={animationsActive}
              />

              <FloatingAsset
                SvgComponent={BooksIcon}
                size={scale(50)}
                radius={baseSize * 0.32}
                speed={10000}
                startAngle={Math.PI / 1.2}
                active={animationsActive}
              />

              <FloatingAsset
                SvgComponent={NoteIcon}
                size={scale(60)}
                radius={baseSize * 0.40}
                speed={15000}
                startAngle={Math.PI / 4}
                active={animationsActive}
              />
            </View>

            <View style={[styles.bottomSection, { paddingBottom: bottomPadding }]}>
              <Text style={styles.title}>
                Your Journey to{"\n"}Excellence Starts Here
              </Text>
              <Text style={styles.description}>
                With structured modules, AI-based practice tests, and personalized
                feedback, we help you master every section of the PTE exam step by
                step.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.buttonWrapper}
                onPress={handleStartToday}
                accessibilityRole="button"
                accessibilityLabel="Start Today"
                accessibilityHint="Creates a new account"
              >
                <LinearGradient
                  colors={[colors.accentLight, colors.accent]}
                  style={styles.startButton}
                >
                  <Text style={styles.startButtonText}>Start Today</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={handleSignIn}
                activeOpacity={0.7}
                hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
                accessibilityRole="button"
                accessibilityLabel="Already have an account? Sign In"
                accessibilityHint="Opens the sign in screen"
              >
                <Text style={styles.alreadyAccountText}>
                  Already have an account?{" "}
                </Text>
                <Text style={styles.signinText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },

  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(10),
  },
  circleWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  purpleGlow: {
    position: 'absolute',
    backgroundColor: colors.purpleGlow,
    opacity: 0.1,
    zIndex: -1,
  },
  orbitContainer: {
    position: 'absolute',
    width: 2,
    height: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  assetWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgWrapper: {
    // Removed background and border to eliminate "white boxes"
  },
  ellipse22: {
    backgroundColor: colors.ellipse1 + '1A', // ~10% opacity hex-alpha
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipse21: {
    backgroundColor: colors.ellipse2 + '26', // ~15% opacity hex-alpha
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipse23: {
    backgroundColor: colors.ellipse3 + '33', // ~20% opacity hex-alpha
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipse24: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.accentLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  bottomSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
    paddingBottom: scale(20),
  },
  title: {
    ...theme.typography.extraBold,
    fontSize: scale(26),
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: scale(12),
    lineHeight: scale(34),
  },
  description: {
    ...theme.typography.regular,
    fontSize: scale(14),
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(30),
  },
  buttonWrapper: {
    width: '90%',
    marginBottom: scale(20),
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  startButton: {
    width: '100%',
    height: scale(56),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    ...theme.typography.bold,
    color: colors.primary,
    fontSize: scale(17),
  },
  loginLink: {
    flexDirection: 'row',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyAccountText: {
    ...theme.typography.regular,
    color: colors.textWhite,
    fontSize: scale(14),
  },
  signinText: {
    ...theme.typography.bold,
    color: colors.textWhite,
    fontSize: scale(14),
    textDecorationLine: 'underline',
  },
});

export default OnboardingScreen;


