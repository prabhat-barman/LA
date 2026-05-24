import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import Sound from "react-native-nitro-sound";
import RNFS from "react-native-fs";
import { useAudioPermissions } from "../../utils/PermissionHandler";
import { logger } from "../../utils/logger";
import { fonts } from "../../assets/font_color_&_family/font_color_and_family";

const MAX_DURATION = 20000;
const MIN_RECORD_TIME_BEFORE_STOP = 400;
const MAX_RETRY = 1;

const RS = {
  IDLE: "IDLE",
  STARTING: "STARTING",
  RECORDING: "RECORDING",
  STOPPING: "STOPPING",
};

export interface MicrophoneCheckPlayerProps {
  onRecordingComplete?: (filePath: string) => void;
  onStateChange?: (state: {
    isRecording: boolean;
    hasFile: boolean;
    isPlaying: boolean;
    hasPlayed: boolean;
  }) => void;
  isDarkMode?: boolean;
}

export interface MicrophoneCheckPlayerRef {
  recorder: typeof Sound;
  stopAll: () => Promise<void>;
}

const MicrophoneCheckPlayer = forwardRef<MicrophoneCheckPlayerRef, MicrophoneCheckPlayerProps>(
  function MicrophoneCheckPlayer(
    { onRecordingComplete, onStateChange, isDarkMode = false },
    ref,
  ) {
    const { hasPermission, requestPermission } = useAudioPermissions();

    const recorder = Sound;

    // Refs (never stale inside async callbacks)
    const isMountedRef = useRef(true);
    const nativeStateRef = useRef(RS.IDLE);
    const autoStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordStartTimeRef = useRef(0);
    const recordedFilePathRef = useRef("");

    // UI state
    const [uiState, setUiState] = useState("initial"); // initial | recording | stopping | completed
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordedFilePath, setRecordedFilePath] = useState("");
    const [hasPlayed, setHasPlayed] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // Progress state
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [recordTime, setRecordTime] = useState("00:00");
    const [playbackPosition, setPlaybackPosition] = useState(0);

    const retryCountRef = useRef(0);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      recorder,
      stopAll: async () => {
        if (
          nativeStateRef.current === RS.RECORDING ||
          nativeStateRef.current === RS.STARTING
        ) {
          if (autoStopTimeout.current) clearTimeout(autoStopTimeout.current);
          try {
            Sound.removeRecordBackListener();
            await Sound.stopRecorder();
          } catch { }
          nativeStateRef.current = RS.IDLE;
        }

        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
          await Sound.stopPlayer();
        } catch { }

        if (isMountedRef.current) {
          setIsPlaying(false);
          setStatusMessage("");
        }
      },
    }));

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        isMountedRef.current = false;
        if (autoStopTimeout.current) clearTimeout(autoStopTimeout.current);
        try {
          Sound.removeRecordBackListener();
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
          Sound.stopRecorder().catch(() => { });
          Sound.stopPlayer().catch(() => { });
        } catch { }
      };
    }, []);

    // Notify parent of state changes
    useEffect(() => {
      onStateChange?.({
        isRecording: uiState === "recording",
        hasFile: !!recordedFilePath,
        isPlaying,
        hasPlayed,
      });
    }, [uiState, recordedFilePath, isPlaying, hasPlayed, onStateChange]);

    const deletePreviousFile = async (filePath: string) => {
      if (!filePath) return;
      try {
        // Normalize document scheme for deletion if needed
        const cleanPath = filePath.replace("file://", "");
        const exists = await RNFS.exists(cleanPath);
        if (exists) await RNFS.unlink(cleanPath);
      } catch (e) {
        logger.warn("Could not delete previous recording:", e);
      }
    };

    const _doStop = async () => {
      nativeStateRef.current = RS.STOPPING;
      if (isMountedRef.current) setUiState("stopping");

      if (autoStopTimeout.current) clearTimeout(autoStopTimeout.current);
      try {
        Sound.removeRecordBackListener();
      } catch (_) {}

      let result: string | null | any = null;
      try {
        result = await Sound.stopRecorder();
      } catch (e) {
        logger.warn("stopRecorder error (ignored):", e);
      }

      nativeStateRef.current = RS.IDLE;

      if (!isMountedRef.current) return;

      setUiState("completed");
      setStatusMessage("");

      // Sound.stopRecorder() returns the local file path as string (e.g. file:///... on iOS, bare path on Android)
      const validPath =
        result &&
        typeof result === "string" &&
        !result.includes("Already stopped") &&
        !result.includes("Not recording")
          ? result
          : null;

      if (validPath) {
        // Normalize to file:// uri
        const fileUri = validPath.startsWith("file://") ? validPath : `file://${validPath}`;
        recordedFilePathRef.current = fileUri;
        setRecordedFilePath(fileUri);
        onRecordingComplete?.(fileUri);
      }
    };

    const startRecording = useCallback(async () => {
      if (nativeStateRef.current !== RS.IDLE) {
        logger.log(`⚠ startRecording blocked (state=${nativeStateRef.current})`);
        return;
      }

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          if (isMountedRef.current) {
            setStatusMessage(
              "Microphone permission is required. Please allow it in your device settings.",
            );
          }
          return;
        }
      }

      // Stop playback if running
      if (isPlaying) {
        await Sound.stopPlayer().catch(() => { });
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
        setIsPlaying(false);
      }

      nativeStateRef.current = RS.STARTING;
      setUiState("initial");
      setStatusMessage("Preparing microphone...");

      await deletePreviousFile(recordedFilePathRef.current);
      recordedFilePathRef.current = "";
      setRecordedFilePath("");
      setHasPlayed(false);
      setRecordingProgress(0);
      setRecordTime("00:00");

      const fileName = `mic_${Date.now()}.m4a`;
      const path =
        Platform.OS === "android"
          ? `${RNFS.CachesDirectoryPath}/${fileName}`
          : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      try {
        try {
          await Sound.stopRecorder();
        } catch (e) { }
        await new Promise<void>((r) => setTimeout(() => r(), 500));

        const result = await Sound.startRecorder(path, undefined, true);
        if (!result) throw new Error("startRecorder returned falsy");

        setStatusMessage("");

        Sound.addRecordBackListener((e) => {
          if (!isMountedRef.current) return;
          
          // e.currentPosition is in milliseconds in react-native-nitro-sound
          const currentPosMs = e.currentPosition || 0;
          const minutes = Math.floor(currentPosMs / 60000);
          const seconds = Math.floor((currentPosMs % 60000) / 1000);

          setRecordTime(
            `${minutes.toString().padStart(2, "0")}:${seconds
              .toString()
              .padStart(2, "0")}`,
          );

          const progress = Math.min(
            (currentPosMs / MAX_DURATION) * 100,
            100,
          );
          setRecordingProgress(progress);
        });
      } catch (e: any) {
        logger.error("startRecorder failed:", e);

        if (e?.message?.includes("already been called")) {
          if (retryCountRef.current >= MAX_RETRY) {
            logger.warn("Retry limit reached, aborting");
            if (isMountedRef.current) {
              setStatusMessage("Audio failed to start. Please try again.");
              setUiState("initial");
            }
            nativeStateRef.current = RS.IDLE;
            retryCountRef.current = 0;
            return;
          }
          retryCountRef.current++;
          logger.log("Audio state stuck, retrying...");
          if (isMountedRef.current) {
            setStatusMessage("Resetting audio, please wait...");
          }
          try {
            await Sound.stopRecorder();
          } catch { }
          nativeStateRef.current = RS.IDLE;
          await new Promise<void>((r) => setTimeout(() => r(), 500));
          return startRecording(); // controlled retry
        }
        if (isMountedRef.current) {
          setStatusMessage("Could not start recording. Please try again.");
          nativeStateRef.current = RS.IDLE;
          setUiState("initial");
        }
        return;
      }

      recordStartTimeRef.current = Date.now();
      nativeStateRef.current = RS.RECORDING;
      retryCountRef.current = 0;
      if (isMountedRef.current) setUiState("recording");

      autoStopTimeout.current = setTimeout(async () => {
        if (nativeStateRef.current === RS.RECORDING) {
          logger.log("⏱ Auto-stop triggered");
          await _doStop();
        }
      }, MAX_DURATION);
    }, [hasPermission, isPlaying, requestPermission]);

    const stopRecording = useCallback(async () => {
      if (nativeStateRef.current !== RS.RECORDING) {
        logger.log(`⚠ stopRecording blocked (state=${nativeStateRef.current})`);
        return;
      }

      const elapsed = Date.now() - recordStartTimeRef.current;
      if (elapsed < MIN_RECORD_TIME_BEFORE_STOP) {
        logger.log("⛔ Stop blocked — recording too short");
        return;
      }

      await _doStop();
    }, []);

    const handlePlayPause = useCallback(async () => {
      if (!recordedFilePath || nativeStateRef.current !== RS.IDLE) return;

      if (!isPlaying) {
        setPlaybackPosition(0);
        try {
          await Sound.startPlayer(recordedFilePath);
        } catch (e) {
          logger.error("startPlayer failed:", e);
          return;
        }
        setIsPlaying(true);

        Sound.addPlayBackListener((e) => {
          if (!isMountedRef.current) return;
          const currentPos = e.currentPosition || 0;
          const duration = e.duration || 1;

          const pos = currentPos / Math.max(duration, 1);
          setPlaybackPosition(pos >= 0.98 ? 1 : pos);
        });

        Sound.addPlaybackEndListener(() => {
          if (!isMountedRef.current) return;
          try {
            Sound.removePlayBackListener();
            Sound.removePlaybackEndListener();
            Sound.stopPlayer().catch(() => { });
          } catch (_) {}
          setIsPlaying(false);
          setHasPlayed(true);
          setPlaybackPosition(1);
        });
      } else {
        await Sound.stopPlayer().catch(() => { });
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
        setIsPlaying(false);
        setHasPlayed(true);
      }
    }, [recordedFilePath, isPlaying]);

    const isStarting =
      uiState === "initial" && nativeStateRef.current === RS.STARTING;

    const themedColors = {
      text: isDarkMode ? "#E0E0E0" : "#4C5361",
      statusText: isDarkMode ? "#FFFFFF" : "#4C5361",
    };

    return (
      <View style={styles.container}>
        {(uiState === "recording" || uiState === "stopping") && (
          <View style={styles.statusRow}>
            <View style={[styles.statusCircle, styles.recordingColorBorder]}>
              <View style={[styles.statusCircleInner, styles.recordingColorBg]} />
            </View>
            <View style={styles.statusLineContainer}>
              <View style={styles.statusLine} />
              <View
                style={[
                  styles.statusLineProgress,
                  styles.recordingColorBg,
                  { width: `${recordingProgress}%` },
                ]}
              />
              <View
                style={[
                  styles.statusHandle,
                  styles.recordingColorBg,
                  { left: `${recordingProgress}%` },
                ]}
              />
            </View>
          </View>
        )}

        {uiState === "completed" && (
          <View style={styles.statusRow}>
            <View style={styles.statusCircle}>
              <View style={styles.statusCircleInner} />
            </View>
            <Text
              style={[styles.statusLabel, { color: themedColors.statusText }]}
            >
              {isPlaying ? "Playing" : "Ready"}
            </Text>
            <View style={styles.statusLineContainer}>
              <View style={styles.statusLine} />
              <View
                style={[
                  styles.statusLineProgress,
                  { width: `${playbackPosition * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.statusHandle,
                  {
                    left: `${playbackPosition * 100}%`,
                    backgroundColor: isDarkMode ? "#FFFFFF" : "#000",
                  },
                ]}
              />
            </View>
          </View>
        )}

        {uiState === "initial" && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isStarting && styles.actionButtonDisabled,
            ]}
            onPress={startRecording}
            disabled={isStarting}
          >
            <Text style={styles.actionButtonText}>
              {isStarting ? "Preparing..." : "Record"}
            </Text>
          </TouchableOpacity>
        )}

        {uiState === "recording" && (
          <TouchableOpacity style={styles.actionButton} onPress={stopRecording}>
            <Text style={styles.actionButtonText}>Stop</Text>
          </TouchableOpacity>
        )}

        {uiState === "stopping" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled
          >
            <Text style={styles.actionButtonText}>Stopping...</Text>
          </TouchableOpacity>
        )}

        {uiState === "completed" && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={[styles.actionButton, styles.playbackButton]}
            >
              <Text style={styles.actionButtonText}>
                {isPlaying ? "Stop" : "Playback"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={startRecording}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Record</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0084A3",
  },
  actionButtonDisabled: {
    backgroundColor: "#A0AEC0",
    opacity: 0.7,
  },
  playbackButton: {
    backgroundColor: "#3A86B7",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: fonts.DMSansMedium,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#808080",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusCircleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#808080",
  },
  statusLabel: {
    fontSize: 22,
    color: "#4C5361",
    marginRight: 10,
    fontFamily: fonts.DMSansRegular,
  },
  statusLineContainer: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  statusLine: {
    height: 2,
    backgroundColor: "#E5E7EB",
    width: "100%",
  },
  statusLineProgress: {
    position: "absolute",
    height: 2,
    backgroundColor: "#0084A3",
    left: 0,
  },
  statusHandle: {
    position: "absolute",
    width: 2,
    height: 30,
    backgroundColor: "#000",
    top: 5,
  },
  recordingColorBorder: { borderColor: "#FF4D4D" },
  recordingColorBg: { backgroundColor: "#FF4D4D" },
});

export default MicrophoneCheckPlayer;
