import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { logger } from '../../services/logger';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');
const scale = (s: number) => (width / 375) * s;

// Persisted across launches so we never replay the walkthrough for
// returning users. Stored under a versioned key so we can re-prompt
// folks after a major redesign (`WALKTHROUGH_V2`) without wiping
// every other AsyncStorage key.
export const WALKTHROUGH_STORAGE_KEY = 'walkthrough:seen_v1';

interface Slide {
  key: string;
  title: string;
  body: string;
  // Decorative emoji placeholder for the hero illustration. Replace
  // with real `<Image>` assets once the design system ships them —
  // wrap inside the `<HeroBubble>` component below so the layout
  // doesn't change.
  glyph: string;
  accent: string;
}

// Three slides that mirror the legacy walkthrough's value props.
// Copy is tightened slightly because in-app copy needs to read
// faster than the old marketing-heavy strings.
const SLIDES: Slide[] = [
  {
    key: 'practice',
    title: 'Real Practice Questions',
    body: 'Curated, regularly updated PTE-Academic and PTE-Core questions so every session feels like the real exam.',
    glyph: '\u270D\uFE0F',
    accent: '#007AFF',
  },
  {
    key: 'ai-scoring',
    title: 'Instant AI Scoring',
    body: 'Submit and see your score in seconds, with sub-skill feedback you can actually act on.',
    glyph: '\u26A1',
    accent: '#34C759',
  },
  {
    key: 'mock-tests',
    title: 'Full Mock Tests',
    body: 'Take timed Full, Normal, and Extensive mocks scored end-to-end — with a complete scorecard and tutor analysis.',
    glyph: '\uD83C\uDFAF',
    accent: '#FF9500',
  },
];

export const WalkthroughScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  // Capture the final scroll position so the indicator and the
  // primary CTA stay in sync. We round because Android sometimes
  // sends fractional offsets on rapid swipes.
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
    },
    [],
  );

  // Single exit path — used by both "Skip" and "Get Started" so the
  // persisted flag is always set even if the user chose to skip.
  const finishAndContinue = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, '1');
    } catch (err) {
      logger.warn('[Walkthrough] failed to persist seen flag', err);
    }
    navigation.replace('Onboarding');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finishAndContinue();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [index, finishAndContinue]);

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={finishAndContinue}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList<Slide>
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        renderItem={({ item }) => <SlideView slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        bounces={false}
      />

      <View style={styles.dotRow}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              i === index && { backgroundColor: SLIDES[index].accent },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: SLIDES[index].accent }]}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryBtnLabel}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

interface SlideViewProps {
  slide: Slide;
}

const SlideView: React.FC<SlideViewProps> = ({ slide }) => (
  <View style={styles.slide}>
    <View style={[styles.hero, { backgroundColor: `${slide.accent}1A` }]}>
      <Text style={styles.heroGlyph}>{slide.glyph}</Text>
    </View>
    <Text style={styles.slideTitle}>{slide.title}</Text>
    <Text style={styles.slideBody}>{slide.body}</Text>
  </View>
);

export default WalkthroughScreen;

// Returns the persisted "user has seen the walkthrough" flag.
// Surfaced as a helper so the Splash route gate can call it without
// importing AsyncStorage directly.
export const hasSeenWalkthrough = async (): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    return v === '1';
  } catch {
    // On storage failure assume seen — otherwise a corrupt storage
    // layer would loop the user back to the walkthrough every
    // launch.
    return true;
  }
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
  },
  skipText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  slide: {
    width,
    paddingHorizontal: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: scale(220),
    height: scale(220),
    borderRadius: scale(120),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(36),
    marginTop: height < 700 ? scale(8) : scale(28),
  },
  heroGlyph: {
    fontSize: scale(96),
  },
  slideTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: '#1C1F2A',
    marginBottom: scale(10),
    textAlign: 'center',
  },
  slideBody: {
    fontSize: scale(14),
    color: '#48484A',
    lineHeight: scale(22),
    textAlign: 'center',
    paddingHorizontal: scale(8),
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#D1D5DB',
    marginHorizontal: scale(4),
  },
  footer: {
    paddingHorizontal: scale(24),
    paddingBottom: scale(20),
  },
  primaryBtn: {
    paddingVertical: scale(14),
    borderRadius: scale(14),
    alignItems: 'center',
  },
  primaryBtnLabel: {
    color: '#FFFFFF',
    fontSize: scale(16),
    fontWeight: '700',
  },
});
