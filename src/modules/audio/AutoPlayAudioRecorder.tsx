import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ViewStyle,
} from "react-native";
import Sound from "react-native-nitro-sound";
import { logger } from "../../utils/logger";
import {
  Colors,
  fonts,
} from "../../assets/font_color_&_family/font_color_and_family";
import { useToast } from "../../context/ToastContext";
import RNFS from "react-native-fs";
import AudioStore from "./AudioStore";
import AudioPlaybackBar from "./AudioPlaybackBar";

// Inline config
const AudioConfig = {
  AUDIO_LOAD_TIMEOUT: 15000,
};
const AudioErrorMessages = {
  RECORDING_FAILED: "Recording failed. Please try again.",
};

const { width } = Dimensions.get("window");

export interface AutoPlayAudioRecorderProps {
  audioUrl?: string | null;
  audioStartDelay?: number;
  recordingStartDelay?: number;
  recordingDuration?: number;
  showAudio?: boolean;
  hideStopButton?: boolean;
  isExtensive?: boolean;
  onProcessComplete?: (data: any) => void;
  onAudioComplete?: () => void;
  onRecordingStart?: () => void;
  onRecordingComplete?: (data: { filePath: string; duration: number }) => void;
  onRecordingData?: (data: any) => void;
  onPhaseChange?: (phase: string) => void;
  onStatusChange?: (status: {
    phase: string;
    isAudioPlaying: boolean;
    isCountdownActive: boolean;
    isRecording: boolean;
    isCompleted: boolean;
  }) => void;
  componentKey?: string;
  borderColor?: string;
  stopButtonShow?: boolean;
  isPaused?: boolean;
  isDarkMode?: boolean;
}

export interface AutoPlayAudioRecorderRef {
  stopRecording: () => Promise<{ filePath: string; duration: number } | undefined>;
  cleanup: () => Promise<void>;
  stopAudio: () => Promise<void>;
  isCompleted: () => boolean;
}

