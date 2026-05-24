import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { SubHeader } from '../../../components/molecules/SubHeader';
import {
  MicSolidIcon,
  CheckIcon,
  PlayInCircleIcon,
  StopInCircleIcon,
  PlayIcon,
  StopSquareIcon,
  InfoCircleOutlineIcon,
} from '../../../components/atoms/Icon';
import { scale } from './scale';
import { styles } from './styles';
import { MIC_TIPS, WAVE_BARS } from './constants';
import { useMicrophoneSetup } from './hooks/useMicrophoneSetup';
import { WaveformBar } from './components/WaveformBar';
import { MicPulse } from './components/MicPulse';
import { StepCard } from './components/StepCard';

export const MicrophoneSetupScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const setup = useMicrophoneSetup();

  return (
    <View style={styles.container}>
      <SubHeader
        title="Microphone Setup"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + scale(24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: animated mic with status badge */}
        <View style={styles.heroSection}>
          <MicPulse active={setup.isListening} />
          <View
            style={[
              styles.statusBadge,
              setup.step === 'complete' && styles.statusBadgeSuccess,
              setup.step === 'failed' && styles.statusBadgeFail,
              setup.isTesting && styles.statusBadgeTesting,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                setup.step === 'complete' && { backgroundColor: '#22C55E' },
                setup.step === 'failed' && { backgroundColor: '#EF4444' },
                setup.isTesting && { backgroundColor: '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {setup.step === 'permission'
                ? 'Awaiting Permission'
                : setup.step === 'testing' && setup.isTesting
                  ? `Recording... ${setup.testDuration}s`
                  : setup.step === 'testing' && !setup.isTesting
                    ? 'Ready to Test'
                    : setup.step === 'complete'
                      ? 'Microphone Working ✓'
                      : 'Permission Denied'}
            </Text>
          </View>
        </View>

        {/* Waveform visualizer */}
        <View style={styles.waveformCard}>
          <Text style={styles.waveformLabel}>Live Audio Level</Text>
          <View style={styles.waveformRow}>
            {Array.from({ length: WAVE_BARS }).map((_, i) => (
              <WaveformBar
                key={i}
                index={i}
                isActive={setup.isListening}
                amplitude={setup.meterAmplitude}
              />
            ))}
          </View>

          <View style={styles.dbRow}>
            <Text style={styles.dbLabel}>Input Level</Text>
            <View style={styles.volumeTrack}>
              <View
                style={[
                  styles.volumeFill,
                  {
                    width: `${setup.volumePercent}%`,
                    backgroundColor:
                      setup.volumePercent > 80
                        ? '#EF4444'
                        : setup.volumePercent > 50
                          ? '#F59E0B'
                          : '#94C23C',
                  },
                ]}
              />
            </View>
            <Text style={styles.dbValue}>
              {setup.isListening ? `${setup.levelDb} dB` : '– dB'}
            </Text>
          </View>
        </View>

        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for best results</Text>
          {MIC_TIPS.map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{t.icon}</Text>
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Setup Steps</Text>
          <StepCard
            number={1}
            title="Allow Microphone Access"
            description="Grant permission when prompted so the app can access your mic."
            done={setup.permissionGranted}
            active={setup.step === 'permission' && !setup.permissionGranted}
          />
          <StepCard
            number={2}
            title="Run the Mic Test"
            description="Tap 'Start Test' and speak for 5 seconds. We'll verify mic input."
            done={setup.testCompleted}
            active={setup.step === 'testing'}
          />
          <StepCard
            number={3}
            title="All Set!"
            description="Your mic is configured and ready for practice sessions."
            done={setup.step === 'complete'}
            active={setup.step === 'complete'}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {setup.step === 'permission' && !setup.permissionGranted && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                setup.isLoading && styles.disabledBtn,
              ]}
              onPress={setup.requestPermission}
              disabled={setup.isLoading}
            >
              {setup.isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MicSolidIcon size={scale(18)} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Allow Microphone</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {setup.step === 'testing' && (
            <>
              {!setup.isTesting ? (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    setup.isLoading && styles.disabledBtn,
                  ]}
                  onPress={setup.startMicTest}
                  disabled={setup.isLoading}
                >
                  {setup.isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <PlayInCircleIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        Start Mic Test
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    styles.stopBtn,
                    setup.isLoading && styles.disabledBtn,
                  ]}
                  onPress={setup.stopMicTest}
                  disabled={setup.isLoading}
                >
                  {setup.isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <StopInCircleIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        Stop Test ({setup.testDuration}s)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {setup.step === 'complete' && (
            <View style={styles.completeActions}>
              {!setup.isPlayingBack ? (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: '#007AFF',
                      shadowColor: '#007AFF',
                    },
                    setup.isLoading && styles.disabledBtn,
                  ]}
                  onPress={setup.startPlayback}
                  disabled={setup.isLoading}
                >
                  {setup.isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <PlayIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        Play Recording
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    styles.stopBtn,
                    setup.isLoading && styles.disabledBtn,
                  ]}
                  onPress={setup.stopPlayback}
                  disabled={setup.isLoading}
                >
                  {setup.isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <StopSquareIcon size={scale(18)} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        Stop Playback
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.successBtn,
                  setup.isLoading && styles.disabledBtn,
                ]}
                onPress={() => navigation.goBack()}
                disabled={setup.isLoading}
              >
                <CheckIcon size={scale(18)} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.primaryBtnText}>
                  Done — Start Practicing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  setup.isLoading && styles.disabledBtn,
                ]}
                onPress={setup.handleRetry}
                disabled={setup.isLoading}
              >
                <Text style={styles.secondaryBtnText}>Test Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {setup.step === 'failed' && (
            <View style={styles.completeActions}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.dangerBtn,
                  setup.isLoading && styles.disabledBtn,
                ]}
                onPress={() => Linking.openSettings()}
                disabled={setup.isLoading}
              >
                <InfoCircleOutlineIcon size={scale(18)} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Open Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  setup.isLoading && styles.disabledBtn,
                ]}
                onPress={setup.requestPermission}
                disabled={setup.isLoading}
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

export default MicrophoneSetupScreen;
