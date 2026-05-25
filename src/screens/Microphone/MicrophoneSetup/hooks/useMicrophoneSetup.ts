import { useCallback, useEffect, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  useAudioPlayer,
  useVoiceRecorder,
} from '../../../../hooks/practiceMedia';
import { useToast } from '../../../../context/ToastContext';
import { logger } from '../../../../services/logger';
import { IDLE_AMPLITUDE, MIC_TEST_DURATION_SEC } from '../constants';
import type { SetupStep } from '../types';

// Owns every piece of state, permission flow, recorder/player wiring,
// and meter sampling for the microphone setup screen so the screen body
// stays focused on layout.
export const useMicrophoneSetup = () => {
  const { showToast } = useToast();

  const [step, setStep] = useState<SetupStep>('permission');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Plain-number amplitude used as a fallback for the volume meter bar
  // (which wants a percentage value).
  const [meterAmplitude, setMeterAmplitude] = useState(IDLE_AMPLITUDE);

  const recorder = useVoiceRecorder({
    maxDurationSec: MIC_TEST_DURATION_SEC,
    onFinish: uri => {
      // Treat "no uri" as a failed test — happens when recording is empty
      // or interrupted before any audio was captured.
      if (!uri) {
        setStep('failed');
        setMeterAmplitude(IDLE_AMPLITUDE);
        return;
      }
      setTestCompleted(true);
      setStep('complete');
      setMeterAmplitude(IDLE_AMPLITUDE);
    },
    onError: (_err, code) => {
      switch (code) {
        case 'permission':
          setStep('failed');
          showToast('Microphone permission denied.', 'error');
          break;
        case 'interrupted':
          showToast(
            'Mic test was interrupted — please stay on this screen.',
            'error',
          );
          break;
        case 'empty':
          showToast(
            "We couldn't capture any audio. Check your mic and retry.",
            'error',
          );
          break;
        case 'start':
          showToast('Failed to start recording.', 'error');
          break;
        default:
          break;
      }
    },
  });

  const player = useAudioPlayer({
    onComplete: () => {
      setMeterAmplitude(IDLE_AMPLITUDE);
    },
  });

  // Mirror the recorder's `Animated.Value` into a plain number so the
  // volume percent bar (a static `width: x%` style) stays in sync.
  // Sampling at ~150ms is plenty for a level meter.
  useEffect(() => {
    if (!recorder.isRecording) return;
    const sub = recorder.amplitude.addListener(({ value }) => {
      setMeterAmplitude(value);
    });
    return () => recorder.amplitude.removeListener(sub);
  }, [recorder.amplitude, recorder.isRecording]);

  // Auto-check permissions on mount.
  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'android') {
        const recordGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (recordGranted) {
          setPermissionGranted(true);
          setStep('testing');
        }
      } else {
        // iOS shows the default mic permission request on record.
        setPermissionGranted(true);
        setStep('testing');
      }
    };
    checkPermissions();
  }, []);

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
          showToast(
            'Permission denied. Please enable in Settings.',
            'error',
          );
        } else {
          showToast('Microphone permission denied.', 'error');
        }
      } else {
        setPermissionGranted(true);
        setStep('testing');
        showToast('Microphone ready!', 'success');
      }
    } catch (err) {
      logger.warn('Permission error:', err);
      setStep('failed');
    }
  }, [showToast]);

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
    setMeterAmplitude(IDLE_AMPLITUDE);
    setIsLoading(false);
  }, [player]);

  // Loosely sync the level meter to playback progress for the "we're
  // listening to your recording" visual — the playback duration is
  // short, so a quick sine wave is enough to make the bar feel live
  // without needing real playback metering.
  useEffect(() => {
    if (!player.isPlaying || player.durationMs <= 0) return;
    const progress = player.positionMs / player.durationMs;
    setMeterAmplitude(
      IDLE_AMPLITUDE + Math.abs(Math.sin(progress * Math.PI * 10)) * 0.4,
    );
  }, [player.durationMs, player.isPlaying, player.positionMs]);

  // Derived UI state.
  const isTesting = recorder.isRecording;
  const testDuration = recorder.secondsRemaining;
  const isListening = recorder.isRecording || player.isPlaying;
  const levelDb = Math.round(meterAmplitude * 60 - 60);
  const volumePercent = Math.min(
    100,
    Math.max(0, Math.round(meterAmplitude * 100)),
  );

  return {
    step,
    permissionGranted,
    testCompleted,
    isLoading,
    meterAmplitude,
    isTesting,
    testDuration,
    isListening,
    levelDb,
    volumePercent,
    isPlayingBack: player.isPlaying,
    requestPermission,
    startMicTest,
    stopMicTest,
    startPlayback,
    stopPlayback,
    handleRetry,
  };
};
