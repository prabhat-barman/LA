import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  MicSolidIcon,
  CheckIcon,
  PlayInCircleIcon,
  StopInCircleIcon,
  PlayIcon,
  StopSquareIcon,
  InfoCircleOutlineIcon,
} from '../../components/atoms/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { useToast } from '../../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useVoiceRecorder } from '../../hooks/practiceMedia';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── Types ─────────────────────────────────────────────────────────────────────

type SetupStep = 'permission' | 'testing' | 'complete' | 'failed';

// ── Waveform Bar Component ────────────────────────────────────────────────────

const WaveformBar: React.FC<{
  // `index` is kept on the prop type so callers stay self-documenting even
  // though the component doesn't currently use it internally.
  index: number;
  isActive: boolean;
  amplitude: number;
}> = ({ isActive, amplitude }) => {
  const anim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Keep the loop instance in scope so we can stop it on unmount or when
    // isActive flips back to false — otherwise the loop keeps running and
    // leaks animation work on Android (where the JS thread cost is felt).
    const loop = isActive
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.2 + amplitude * Math.random(),
              duration: 150 + Math.random() * 250,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.1,
              duration: 100 + Math.random() * 150,
              useNativeDriver: false,
            }),
          ]),
        )
      : null;

    if (loop) {
      loop.start();
    } else {
      Animated.timing(anim, {
        toValue: 0.15,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      loop?.stop();
    };
  }, [isActive, amplitude, anim]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [scale(4), scale(48)],
  });

  const color = isActive ? '#94C23C' : '#D1D5DB';

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height,
          backgroundColor: color,
          opacity: isActive ? 1 : 0.4,
        },
      ]}
    />
  );
};

// ── Animated Mic Pulse ────────────────────────────────────────────────────────

const MicPulse: React.FC<{ active: boolean }> = ({ active }) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let composite: Animated.CompositeAnimation | null = null;
    if (active) {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.6,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
      composite = Animated.parallel([
        createPulse(pulse1, 0),
        createPulse(pulse2, 300),
        createPulse(pulse3, 600),
      ]);
      composite.start();
    } else {
      [pulse1, pulse2, pulse3].forEach(p =>
        Animated.timing(p, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(),
      );
    }
    return () => {
      composite?.stop();
    };
  }, [active, pulse1, pulse2, pulse3]);

  return (
    <View style={styles.pulseContainer}>
      {[pulse1, pulse2, pulse3].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: anim }],
              opacity: anim.interpolate({
                inputRange: [1, 1.6],
                outputRange: [active ? 0.3 - i * 0.08 : 0, 0],
              }),
              width: scale(72 + i * 24),
              height: scale(72 + i * 24),
              borderRadius: scale(36 + i * 12),
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.micCircle,
          active && styles.micCircleActive,
        ]}
      >
        <MicSolidIcon size={scale(36)} color={active ? '#FFFFFF' : '#94C23C'} />
      </View>
    </View>
  );
};

// ── Step Card ─────────────────────────────────────────────────────────────────

