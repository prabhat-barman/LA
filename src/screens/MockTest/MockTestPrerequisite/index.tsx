import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tooltip } from '../../../components/organisms/Tooltip';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { TOUR_KEYS } from '../../../services/tourStorage';
import { useMockSession } from '../MockTestRunner/hooks/useMockSession';
import HeadsetCheckSlide from './components/HeadsetCheckSlide';
import IntroRecordingSlide from './components/IntroRecordingSlide';
import KeyboardCheckSlide from './components/KeyboardCheckSlide';
import MicrophoneCheckSlide from './components/MicrophoneCheckSlide';
import ModuleIntroSlide from './components/ModuleIntroSlide';
import SpeakingInstructionsSlide from './components/SpeakingInstructionsSlide';
import TestIntroductionSlide from './components/TestIntroductionSlide';
import WelcomeTableSlide from './components/WelcomeTableSlide';
import { buildSlideList } from './constants';
import {
  FOOTER_PADDING_BOTTOM,
  HEADER_PADDING_TOP,
  SCREEN_WIDTH,
  styles,
} from './styles';
import type {
  MockTestPrerequisiteRouteParams,
  PrerequisiteSlide,
} from './types';

type PrereqRouteProp = RouteProp<RootStackParamList, 'MockTestPrerequisite'>;
type PrereqNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'MockTestPrerequisite'
>;

