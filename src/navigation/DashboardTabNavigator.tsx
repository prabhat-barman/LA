import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { PracticeScreen } from '../screens/Practice/PracticeScreen';
import { MockTestScreen } from '../screens/MockTest/MockTestScreen';
import { VideosScreen } from '../screens/Videos/VideosScreen';
import { MenuScreen } from '../screens/Menu/MenuScreen';
import {
  HomeIcon,
  PracticeIcon,
  MockIcon,
  VideoIcon,
  MenuIcon,
} from '../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const INACTIVE_W = scale(50);
const ACTIVE_W   = scale(114);
const TAB_H      = scale(46);

export type DashboardTabParamList = {
  Home: undefined;
  Practice: undefined;
  Mock: undefined;
  Videos: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<DashboardTabParamList>();

/* ─── Single Animated Tab Item ─── */
interface TabItemProps {
  isFocused: boolean;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}

const AnimatedTabItem: React.FC<TabItemProps> = ({
  isFocused,
  icon: IconComponent,
  label,
  onPress,
  onLongPress,
}) => {
  // JS-driver animations (layout/color — cannot use native driver)
  const widthAnim  = useRef(new Animated.Value(isFocused ? ACTIVE_W : INACTIVE_W)).current;
  const bgAnim     = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  // Collapse text width to 0 when inactive so icon stays perfectly centered
  const textWidth  = useRef(new Animated.Value(isFocused ? 72 : 0)).current;

  // Native-driver animations (opacity only)
  const textOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const iconOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;

  useEffect(() => {
    // JS-driver group
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isFocused ? ACTIVE_W : INACTIVE_W,
        useNativeDriver: false,
        speed: 28,
        bounciness: 0,
      }),
      Animated.timing(bgAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(textWidth, {
        toValue: isFocused ? 72 : 0,
        duration: isFocused ? 180 : 80,
        useNativeDriver: false,
      }),
      // textOpacity must be JS-driver because it shares Animated.Text with textWidth (JS)
      Animated.timing(textOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: isFocused ? 160 : 60,
        useNativeDriver: false,
      }),
    ]).start();

    // Native-driver group (iconOpacity is on its own Animated.View — safe to use native)
    Animated.timing(iconOpacity, {
      toValue: isFocused ? 1 : 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Animated.Value refs are stable across renders, but the linter can't see
    // that — listing them silences the warning and is correct semantically.
  }, [isFocused, bgAnim, iconOpacity, textOpacity, textWidth, widthAnim]);

  const pillBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', '#94C23C'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={styles.tabTouchable}
    >
      <Animated.View style={[styles.pill, { width: widthAnim, backgroundColor: pillBg }]}>
        {/* Icon — always white, dimmed when inactive */}
        <Animated.View style={[styles.iconWrap, { opacity: iconOpacity }]}>
          <IconComponent size={scale(20)} color="#FFFFFF" />
        </Animated.View>

        {/* Label — collapses to 0 width when inactive, so icon stays centered */}
        <Animated.Text
          numberOfLines={1}
          style={[styles.activeTabText, { opacity: textOpacity, width: textWidth }]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ─── Custom Tab Bar ─── */
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const tabs: {
    name: keyof DashboardTabParamList;
    icon: React.ComponentType<{ size: number; color: string }>;
    label: string;
  }[] = [
    { name: 'Home',     icon: HomeIcon,     label: 'Home'      },
    { name: 'Practice', icon: PracticeIcon, label: 'Practice'  },
    { name: 'Mock',     icon: MockIcon,     label: 'Mock Test'  },
    { name: 'Videos',   icon: VideoIcon,    label: 'Videos'    },
    { name: 'Menu',     icon: MenuIcon,     label: 'More'      },
  ];

  return (
    <View style={styles.bottomTabContainer}>
      <View style={styles.bottomTabContent}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = tabs[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <AnimatedTabItem
              key={route.key}
              isFocused={isFocused}
              icon={tab.icon}
              label={tab.label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

/* ─── Navigator ─── */
export const DashboardTabNavigator = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home"     component={DashboardScreen} />
        <Tab.Screen name="Practice" component={PracticeScreen}  />
        <Tab.Screen name="Mock"     component={MockTestScreen}  />
        <Tab.Screen name="Videos"   component={VideosScreen}    />
        <Tab.Screen name="Menu"     component={MenuScreen}      />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabContainer: {
    backgroundColor: '#0D112B',
    borderRadius: scale(34),
    marginHorizontal: scale(14),
    marginBottom: scale(20),
    height: scale(64),
    justifyContent: 'center',
    shadowColor: '#94C23C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  bottomTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: scale(6),
  },
  tabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: INACTIVE_W,
    height: TAB_H,
  },
  pill: {
    height: TAB_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(23),
    paddingHorizontal: scale(6),
  },
  iconWrap: {
    width: scale(26),
    height: scale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontWeight: '700',
    marginLeft: scale(5),
    letterSpacing: 0.2,
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
});
