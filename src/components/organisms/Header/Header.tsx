import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../../../assets/images/logo.svg';
import { BellIcon } from '../../atoms/Icon';
import styles from './Header.styles';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface HeaderProps {
  hasNotifications?: boolean;
  profileImage?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasNotifications = false,
  profileImage,
  onNotificationPress,
  onProfilePress,
}) => {
  const [imageError, setImageError] = useState(false);
  // Pull the top inset from the SafeAreaProvider so the header sits below
  // the status bar / notch / Dynamic Island on every device, instead of
  // relying on a hardcoded paddingTop that only happens to fit one phone.
  // Floor of 12 keeps a comfortable internal gap on devices that report
  // an inset of 0 (e.g. some Android emulators).
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 12);
  // Logo aspect ratio is 223 width / 93 height.
  // Standard header logo height is 34.
  const logoHeight = scale(34);
  const logoWidth = (logoHeight * 223) / 93;

  const fallbackUri = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const getCleanUri = () => {
    if (!profileImage ||
        profileImage === 'null' ||
        profileImage === 'undefined' ||
        profileImage.includes('/null') ||
        profileImage.includes('/undefined')) {
      return fallbackUri;
    }
    return profileImage;
  };

  const uri = imageError ? fallbackUri : getCleanUri();

  return (
    <View style={[styles.header, { paddingTop: topPad + scale(8) }]}>
      <View style={styles.logoContainer}>
        <Logo width={logoWidth} height={logoHeight} />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          accessibilityRole="button"
          accessibilityLabel={
            hasNotifications
              ? 'Notifications, you have unread updates'
              : 'Notifications'
          }
          accessibilityHint="Opens the notifications screen"
        >
          <BellIcon />
          {hasNotifications && <View style={styles.notificationDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityHint="Opens your profile"
        >
          <Image
            source={{ uri }}
            onError={() => setImageError(true)}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

