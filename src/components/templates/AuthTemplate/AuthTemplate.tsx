import React from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../../theme/colors';
import { ArrowLeftLineIcon } from '../../atoms/Icon';
import GirlIcon from '../../../assets/images/signIn/girl.svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const IMAGE_HEIGHT = Math.round(screenHeight * 0.40);

interface AuthTemplateProps {
  children: React.ReactNode;
  onBackPress?: () => void;
  footer?: React.ReactNode;
  type?: 'signin' | 'signup' | 'otp' | 'newpassword' | 'forgotpassword' | 'default';
}

const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
  onBackPress,
  footer,
  type: _type = 'default',
}) => {
  const isSignUp = _type === 'signup';
  const isSignIn = _type === 'signin' || _type === 'forgotpassword';
  const imageHeight = isSignUp 
    ? Math.round(screenHeight * 0.30) 
    : isSignIn 
      ? Math.round(screenHeight * 0.35) 
      : IMAGE_HEIGHT;
  
  const bottomPadding = footer ? scale(120) : scale(30);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.backgroundGradient}
      />

      {/* Hero image — fixed proportional height at the top */}
      <View style={[styles.imageArea, { height: imageHeight }]}>
        <GirlIcon width={screenWidth} height={imageHeight} />
      </View>

      {/* Card fills remaining space; arch footer absolute at bottom */}
      <View style={styles.cardContainer}>
        {onBackPress && (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <ArrowLeftLineIcon size={20} color={colors.text} strokeWidth={2.4} />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {children}
        </ScrollView>

        {footer && <View style={styles.footerContainer}>{footer}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageArea: {
    marginTop: scale(40),
    height: IMAGE_HEIGHT,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: scale(-36),
  },
  cardContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: scale(36),
    borderTopRightRadius: scale(36),
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(25),
    paddingTop: scale(18),
  },
  backButton: {
    position: 'absolute',
    left: scale(20),
    top: scale(18),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
});

export default AuthTemplate;