export const MockTestPrerequisiteScreen: React.FC = () => {
  const route = useRoute<PrereqRouteProp>();
  const navigation = useNavigation<PrereqNavProp>();
  const insets = useSafeAreaInsets();
  const params: MockTestPrerequisiteRouteParams = route.params;

  const listRef = useRef<FlatList<PrerequisiteSlide>>(null);
  const slides = useMemo(() => buildSlideList(params.category), [params.category]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pre-fetches the mock detail so the runner can hot-read from the
  // React Query cache (staleTime 2 min, see useMockSession).
  // Resuming an attempt is funnelled through the same hook so the
  // breakdown reflects the original test layout, not just the
  // remaining questions.
  const sessionQuery = useMockSession({
    mockId: params.mockId,
    variant: params.variant,
    category: params.category,
    isResume: Boolean(params.resume),
  });

  // ── Per-slide gating ────────────────────────────────────────────
  //
  // Each slide tells the parent two things:
  //   1. ready — has the user satisfied the verification step?
  //   2. activity flag (audio playing / mic recording) — disables
  //      Next *while* the action is in progress, even if a previous
  //      pass already flipped ready=true.
  //
  // We key both maps by slide id (not index) so they survive any
  // future re-order of the carousel without leaking state across slides.
  const [readyById, setReadyById] = useState<Record<string, boolean>>({});
  const [activityById, setActivityById] = useState<Record<string, boolean>>({});
  // Personal-introduction audio captured by the `intro-recording`
  // slide. Lives at the parent so it survives slide re-renders and
  // can be threaded into runner route params on Start. Optional —
  // categories without the slide leave it null and the runner just
  // doesn't receive a path.
  const [personalIntroAudioPath, setPersonalIntroAudioPath] = useState<
    string | null
  >(null);

  const makeReadyHandler = useCallback(
    (id: string) => (ready: boolean) => {
      setReadyById(prev => (prev[id] === ready ? prev : { ...prev, [id]: ready }));
    },
    [],
  );

  const makeActivityHandler = useCallback(
    (id: string) => (active: boolean) => {
      setActivityById(prev =>
        prev[id] === active ? prev : { ...prev, [id]: active },
      );
    },
    [],
  );

  const currentSlide = slides[currentIndex];
  const currentReady = currentSlide ? readyById[currentSlide.id] === true : false;
  const currentBusy = currentSlide ? activityById[currentSlide.id] === true : false;
  const canAdvance = currentReady && !currentBusy;
  const isLastSlide = currentIndex === slides.length - 1;

  // ── Navigation handlers ─────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (!canAdvance) return;

    if (!isLastSlide) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      return;
    }

    // Last slide → enter the runner. `navigate` (not `replace`) is
    // deliberate: if the user pops back the prereq state is still
    // there and they avoid re-running headset/mic checks for a
    // second attempt of the same mock in the same session.
    navigation.replace('MockTestRunner', {
      mockId: params.mockId,
      variant: params.variant,
      category: params.category,
      title: params.title,
      resume: params.resume,
      // Only set when we actually captured one — keeping the route
      // shape stable means downstream code can use a simple existence
      // check without coordinating "empty string vs undefined".
      ...(personalIntroAudioPath
        ? { personalIntroAudioPath }
        : {}),
    });
  }, [
    canAdvance,
    isLastSlide,
    currentIndex,
    navigation,
    params.mockId,
    params.variant,
    params.category,
    params.title,
    params.resume,
    personalIntroAudioPath,
  ]);

  const handleBack = useCallback(() => {
    if (currentIndex === 0) {
      navigation.goBack();
      return;
    }
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    listRef.current?.scrollToIndex({ index: prevIndex, animated: true });
  }, [currentIndex, navigation]);

  // FlatList sometimes invokes onMomentumScrollEnd at exactly the
  // boundary between slides — sync the dot indicator from the actual
  // scroll position so it always agrees with what's on screen.
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (idx !== currentIndex && idx >= 0 && idx < slides.length) {
        setCurrentIndex(idx);
      }
    },
    [currentIndex, slides.length],
  );

  // ── Slide renderer ──────────────────────────────────────────────
  const renderSlide: ListRenderItem<PrerequisiteSlide> = useCallback(
    ({ item }) => {
      const readyHandler = makeReadyHandler(item.id);

      // Slides that depend on the prefetched session share the same
      // loading / error states, so factor that out once instead of
      // duplicating it per case.
      const renderSessionState = (
        ready: React.ReactElement,
      ): React.ReactElement => {
        if (sessionQuery.isLoading) {
          return (
            <View style={[styles.slide, styles.body]}>
              <ActivityIndicator size="large" color="#1A2151" />
              <Text style={styles.placeholder}>Preparing your test…</Text>
            </View>
          );
        }
        if (sessionQuery.isError || !sessionQuery.data) {
          return (
            <View style={[styles.slide, styles.body]}>
              <Text style={styles.errorText}>
                We couldn't load this test. Tap Back to try again.
              </Text>
            </View>
          );
        }
        return ready;
      };

      switch (item.kind) {
        case 'headset-check':
          return (
            <HeadsetCheckSlide
              onReadyChange={readyHandler}
              onPlayingChange={makeActivityHandler(item.id)}
            />
          );
        case 'microphone-check':
          return (
            <MicrophoneCheckSlide
              onReadyChange={readyHandler}
              onRecordingChange={makeActivityHandler(item.id)}
            />
          );
        case 'keyboard-check':
          return <KeyboardCheckSlide onReadyChange={readyHandler} />;
        case 'test-introduction':
          return <TestIntroductionSlide onReadyChange={readyHandler} />;
        case 'speaking-instructions':
          return <SpeakingInstructionsSlide onReadyChange={readyHandler} />;
        case 'welcome-table':
          return renderSessionState(
            <WelcomeTableSlide
              session={sessionQuery.data!}
              onReadyChange={readyHandler}
            />,
          );
        case 'intro-recording':
          return (
            <IntroRecordingSlide
              onReadyChange={readyHandler}
              onRecordingChange={makeActivityHandler(item.id)}
              onAudioCaptured={setPersonalIntroAudioPath}
            />
          );
        case 'module-intro':
          return renderSessionState(
            <ModuleIntroSlide
              session={sessionQuery.data!}
              mockTitle={params.title}
              onReadyChange={readyHandler}
            />,
          );
      }
    },
    [
      makeReadyHandler,
      makeActivityHandler,
      sessionQuery.isLoading,
      sessionQuery.isError,
      sessionQuery.data,
      params.title,
    ],
  );

  // ── Layout ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: HEADER_PADDING_TOP + insets.top },
        ]}
      >
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Pre-requisites · {params.category}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={item => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        // Swiping is disabled — only the Next/Back buttons drive the
        // carousel, mirroring the reference implementation. This
        // prevents the user from skipping past a headset/mic check
        // they haven't completed.
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.carousel}
      />

      <View style={styles.pagination}>
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: FOOTER_PADDING_BOTTOM + insets.bottom },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={currentIndex === 0 ? 'Exit pre-requisites' : 'Previous slide'}
        >
          <Text style={styles.backBtnText}>
            {currentIndex === 0 ? 'Exit' : 'Back'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !canAdvance && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!canAdvance}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdvance }}
          accessibilityLabel={isLastSlide ? 'Start the mock test' : 'Continue to next step'}
        >
          <Text style={styles.primaryBtnText}>
            {isLastSlide ? 'Start Test' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <Tooltip
        tourKey={TOUR_KEYS.MockTestPrerequisite}
        title="Before you start"
        body="Mocks are timed end-to-end. Make sure you have ~3 hours, a stable internet connection, and a quiet environment. Walk through these checks once and you're set."
      />
    </View>
  );
};

export default MockTestPrerequisiteScreen;