const StepCard: React.FC<{
  number: number;
  title: string;
  description: string;
  done: boolean;
  active: boolean;
}> = ({ number, title, description, done, active }) => (
  <View style={[styles.stepCard, active && styles.stepCardActive]}>
    <View
      style={[
        styles.stepNumber,
        done && styles.stepNumberDone,
        active && styles.stepNumberActive,
      ]}
    >
      {done ? (
        <CheckIcon size={scale(14)} color="#FFFFFF" strokeWidth={3} />
      ) : (
        <Text style={[styles.stepNumberText, active && { color: '#FFFFFF' }]}>
          {number}
        </Text>
      )}
    </View>
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, active && { color: '#1A2151' }]}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export const MicrophoneSetupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<SetupStep>('permission');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Plain-number amplitude used as a fallback for the volume meter bar (which
  // wants a percentage value). The shared `Animated.Value` from the recorder
  // hook drives the live waveform without re-rendering.
  const [meterAmplitude, setMeterAmplitude] = useState(0.15);
  const WAVE_BARS = 28;
  const MIC_TEST_DURATION_SEC = 5;

  // ── Recorder + Playback (shared hooks) ────────────────────────────────────
  const recorder = useVoiceRecorder({
    maxDurationSec: MIC_TEST_DURATION_SEC,
    onFinish: (_uri, _elapsed) => {
      setTestCompleted(true);
      setStep('complete');
      setMeterAmplitude(0.15);
    },
    onError: (_err, code) => {
      if (code === 'permission') {
        setStep('failed');
        showToast('Microphone permission denied.', 'error');
      } else {
        showToast('Failed to start recording.', 'error');
      }
    },
  });

  const player = useAudioPlayer({
    onComplete: () => {
      setMeterAmplitude(0.15);
    },
  });

  // Mirror the recorder's `Animated.Value` into a plain number so the volume
  // percent bar (a static `width: x%` style) stays in sync. We sample at
  // ~150ms which is plenty for a level meter and well under the per-frame
  // recorder push rate.
  useEffect(() => {
    if (!recorder.isRecording) return;
    const sub = recorder.amplitude.addListener(({ value }) => {
      setMeterAmplitude(value);
    });
    return () => recorder.amplitude.removeListener(sub);
  }, [recorder.amplitude, recorder.isRecording]);

  // ── Auto-check Permissions on Mount ────────────────────────────────────────

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'android') {
        const recordGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (recordGranted) {
          setPermissionGranted(true);
          setStep('testing');
        }
      } else {
        // iOS will show default mic permission request automatically on record
        setPermissionGranted(true);
        setStep('testing');
      }
    };
    checkPermissions();
  }, []);

  // ── Request Microphone Permission ─────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    setStep('permission');
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'Language Academy needs microphone access to test your mic and record practice answers.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionGranted(true);
          setStep('testing');
          showToast('Microphone permission granted!', 'success');
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setStep('failed');
          showToast('Permission denied. Please enable in Settings.', 'error');
        } else {
          showToast('Microphone permission denied.', 'error');
        }
      } else {
        setPermissionGranted(true);
        setStep('testing');
        showToast('Microphone ready!', 'success');
      }
    } catch (err) {
      console.warn('Permission error:', err);
      setStep('failed');
    }
  }, [showToast]);

  // ── Mic Test Functionality ────────────────────────────────────────────────

  const startMicTest = useCallback(async () => {
    setIsLoading(true);
    setTestCompleted(false);
    await recorder.start();
    setIsLoading(false);
  }, [recorder]);

  const stopMicTest = useCallback(async () => {
    setIsLoading(true);
    await recorder.stop();
    setIsLoading(false);
  }, [recorder]);

  const handleRetry = useCallback(() => {
    stopMicTest();
    setTestCompleted(false);
    setStep('testing');
  }, [stopMicTest]);

  // ── Playback Functions ──────────────────────────────────────────────────

  const startPlayback = useCallback(async () => {
    const uri = recorder.recording?.uri;
    if (!uri) {
      showToast('No recording found to play back.', 'error');
      return;
    }
    setIsLoading(true);
    await player.play(uri);
    setIsLoading(false);
  }, [player, recorder.recording, showToast]);

  const stopPlayback = useCallback(async () => {
    setIsLoading(true);
    await player.stop();
    setMeterAmplitude(0.15);
    setIsLoading(false);
  }, [player]);

  // Loosely sync the level meter to playback progress for the "we're listening
  // to your recording" visual — the playback duration is short, so a quick
  // sine wave is enough to make the bar feel live without needing real
  // playback metering (which the library doesn't expose).
  useEffect(() => {
    if (!player.isPlaying || player.durationMs <= 0) return;
    const progress = player.positionMs / player.durationMs;
    setMeterAmplitude(0.15 + Math.abs(Math.sin(progress * Math.PI * 10)) * 0.4);
  }, [player.durationMs, player.isPlaying, player.positionMs]);

  // ── Derived UI state ──────────────────────────────────────────────────────

  const isTesting = recorder.isRecording;
  const testDuration = recorder.secondsRemaining;
  const isListening = recorder.isRecording || player.isPlaying;
  const levelDb = Math.round(meterAmplitude * 60 - 60);
  const volumePercent = Math.min(100, Math.max(0, Math.round(meterAmplitude * 100)));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SubHeader title="Microphone Setup" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + scale(24) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: Animated Mic ─────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <MicPulse active={isListening} />

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              step === 'complete' && styles.statusBadgeSuccess,
              step === 'failed' && styles.statusBadgeFail,
              isTesting && styles.statusBadgeTesting,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                step === 'complete' && { backgroundColor: '#22C55E' },
                step === 'failed' && { backgroundColor: '#EF4444' },
                isTesting && { backgroundColor: '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {step === 'permission'
                ? 'Awaiting Permission'
                : step === 'testing' && isTesting
                ? `Recording... ${testDuration}s`
                : step === 'testing' && !isTesting
                ? 'Ready to Test'
                : step === 'complete'
                ? 'Microphone Working ✓'
                : 'Permission Denied'}
            </Text>
          </View>
        </View>

        {/* ── Waveform Visualizer ────────────────────────────────────────── */}
        <View style={styles.waveformCard}>
          <Text style={styles.waveformLabel}>Live Audio Level</Text>
          <View style={styles.waveformRow}>
            {Array.from({ length: WAVE_BARS }).map((_, i) => (
              <WaveformBar
                key={i}
                index={i}
                isActive={isListening}
                amplitude={meterAmplitude}
              />
            ))}
          </View>

          {/* dB meter */}
          <View style={styles.dbRow}>
            <Text style={styles.dbLabel}>Input Level</Text>
            <View style={styles.volumeTrack}>
              <View
                style={[
                  styles.volumeFill,
                  {
                    width: `${volumePercent}%`,
                    backgroundColor:
                      volumePercent > 80
                        ? '#EF4444'
                        : volumePercent > 50
                        ? '#F59E0B'
                        : '#94C23C',
                  },
                ]}
              />
            </View>
            <Text style={styles.dbValue}>{isListening ? `${levelDb} dB` : '– dB'}</Text>
          </View>
        </View>

        {/* ── Tips Card ─────────────────────────────────────────────────── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for best results</Text>
          {[
            { icon: '🔇', tip: 'Find a quiet room with minimal background noise' },
            { icon: '📏', tip: 'Hold device 15–20 cm from your mouth' },
            { icon: '🎙️', tip: "Don't cover the microphone with fingers" },
            { icon: '🔊', tip: 'Speak clearly at a normal conversational volume' },
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{t.icon}</Text>
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Steps ─────────────────────────────────────────────────────── */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Setup Steps</Text>
          <StepCard
            number={1}
            title="Allow Microphone Access"
            description="Grant permission when prompted so the app can access your mic."
            done={permissionGranted}
            active={step === 'permission' && !permissionGranted}
          />
          <StepCard
            number={2}
            title="Run the Mic Test"
            description="Tap 'Start Test' and speak for 5 seconds. We'll verify mic input."
            done={testCompleted}
            active={step === 'testing'}
          />
          <StepCard
            number={3}
            title="All Set!"
            description="Your mic is configured and ready for practice sessions."
            done={step === 'complete'}
            active={step === 'complete'}
          />
        </View>

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          {/* Permission Step */}
          {step === 'permission' && !permissionGranted && (
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.disabledBtn]}
              onPress={requestPermission}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MicSolidIcon size={scale(18)} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Allow Microphone</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Testing Step — Start / Stop */}
          {step === 'testing' && (
            <>
              {!isTesting ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.disabledBtn]}
                  onPress={startMicTest}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <PlayInCircleIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Start Mic Test</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.stopBtn, isLoading && styles.disabledBtn]}
                  onPress={stopMicTest}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <StopInCircleIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Stop Test ({testDuration}s)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <View style={styles.completeActions}>
              {!player.isPlaying ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#007AFF', shadowColor: '#007AFF' }, isLoading && styles.disabledBtn]}
                  onPress={startPlayback}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <PlayIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Play Recording</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.stopBtn, isLoading && styles.disabledBtn]}
                  onPress={stopPlayback}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <StopSquareIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Stop Playback</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, styles.successBtn, isLoading && styles.disabledBtn]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <CheckIcon size={scale(18)} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.primaryBtnText}>Done — Start Practicing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, isLoading && styles.disabledBtn]}
                onPress={handleRetry}
                disabled={isLoading}
              >
                <Text style={styles.secondaryBtnText}>Test Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Failed Step */}
          {step === 'failed' && (
            <View style={styles.completeActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.dangerBtn, isLoading && styles.disabledBtn]}
                onPress={() => Linking.openSettings()}
                disabled={isLoading}
              >
                <InfoCircleOutlineIcon size={scale(18)} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Open Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, isLoading && styles.disabledBtn]}
                onPress={requestPermission}
                disabled={isLoading}
              >
                <Text style={styles.secondaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(24),
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: scale(160),
    height: scale(160),
    marginBottom: scale(16),
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: '#94C23C',
  },
  micCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: '#F0F9E8',
    borderWidth: 2,
    borderColor: '#94C23C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#94C23C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  micCircleActive: {
    backgroundColor: '#94C23C',
    borderColor: '#78A832',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    gap: scale(6),
  },
  statusBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeFail: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeTesting: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#94C23C',
  },
  statusText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1A2151',
    fontWeight: '600',
  },

  // Waveform
  waveformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  waveformLabel: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#8E8E93',
    fontWeight: 'bold',
    marginBottom: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: scale(56),
    marginBottom: scale(12),
  },
  waveBar: {
    width: scale(6),
    borderRadius: scale(3),
    minHeight: scale(4),
  },
  dbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  dbLabel: {
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
    minWidth: scale(60),
  },
  volumeTrack: {
    flex: 1,
    height: scale(6),
    backgroundColor: '#F2F2F7',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: scale(3),
  },
  dbValue: {
    fontSize: scale(11),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontWeight: '600',
    minWidth: scale(42),
    textAlign: 'right',
  },

  // Tips
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    fontWeight: 'bold',
    marginBottom: scale(12),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(8),
    gap: scale(10),
  },
  tipIcon: {
    fontSize: scale(16),
    lineHeight: scale(22),
  },
  tipText: {
    flex: 1,
    fontSize: scale(13),
    color: '#4B5563',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(20),
  },

  // Steps
  stepsContainer: {
    marginBottom: scale(20),
  },
  stepsTitle: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A2151',
    fontWeight: 'bold',
    marginBottom: scale(12),
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: '#EAECEF',
    gap: scale(12),
  },
  stepCardActive: {
    borderColor: '#94C23C',
    backgroundColor: '#F7FEF0',
  },
  stepNumber: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberDone: {
    backgroundColor: '#94C23C',
  },
  stepNumberActive: {
    backgroundColor: '#1A2151',
  },
  stepNumberText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#8E8E93',
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: scale(2),
  },
  stepDescription: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9CA3AF',
    lineHeight: scale(18),
  },

  // Actions
  actionsContainer: {
    marginTop: scale(4),
  },
  completeActions: {
    gap: scale(10),
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2151',
    borderRadius: scale(14),
    paddingVertical: scale(15),
    gap: scale(8),
    shadowColor: '#1A2151',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  stopBtn: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  successBtn: {
    backgroundColor: '#94C23C',
    shadowColor: '#94C23C',
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  primaryBtnText: {
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#6B7280',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

export default MicrophoneSetupScreen;