const AutoPlayAudioRecorder = forwardRef<AutoPlayAudioRecorderRef, AutoPlayAudioRecorderProps>(
  (
    {
      audioUrl,
      audioStartDelay = 0,
      recordingStartDelay = 0,
      recordingDuration = 40,
      showAudio = true,
      hideStopButton = false,
      isExtensive = false,
      onProcessComplete,
      onAudioComplete,
      onRecordingStart,
      onRecordingComplete,
      onRecordingData,
      onPhaseChange,
      onStatusChange,
      componentKey,
      borderColor,
      stopButtonShow = true,
      isPaused = false,
      isDarkMode = false,
    },
    ref,
  ) => {
    // --- Lifecycle Guard ---
    const isMounted = useRef(true);
    const isPausedRef = useRef(isPaused);
    const wasPausedRef = useRef(false);
    const pausedPhaseRef = useRef<string | null>(null);

    const { showToast } = useToast();

    // Update isPausedRef whenever prop changes
    useEffect(() => {
      isPausedRef.current = isPaused;
    }, [isPaused]);

    // Audio states
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [audioCompleted, setAudioCompleted] = useState(false);

    // Timer states
    const [audioCountdown, setAudioCountdown] = useState(audioStartDelay || 0);
    const [recordingCountdown, setRecordingCountdown] = useState(0);

    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingCompleted, setRecordingCompleted] = useState(false);
    const [finalRecordingDuration, setFinalRecordingDuration] = useState(0);

    // Process states
    const [currentPhase, setCurrentPhase] = useState("waiting");
    const [processCompleted, setProcessCompleted] = useState(false);
    const [forceStopped, setForceStopped] = useState(false);
    const isInitializedRef = useRef(false);
    const stateLockRef = useRef(false);

    // Notify parent of status changes
    useEffect(() => {
      if (onPhaseChange) {
        onPhaseChange(currentPhase);
      }
      if (onStatusChange) {
        onStatusChange({
          phase: currentPhase,
          isAudioPlaying: currentPhase === "playing-audio",
          isCountdownActive:
            currentPhase === "audio-countdown" ||
            currentPhase === "recording-countdown",
          isRecording: currentPhase === "recording",
          isCompleted: currentPhase === "completed",
        });
      }
    }, [currentPhase, onPhaseChange, onStatusChange]);

    // Timers & Audio References
    const audioCountdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordingCountdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordingDurationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRecorderPlayer = Sound;
    const recordingStartTime = useRef<number | null>(null);
    const latestRecordingTime = useRef(0);
    const isRecordingActive = useRef(false);
    const hasProcessStarted = useRef(false);
    const hasAudioStartedRef = useRef(false);
    const audioLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioPlaybackId = useRef(
      `autoplay-audio-${componentKey || Date.now()}`,
    );
    const startRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startRecordingCountdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper for safe state updates
    const safeSetState = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
      if (isMounted.current) setter(value);
    }, []);

    const cleanup = useCallback(() => {
      if (audioLoadTimeoutRef.current)
        clearTimeout(audioLoadTimeoutRef.current);
      if (audioCountdownTimer.current)
        clearInterval(audioCountdownTimer.current);
      if (recordingCountdownTimer.current)
        clearInterval(recordingCountdownTimer.current);
      if (recordingDurationTimer.current)
        clearTimeout(recordingDurationTimer.current);

      if (startRecordingTimerRef.current)
        clearTimeout(startRecordingTimerRef.current);
      if (startRecordingCountdownTimerRef.current)
        clearTimeout(startRecordingCountdownTimerRef.current);

      if (isRecordingActive.current) {
        try {
          audioRecorderPlayer.removeRecordBackListener();
          audioRecorderPlayer.stopRecorder().catch(() => { });
        } catch (_) {}
        isRecordingActive.current = false;
      }
    }, [audioRecorderPlayer]);

    const stopRecording = useCallback(async () => {
      if (!isRecordingActive.current) return;

      if (isPaused || wasPausedRef.current) {
        try {
          logger.log("🔄 Recording was paused, resuming before final stop...");
          await audioRecorderPlayer.resumeRecorder();
            await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));
        } catch (e) {
          logger.log("⚠️ Failed to resume before stop (non-fatal):", e);
        }
      }

      const finalDuration = latestRecordingTime.current;

      isRecordingActive.current = false;
      safeSetState(setFinalRecordingDuration, finalDuration);
      safeSetState(setIsRecording, false);
      safeSetState(setRecordingCompleted, true);
      safeSetState(setCurrentPhase, "completed");
      safeSetState(setProcessCompleted, true);

      try {
        audioRecorderPlayer.removeRecordBackListener();
        let result = await audioRecorderPlayer.stopRecorder();

        if (
          typeof result === "string" &&
          (result === "Already stopped" || result.includes("Not recording"))
        ) {
          result = "";
        }

        const normalizedResult = result && !result.startsWith("file://") && !result.startsWith("content://")
          ? `file://${result}`
          : result;

        if (onRecordingComplete) {
          onRecordingComplete({
            filePath: normalizedResult,
            duration: finalDuration,
          });
        }

        if (onProcessComplete) {
          onProcessComplete({
            audioCompleted,
            recordingCompleted: true,
            recordingDuration: finalDuration,
            processCompleted: true,
            recordingFilePath: normalizedResult,
            isCompleted: true,
          });
        }
        return {
          filePath: normalizedResult,
          duration: finalDuration,
        };
      } catch (error) {
        logger.error("Error stopping recording:", error);
      }
    }, [
      audioCompleted,
      onRecordingComplete,
      onProcessComplete,
      audioRecorderPlayer,
      safeSetState,
      isPaused,
    ]);

    const isStartingRef = useRef(false);

    const startRecording = useCallback(
      async (isRetry: boolean = false) => {
        if (stateLockRef.current || !isMounted.current) return;
        stateLockRef.current = true;

        try {
          try {
            await AudioStore.stop();
          } catch (e) { }

          // 🚀 Immediate UI Feedback
          safeSetState(setCurrentPhase, "recording");
          safeSetState(setIsRecording, true);
          safeSetState(setRecordingTime, 0);
          latestRecordingTime.current = 0;
          recordingStartTime.current = Date.now();

          await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));

          isRecordingActive.current = true;
          const path = Platform.select({
            ios: undefined,
            android: `${RNFS.CachesDirectoryPath}/${Date.now()}.mp4`,
          });

          logger.log("🎙️ RECORDING STARTED", { path });
          await audioRecorderPlayer.startRecorder(path, undefined, true);

          audioRecorderPlayer.addRecordBackListener((e) => {
            if (!isMounted.current) return;
            const currentRecordingTime = Math.floor((e.currentPosition || 0) / 1000);
            latestRecordingTime.current = currentRecordingTime;
            safeSetState(setRecordingTime, currentRecordingTime);
            if (onRecordingData) onRecordingData(e);

            if (
              currentRecordingTime >= recordingDuration &&
              isRecordingActive.current
            ) {
              stopRecording();
            }
          });

          if (onRecordingStart) onRecordingStart();
        } catch (error: any) {
          logger.error("Error starting recording:", error);

          if (!isRetry && error?.message?.includes("already been called")) {
            logger.log("🔄 Audio state stuck, attempting one last reset and retry...");
            try {
              await audioRecorderPlayer.stopRecorder();
            } catch (e) { }
            await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
            isStartingRef.current = false;
            return startRecording(true);
          }

          isRecordingActive.current = false;
          showToast(AudioErrorMessages.RECORDING_FAILED, "error");
          safeSetState(setIsRecording, false);
          safeSetState(setCurrentPhase, "completed");
        } finally {
          stateLockRef.current = false;
        }
      },
      [
        recordingDuration,
        onRecordingStart,
        onRecordingData,
        audioRecorderPlayer,
        safeSetState,
        stopRecording,
        showToast,
      ],
    );

    const startRecordingCountdown = useCallback(() => {
      if (recordingCountdownTimer.current)
        clearInterval(recordingCountdownTimer.current);

      if (recordingStartDelay <= 0) {
        startRecording();
        return;
      }

      recordingCountdownTimer.current = setInterval(() => {
        if (!isMounted.current) return;
        if (isPausedRef.current) return;

        setRecordingCountdown((prev) => {
          if (prev <= 1) {
            if (recordingCountdownTimer.current) clearInterval(recordingCountdownTimer.current);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, [recordingStartDelay, startRecording]);

    const handleAudioSkippedOrFinished = useCallback(() => {
      safeSetState(setAudioCompleted, true);
      safeSetState(setIsAudioLoading, false);

      if (onAudioComplete) onAudioComplete();

      if (!recordingDuration || recordingDuration <= 0) {
        safeSetState(setCurrentPhase, "completed");
        safeSetState(setProcessCompleted, true);
        if (onProcessComplete) onProcessComplete(null);
        return;
      }

      if (recordingStartDelay > 0) {
        safeSetState(setCurrentPhase, "recording-countdown");
        safeSetState(setRecordingCountdown, recordingStartDelay);
        startRecordingCountdownTimerRef.current = setTimeout(
          () => startRecordingCountdown(),
          200,
        );
      } else {
        startRecordingTimerRef.current = setTimeout(
          () => startRecording(),
          200,
        );
      }
    }, [
      recordingDuration,
      recordingStartDelay,
      onAudioComplete,
      onProcessComplete,
      startRecordingCountdown,
      safeSetState,
      startRecording,
    ]);

    const onAudioEnd = useCallback(() => {
      AudioStore.stop().catch(() => { });
      if (audioCompleted) return;
      handleAudioSkippedOrFinished();
    }, [audioCompleted, handleAudioSkippedOrFinished]);

    const handleAudioError = useCallback(
      (error: any) => {
        if (!isMounted.current) return;
        logger.error("Audio playback error:", error);

        if (isAudioLoading) {
          showToast("Failed to play audio. Proceeding...", "error");
          AudioStore.stop().catch(() => { });
          handleAudioSkippedOrFinished();
        }
      },
      [isAudioLoading, handleAudioSkippedOrFinished, showToast],
    );

    const handleAudioPlayTimeChange = useCallback(
      (position: number, duration: number) => {
        if (!isMounted.current) return;

        if (
          currentPhase !== "playing-audio" &&
          currentPhase !== "audio-countdown"
        ) {
          if (
            position > 0 &&
            (currentPhase === "recording" ||
              currentPhase === "recording-countdown" ||
              currentPhase === "completed")
          ) {
            AudioStore.stop().catch(() => { });
          }
          return;
        }

        safeSetState(setAudioCurrentTime, position);
        safeSetState(setAudioDuration, duration);

        if (isAudioLoading && position > 0) {
          safeSetState(setIsAudioLoading, false);
          if (audioLoadTimeoutRef.current) {
            clearTimeout(audioLoadTimeoutRef.current);
            audioLoadTimeoutRef.current = null;
          }
        }

        if (duration > 0 && position >= duration - 0.5 && !audioCompleted) {
          onAudioEnd();
        }
      },
      [audioCompleted, isAudioLoading, onAudioEnd, safeSetState, currentPhase],
    );

    useEffect(() => {
      isMounted.current = true;
      const unsubscribeStore = AudioStore.subscribe((state) => {
        if (state.id === audioPlaybackId.current) {
          safeSetState(setIsAudioLoading, state.loading);
        }
      });

      return () => {
        isMounted.current = false;
        unsubscribeStore();
        cleanup();
      };
    }, [cleanup, safeSetState]);

    const startAudioCountdown = useCallback(() => {
      if (audioCountdownTimer.current)
        clearInterval(audioCountdownTimer.current);

      audioCountdownTimer.current = setInterval(() => {
        if (!isMounted.current) return;
        if (isPausedRef.current) return;

        setAudioCountdown((prev) => {
          if (prev <= 1) {
            if (audioCountdownTimer.current) clearInterval(audioCountdownTimer.current);
            safeSetState(setCurrentPhase, "playing-audio");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, [safeSetState]);

    useEffect(() => {
      if (isPaused && !wasPausedRef.current) {
        pausedPhaseRef.current = currentPhase;
        if (audioLoadTimeoutRef.current) {
          clearTimeout(audioLoadTimeoutRef.current);
          audioLoadTimeoutRef.current = null;
        }

        if (pausedPhaseRef.current === "playing-audio") {
          logger.log("⏸️ Pausing audio. ID:", audioPlaybackId.current);
          AudioStore.pause().catch((e) => logger.log("Pause audio error:", e));
        }

        if (
          pausedPhaseRef.current === "recording" &&
          isRecordingActive.current
        ) {
          logger.log("⏸️ Pausing recording.");
          audioRecorderPlayer
            .pauseRecorder()
            .catch((e) => logger.log("Pause recorder error:", e));
        }

        wasPausedRef.current = true;
      } else if (!isPaused && wasPausedRef.current && pausedPhaseRef.current) {
        const phaseToResume = pausedPhaseRef.current;
        wasPausedRef.current = false;
        pausedPhaseRef.current = null;

        logger.log("🔄 Resuming from phase:", phaseToResume);

        if (phaseToResume === "playing-audio") {
          AudioStore.resume().catch((e) => {
            logger.log("Resume audio error, retrying play:", e);
            AudioStore.play(audioPlaybackId.current, audioUrl || "").catch((e2) =>
              logger.log("Fallback play error:", e2),
            );
          });

          if (isAudioLoading) {
            audioLoadTimeoutRef.current = setTimeout(() => {
              if (isMounted.current && isAudioLoading) {
                logger.log("⚠️ Audio load timeout after resume - proceeding...");
                AudioStore.stop().catch(() => { });
                handleAudioSkippedOrFinished();
              }
            }, AudioConfig.AUDIO_LOAD_TIMEOUT);
          }
        } else if (phaseToResume === "recording") {
          audioRecorderPlayer
            .resumeRecorder()
            .catch((e) => logger.log("Resume recorder error:", e));
        }
      }
    }, [
      isPaused,
      audioUrl,
      startAudioCountdown,
      startRecordingCountdown,
      isAudioLoading,
      handleAudioSkippedOrFinished,
      audioRecorderPlayer,
      currentPhase,
    ]);

    useEffect(() => {
      if (isInitializedRef.current && currentPhase !== "waiting") {
        return;
      }

      const initializeProcess = async () => {
        try {
          if (!isMounted.current) return;

          logger.log("🔄 AutoPlayAudioRecorder: Starting initialization...", {
            componentKey,
            currentPhase,
            audioUrl,
          });
          isInitializedRef.current = true;
          hasProcessStarted.current = true;

          if (recordingDuration > 0 && Platform.OS === "android") {
            try {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              );
              if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                logger.log("⚠️ Permission denied, completing.");
                safeSetState(setCurrentPhase, "completed");
                return;
              }
            } catch (err) {
              logger.log("❌ Permission error, completing:", err);
              safeSetState(setCurrentPhase, "completed");
              return;
            }
          }

          const hasValidUrl = !!(
            audioUrl &&
            typeof audioUrl === "string" &&
            audioUrl.trim() !== ""
          );

          if (showAudio && hasValidUrl) {
            if (hasAudioStartedRef.current) {
              logger.log("⏭️ Audio already started, skipping logic.");
              return;
            }
            hasAudioStartedRef.current = true;

            const currentAudioState = AudioStore.getCurrentState();
            if (
              currentAudioState.id === audioPlaybackId.current &&
              (currentAudioState.playing || currentAudioState.loading)
            ) {
              if (currentPhase !== "playing-audio" && !isAudioLoading) {
                safeSetState(setCurrentPhase, "playing-audio");
              }
              if (currentPhase === "playing-audio") return;
            }

            if (audioPlaybackId.current && audioUrl) {
              AudioStore.load(audioPlaybackId.current, audioUrl).catch((err) => {
                logger.log("Audio preload warning:", err);
              });
            }

            safeSetState(setIsAudioLoading, true);
            safeSetState(setCurrentPhase, "audio-countdown");
            safeSetState(setAudioCountdown, audioStartDelay);

            audioLoadTimeoutRef.current = setTimeout(() => {
              if (isMounted.current && isAudioLoading) {
                logger.log("⚠️ Audio load timeout - auto-proceeding...");
                AudioStore.stop().catch(() => { });
                handleAudioSkippedOrFinished();
              }
            }, AudioConfig.AUDIO_LOAD_TIMEOUT);

            startAudioCountdown();
          } else {
            handleAudioSkippedOrFinished();
          }
        } catch (error) {
          logger.error("❌ initializeProcess CRASHED:", error);
          handleAudioSkippedOrFinished();
        }
      };

      initializeProcess();
    }, [
      showAudio,
      audioUrl,
      recordingStartDelay,
      audioStartDelay,
      handleAudioSkippedOrFinished,
      safeSetState,
      recordingDuration,
      startAudioCountdown,
      isPaused,
      componentKey,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        stopRecording,
        cleanup: async () => {
          cleanup();
          setForceStopped(true);
          safeSetState(setIsAudioLoading, false);
          safeSetState(setCurrentPhase, "completed");
          safeSetState(setProcessCompleted, true);
          try {
            await AudioStore.stop();
          } catch (err) {
            logger.log("⚠️ Error stopping AudioStore during cleanup:", err);
          }
        },
        stopAudio: async () => {
          try {
            await AudioStore.stop();
          } catch (err) {
            logger.log("⚠️ Error stopping AudioStore:", err);
          }
        },
        isCompleted: () => currentPhase === "completed" || forceStopped,
      }),
      [stopRecording, cleanup, safeSetState, currentPhase, forceStopped],
    );

    const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

    const formatTime = (timeInSeconds: number) => {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const renderCurrentPhase = () => {
      switch (currentPhase) {
        case "audio-countdown":
          return (
            <View
              style={[
                styles.countdownContainer,
                isExtensive && styles.extensiveCountdownBox,
              ]}
            >
              <Text
                style={[
                  styles.countdownText,
                  isExtensive && styles.extensiveCountdownText,
                ]}
              >
                Audio will start in {audioCountdown} second
                {audioCountdown !== 1 ? "s" : ""}
              </Text>
              {isAudioLoading && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator
                    size="small"
                    color={borderColor || "#1b4e73"}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDarkMode ? "#BBBBBB" : "#1b4e73",
                      fontFamily: fonts.DMSansMedium,
                    }}
                  >
                    Buffering audio...
                  </Text>
                </View>
              )}
            </View>
          );

        case "playing-audio":
          return (
            <View style={styles.audioContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {isAudioLoading && (
                  <ActivityIndicator
                    size="small"
                    color={borderColor || "#1b4e73"}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={[
                    styles.phaseText,
                    isExtensive && styles.extensivePhaseText,
                  ]}
                >
                  {isAudioLoading ? "Buffering Audio..." : "Playing Audio"}
                </Text>
              </View>
              <AudioPlaybackBar
                id={audioPlaybackId.current}
                audioUrl={audioUrl || ""}
                seekWidth={width * 0.8}
                onPlayTimeChange={handleAudioPlayTimeChange}
                onAudioComplete={onAudioEnd}
                autoPlay={"auto"}
                isExtensive={isExtensive}
                isPaused={isPaused}
                onError={handleAudioError}
              />
            </View>
          );

        case "recording-countdown":
          return (
            <View
              style={[
                styles.countdownContainer,
                isExtensive && styles.extensiveCountdownBox,
              ]}
            >
              <Text
                style={[
                  styles.countdownText,
                  isExtensive && styles.extensiveCountdownText,
                ]}
              >
                Your recording will start in {recordingCountdown} second
                {recordingCountdown !== 1 ? "s" : ""}
              </Text>
            </View>
          );

        case "recording":
          return (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingHeader}>
                <View style={styles.recordingIndicator}>
                  <View
                    style={[
                      styles.recordingDot,
                      isExtensive && { backgroundColor: "#1b4e73" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.recordingText,
                      isExtensive && { color: "#1b4e73" },
                    ]}
                  >
                    Recording
                  </Text>
                </View>
                <Text style={styles.recordingTime}>
                  {formatTime(Math.min(recordingTime, recordingDuration))} /{" "}
                  {formatTime(recordingDuration)}
                </Text>
              </View>
              <View style={styles.recordingProgress}>
                <View
                  style={[
                    styles.recordingProgressBar,
                    { width: `${(recordingTime / recordingDuration) * 100}%` },
                    isExtensive && { backgroundColor: "#1b4e73" },
                  ]}
                />
              </View>
              {!hideStopButton && (
                <TouchableOpacity
                  style={[
                    styles.stopButton,
                    isExtensive && { backgroundColor: "#1b4e73" },
                  ]}
                  onPress={stopRecording}
                >
                  <Text style={styles.stopButtonText}>Stop Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          );

        case "completed":
          const hasRec = recordingDuration > 0;
          return (
            <View style={styles.completedContainer}>
              <Text
                style={[
                  styles.completedText,
                  isExtensive && { color: "#1b4e73" },
                ]}
              >
                {hasRec ? "Recording Completed" : "Audio Finished"}
              </Text>
              {hasRec && (
                <Text style={styles.completedDetails}>
                  Duration:{" "}
                  {formatTime(
                    finalRecordingDuration ||
                    recordingDuration ||
                    recordingTime,
                  )}
                </Text>
              )}
              {!hasRec && (
                <Text style={styles.completedDetails}>
                  You can now proceed to the next question.
                </Text>
              )}
            </View>
          );

        default:
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={borderColor || "#1b4e73"}
              />
              <Text style={styles.loadingText}>
                {isAudioLoading || audioUrl ? "Buffering..." : "Initializing..."}
              </Text>
              <Text style={styles.loadingSubText}>Please wait a moment</Text>
            </View>
          );
      }
    };

    const finalBorderColor =
      borderColor || (isExtensive ? "#1b4e73" : Colors.lime_green);

    return (
      <View style={[styles.container, { borderColor: finalBorderColor }]}>
        <View style={styles.playerContainer}>{renderCurrentPhase()}</View>
      </View>
    );
  },
);

const getStyles = (isDarkMode: boolean = false) => {
  const themedColors = {
    bg: isDarkMode ? "#1B1B1B" : Colors.backgroundColor,
    text: isDarkMode ? "#E0E0E0" : Colors.text_color,
    secondaryText: isDarkMode ? "#BBBBBB" : Colors.instruction_text_color,
    border: isDarkMode ? "#333" : Colors.border_color,
  };

  return StyleSheet.create({
    container: {
      backgroundColor: themedColors.bg,
      marginHorizontal: 0,
      marginVertical: 8,
      borderWidth: 0.5,
      borderRadius: 10,
      minHeight: 150,
      alignItems: "center",
      justifyContent: "center",
    },
    playerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 60,
    },
    countdownContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
    },
    countdownText: {
      fontSize: 16,
      fontWeight: "600",
      color: themedColors.text,
      textAlign: "center",
      fontFamily: fonts.DMSansRegular,
    },
    audioContainer: {
      alignItems: "center",
      width: "100%",
      paddingVertical: 10,
    },
    phaseText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#007AFF",
      marginBottom: 8,
      fontFamily: fonts.DMSansRegular,
    },
    extensivePhaseText: {
      color: isDarkMode ? "#E0E0E0" : "#1b4e73",
    },
    timeText: {
      fontSize: 14,
      color: themedColors.text,
      fontWeight: "500",
      marginBottom: 8,
      fontFamily: fonts.DMSansRegular,
    },
    sliderContainer: { width: "100%", marginTop: 8 },
    slider: { width: "100%", height: 20 },
    recordingContainer: {
      alignItems: "center",
      width: width * 0.8,
      padding: 10,
    },
    recordingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: 16,
    },
    recordingIndicator: { flexDirection: "row", alignItems: "center" },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FF4D4D",
      marginRight: 8,
    },
    recordingText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FF4D4D",
      fontFamily: fonts.DMSansRegular,
    },
    recordingTime: {
      fontSize: 14,
      color: themedColors.text,
      fontWeight: "500",
      fontFamily: fonts.DMSansRegular,
    },
    recordingProgress: {
      width: "100%",
      height: 4,
      backgroundColor: themedColors.border,
      borderRadius: 2,
      marginBottom: 16,
      overflow: "hidden",
    },
    recordingProgressBar: { height: "100%", backgroundColor: "#FF4D4D" },
    stopButton: {
      backgroundColor: "#FF4D4D",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    stopButtonText: {
      color: Colors.white_Color,
      fontSize: 14,
      fontWeight: "600",
      fontFamily: fonts.DMSansRegular,
    },
    completedContainer: { alignItems: "center", paddingVertical: 16 },
    completedText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#22C55E",
      marginBottom: 4,
      fontFamily: fonts.DMSansRegular,
    },
    completedDetails: {
      fontSize: 14,
      color: themedColors.secondaryText,
      marginBottom: 4,
      fontFamily: fonts.DMSansRegular,
    },
    loadingContainer: {
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 120,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: themedColors.text,
      fontFamily: fonts.DMSansMedium,
      fontWeight: "600",
    },
    loadingSubText: {
      marginTop: 4,
      fontSize: 12,
      color: themedColors.secondaryText,
      fontFamily: fonts.DMSansRegular,
    },
    extensiveCountdownBox: {},
    extensiveCountdownText: {
      color: isDarkMode ? "#E0E0E0" : "#1b4e73",
    },
  });
};

export default React.memo(AutoPlayAudioRecorder);
