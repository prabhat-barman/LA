import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { useRecorder } from '../../context/RecorderContext';
import { useAudioPlayer } from '../../hooks/practiceMedia';
import { CaretDownIcon } from '../atoms/Icon';
import { Data } from '../../config/practiceData';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const formatMMSS = (secs: number) => {
  const safe = Math.max(0, Math.floor(secs));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

// Shared static waveform pattern. Both cards use the same fingerprint so
// they read as a matched pair when stacked.
const BAR_PATTERN = [
  6, 10, 14, 8, 12, 20, 24, 18, 12, 22,
  28, 16, 10, 14, 20, 16, 10, 6, 8, 14,
  20, 24, 18, 12, 16, 10, 8, 6, 4, 4,
];

// Cosmetic voice list. The codebase doesn't yet wire a TTS / voice
// selection backend — this dropdown is here for design parity and so the
// UI is ready when the API lands. Changing the value is a no-op today.
const VOICE_OPTIONS = [
  { id: 'william', name: 'William' },
  { id: 'olivia', name: 'Olivia' },
  { id: 'james', name: 'James' },
  { id: 'sophia', name: 'Sophia' },
];

// ─── Status pill ──────────────────────────────────────────────────────────
// Coloured dot + label used at the top-right of each card to mirror the
// phase. The dot pulses while the corresponding action is "live"
// (audio playing or recording in progress).
const StatusPill: React.FC<{
  color: string;
  text: string;
  pulse?: boolean;
}> = ({ color, text, pulse = false }) => {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) {
      anim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, anim]);

  return (
    <View style={styles.statusPill}>
      <Animated.View
        style={[
          styles.statusDot,
          { backgroundColor: color, opacity: anim },
        ]}
      />
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
};

// ─── Waveform bars ───────────────────────────────────────────────────────
// Static progress-fill bars for playback (question audio + recorded review).
const StaticWaveform: React.FC<{
  progress: number;
  activeColor: string;
  inactiveColor?: string;
}> = ({ progress, activeColor, inactiveColor = '#E5E5EA' }) => (
  <View style={styles.waveformWrapper}>
    {BAR_PATTERN.map((h, i) => {
      const slot = (i + 1) / BAR_PATTERN.length;
      const isActive = progress >= slot;
      return (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: scale(h),
              backgroundColor: isActive ? activeColor : inactiveColor,
            },
          ]}
        />
      );
    })}
  </View>
);

// Amplitude-driven bars used while recording. Each bar interpolates from a
// shared `Animated.Value` so the recorder hook can push updates without
// triggering re-renders.
const LiveBar: React.FC<{
  amplitude: Animated.Value;
  seed: number;
  color: string;
  basePattern: number;
}> = ({ amplitude, seed, color, basePattern }) => {
  const height = useMemo(() => {
    const cap = scale(basePattern);
    return amplitude.interpolate({
      inputRange: [0, 1],
      outputRange: [scale(4), Math.max(scale(6), cap * (0.6 + seed * 0.4))],
    });
  }, [amplitude, basePattern, seed]);

  return (
    <Animated.View
      style={[styles.bar, { height, backgroundColor: color }]}
    />
  );
};

const LiveWaveform: React.FC<{
  amplitude: Animated.Value;
  color: string;
}> = ({ amplitude, color }) => (
  <View style={styles.waveformWrapper}>
    {BAR_PATTERN.map((h, i) => (
      <LiveBar
        key={i}
        amplitude={amplitude}
        seed={(i + 1) / BAR_PATTERN.length}
        color={color}
        basePattern={h}
      />
    ))}
  </View>
);

// ─── Question Audio card ─────────────────────────────────────────────────
interface QuestionAudioCardProps {
  audioProgress: { positionMs: number; durationMs: number; progress: number };
  secondsLeft: number;
  /** Tap the play btn to (re)play the question audio. */
  onPlay: () => void;
  /** Tap the speaker icon — same as `onPlay` for now. */
  onSpeaker: () => void;
}

const QuestionAudioCard: React.FC<QuestionAudioCardProps> = ({
  audioProgress,
  secondsLeft,
  onPlay,
  onSpeaker,
}) => {
  const flow = useRecorder();
  const phase = flow.phase;

  const isPlayingPhase = phase === 'audio_wait' || phase === 'audio_playing';
  const isFinishedPhase =
    phase === 'audio_done' ||
    phase === 'prep_countdown' ||
    phase === 'recording' ||
    phase === 'review';

  let statusColor = '#8E8E93';
  let statusText = 'Question Audio';
  let pulse = false;

  if (phase === 'audio_wait') {
    statusColor = '#F59E0B';
    statusText = `Audio starts in ${Math.max(0, secondsLeft)}s`;
    pulse = true;
  } else if (phase === 'audio_playing') {
    statusColor = '#F59E0B';
    statusText = 'Playing Question Audio';
    pulse = true;
  } else if (isFinishedPhase) {
    statusColor = '#94C23C';
    statusText = 'Question Audio Finished';
  }

  const progress =
    phase === 'audio_playing'
      ? audioProgress.progress
      : isFinishedPhase
        ? 1
        : 0;

  const posSec = audioProgress.positionMs / 1000;
  const durSec = audioProgress.durationMs / 1000;

  let timeText = '00:00';
  if (phase === 'audio_playing' && durSec > 0) {
    timeText = formatMMSS(posSec);
  } else if (isFinishedPhase && durSec > 0) {
    timeText = formatMMSS(durSec);
  } else if (phase === 'audio_wait') {
    timeText = '00:00';
  }

  // Yellow throughout the audio + recording phases, green only once the
  // recording is in review. Matches the four states shown in the Figma
  // mockup (yellow on screens 1 + 2, green on screens 3 + 4).
  const playBtnColor =
    phase === 'review' ? '#94C23C' : '#F59E0B';
  // Replay should not be allowed while the user is mid-recording — tapping
  // it would let the question audio bleed into the recording. Also a
  // no-op during the audio_wait pre-roll where audio is about to start on
  // its own, and during audio_playing (already playing).
  const replayDisabled =
    phase === 'recording' || phase === 'audio_wait' || phase === 'audio_playing';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Question Audio</Text>
        <StatusPill color={statusColor} text={statusText} pulse={pulse} />
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity
          style={[styles.circleBtn, { backgroundColor: playBtnColor }]}
          onPress={replayDisabled ? undefined : onPlay}
          activeOpacity={replayDisabled ? 1 : 0.85}
          disabled={replayDisabled}
        >
          <Svg width={scale(11)} height={scale(11)} viewBox="0 0 24 24" fill="none">
            <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
          </Svg>
        </TouchableOpacity>

        <StaticWaveform progress={progress} activeColor="#94C23C" />

        <Text style={styles.timeText}>{timeText}</Text>

        <TouchableOpacity
          onPress={replayDisabled ? undefined : onSpeaker}
          disabled={replayDisabled}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Svg width={scale(16)} height={scale(16)} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11 5L6 9H2v6h4l5 4V5z"
              stroke="#48484A"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
              stroke="#48484A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Recorded card ───────────────────────────────────────────────────────
interface RecordedCardProps {
  recordedUri: string | null;
  recordingDurationSec: number;
  secondsLeft: number;
  maxRecordingSec: number;
}

const RecordedCard: React.FC<RecordedCardProps> = ({
  recordedUri,
  recordingDurationSec,
  secondsLeft,
  maxRecordingSec,
}) => {
  const flow = useRecorder();
  const phase = flow.phase;
  const reviewPlayer = useAudioPlayer();

  // Stop the review playback the moment the question leaves the `review`
  // phase. Otherwise the session would keep producing audio in the
  // background on retake / next question.
  useEffect(() => {
    if (phase !== 'review') {
      reviewPlayer.stop().catch(() => { });
    }
    // The player ref is stable for the component lifetime, so we only need
    // to react to phase changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Status pill ──
  let statusColor = '#8E8E93';
  let statusText = 'Recorded';
  let pulse = false;

  if (phase === 'audio_wait' || phase === 'audio_playing' || phase === 'audio_done') {
    statusColor = '#FF3B30';
    const prep = flow.resolvedPrepTimeSec;
    statusText = `Recording starts in ${Math.max(0, prep)} sec`;
  } else if (phase === 'prep_countdown') {
    statusColor = '#FF3B30';
    statusText = `Recording starts in ${Math.max(0, secondsLeft)} sec`;
    pulse = true;
  } else if (phase === 'recording') {
    statusColor = '#FF3B30';
    statusText = 'Recording';
    pulse = true;
  } else if (phase === 'review') {
    if (recordedUri) {
      statusColor = '#94C23C';
      statusText = 'Recording Finished';
    } else {
      statusColor = '#8E8E93';
      statusText = 'No recording';
    }
  }

  // ── Timer text ──
  let timeText = '00:00';
  if (phase === 'recording') {
    const elapsed = Math.max(0, maxRecordingSec - secondsLeft);
    timeText = formatMMSS(elapsed);
  } else if (phase === 'review' && recordedUri) {
    const playerDur = reviewPlayer.durationMs / 1000;
    const dur = playerDur > 0 ? playerDur : recordingDurationSec;
    const pos = reviewPlayer.positionMs / 1000;
    timeText = reviewPlayer.isPlaying ? formatMMSS(pos) : formatMMSS(dur);
  } else if (maxRecordingSec > 0) {
    timeText = formatMMSS(maxRecordingSec);
  }

  // ── Waveform progress ──
  let waveformProgress = 0;
  if (phase === 'review' && recordedUri) {
    const playerDur = reviewPlayer.durationMs / 1000;
    const dur = playerDur > 0 ? playerDur : recordingDurationSec;
    const pos = reviewPlayer.positionMs / 1000;
    waveformProgress = dur > 0 ? Math.min(1, pos / dur) : 0;
  }

  // ── Left button ──
  let leftButton: React.ReactNode;
  let waveformView: React.ReactNode;

  if (phase === 'recording') {
    leftButton = (
      <TouchableOpacity
        style={[styles.circleBtn, { backgroundColor: '#FF3B30' }]}
        onPress={() => flow.stopRecording()}
        activeOpacity={0.85}
      >
        <Svg width={scale(10)} height={scale(10)} viewBox="0 0 24 24" fill="none">
          <Rect x="6" y="6" width="12" height="12" rx="1" fill="#FFFFFF" />
        </Svg>
      </TouchableOpacity>
    );
    waveformView = <LiveWaveform amplitude={flow.amplitude} color="#FF3B30" />;
  } else if (phase === 'review' && recordedUri) {
    const handleToggle = () => {
      if (reviewPlayer.isPlaying) {
        reviewPlayer.stop();
      } else {
        reviewPlayer.play(recordedUri);
      }
    };
    leftButton = (
      <TouchableOpacity
        style={[styles.circleBtn, { backgroundColor: '#94C23C' }]}
        onPress={handleToggle}
        activeOpacity={0.85}
      >
        {reviewPlayer.isPlaying ? (
          <Svg width={scale(11)} height={scale(11)} viewBox="0 0 24 24" fill="none">
            <Rect x="5" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
            <Rect x="15" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
          </Svg>
        ) : (
          <Svg width={scale(11)} height={scale(11)} viewBox="0 0 24 24" fill="none">
            <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
          </Svg>
        )}
      </TouchableOpacity>
    );
    waveformView = (
      <StaticWaveform progress={waveformProgress} activeColor="#94C23C" />
    );
  } else {
    leftButton = (
      <View style={[styles.circleBtn, styles.circleBtnDisabled]}>
        <Svg width={scale(11)} height={scale(11)} viewBox="0 0 24 24" fill="none">
          <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
        </Svg>
      </View>
    );
    waveformView = (
      <StaticWaveform progress={0} activeColor="#94C23C" inactiveColor="#D1D1D6" />
    );
  }

  // ── Action button row (Record Now / Retake / Try Again) ──
  // Note: there's no separate Stop button here. While `phase === 'recording'`
  // the red circular leftButton already lets the user stop the take, so a
  // duplicate full-width pill below would just be visual noise.
  let actionButton: React.ReactNode = null;
  if (phase === 'prep_countdown') {
    actionButton = (
      <TouchableOpacity
        style={styles.recordNowBtn}
        onPress={() => flow.startRecordingNow()}
        activeOpacity={0.85}
      >
        <Text style={styles.recordNowBtnText}>Record Now</Text>
      </TouchableOpacity>
    );
  } else if (phase === 'review' && !recordedUri) {
    // Recording failed or produced an empty clip — give the user a way
    // out. `retake()` skips the audio re-roll and goes straight to the
    // prep countdown, which is the right move here because the audio has
    // already been heard.
    actionButton = (
      <TouchableOpacity
        style={styles.retakeBtn}
        onPress={() => flow.retake()}
        activeOpacity={0.85}
      >
        <Text style={styles.retakeBtnText}>Record Answer</Text>
      </TouchableOpacity>
    );
  } else if (phase === 'review' && recordedUri) {
    // Successful recording — let the user redo the entire question from
    // the audio wait time. Unlike `retake()` (which only resets the
    // recorder), this chains `reset()` -> `start()` so the question
    // audio plays again before the next prep countdown. Submit gets
    // disabled automatically because `reset()` clears `recordedUri`.
    actionButton = (
      <TouchableOpacity
        style={styles.retakeBtn}
        onPress={() => {
          flow.reset()
            .then(() => flow.start())
            .catch(() => {});
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.retakeBtnText}>Try Again</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Recorded</Text>
        <StatusPill color={statusColor} text={statusText} pulse={pulse} />
      </View>

      <View style={styles.cardRow}>
        {leftButton}
        {waveformView}
        <Text style={styles.timeText}>{timeText}</Text>
      </View>

      {actionButton && <View style={styles.actionRow}>{actionButton}</View>}
    </View>
  );
};

// ─── Speed + Voice controls row ──────────────────────────────────────────
interface SpeedVoiceRowProps {
  selectedSpeed: number;
  onSelectSpeed: (speed: number) => void;
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
}

const SpeedVoiceRow: React.FC<SpeedVoiceRowProps> = ({
  selectedSpeed,
  onSelectSpeed,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const [speedOpen, setSpeedOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const selectedVoiceName =
    VOICE_OPTIONS.find(v => v.id === selectedVoiceId)?.name || 'Default';

  return (
    <View style={styles.controlsRow}>
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Speed</Text>
        <View style={{ zIndex: 20 }}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setSpeedOpen(o => !o);
              setVoiceOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownBtnText}>{selectedSpeed}x</Text>
            <CaretDownIcon size={scale(10)} color="#1C1C1E" expanded={speedOpen} />
          </TouchableOpacity>
          {speedOpen && (
            <View style={styles.dropdownPanel}>
              {Data.audiovariableSpeed.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.dropdownItem,
                    selectedSpeed === s.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelectSpeed(s.id);
                    setSpeedOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedSpeed === s.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.controlGroup, { alignItems: 'flex-end' }]}>
        <Text style={styles.controlLabel}>Voice</Text>
        <View style={{ zIndex: 20 }}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setVoiceOpen(o => !o);
              setSpeedOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownBtnText}>{selectedVoiceName}</Text>
            <CaretDownIcon size={scale(10)} color="#1C1C1E" expanded={voiceOpen} />
          </TouchableOpacity>
          {voiceOpen && (
            <View style={[styles.dropdownPanel, styles.dropdownPanelRight]}>
              {VOICE_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.dropdownItem,
                    selectedVoiceId === v.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelectVoice(v.id);
                    setVoiceOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedVoiceId === v.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {v.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Top-level composer ──────────────────────────────────────────────────
interface UnifiedMediaBarProps {
  hasAudio: boolean;
  hasRecording: boolean;
  maxRecordingSec: number;
  recordedUri: string | null;
  recordingDurationSec: number;
  isSubmitting?: boolean;
  selectedSpeed: number;
  onSelectSpeed: (s: number) => void;
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
}

/**
 * Two-card media surface for audio-and-record question types. Replaces the
 * per-phase card stack (`AudioWaitCard`, `AudioPlayingCard`, `PrepTimerCard`,
 * `RecordingPanel`, `ReviewPanel`) with a layout that mirrors the Figma
 * mockup: one always-visible card for the **question audio** (status pill +
 * playback bar) and one for the **recorded answer** (status pill +
 * recording / review controls), with a Speed / Voice control row below.
 *
 * The component subscribes to `RecorderContext` internally — callers only
 * need to supply the recorded clip metadata and the speed / voice
 * selectors.
 */
export const UnifiedMediaBar: React.FC<UnifiedMediaBarProps> = ({
  hasAudio,
  hasRecording,
  maxRecordingSec,
  recordedUri,
  recordingDurationSec,
  isSubmitting = false,
  selectedSpeed,
  onSelectSpeed,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const flow = useRecorder();
  const { subscribeToTimer, subscribeToAudioProgress } = flow;

  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => subscribeToTimer(setSecondsLeft), [subscribeToTimer]);

  const [audioProgress, setAudioProgress] = useState({
    positionMs: 0,
    durationMs: 0,
    progress: 0,
  });
  useEffect(
    () =>
      subscribeToAudioProgress((posMs, durMs, progress) => {
        setAudioProgress({ positionMs: posMs, durationMs: durMs, progress });
      }),
    [subscribeToAudioProgress],
  );

  if (isSubmitting) {
    return (
      <View style={styles.submittingRow}>
        <ActivityIndicator size="small" color="#94C23C" />
        <Text style={styles.submittingText}>Analyzing with AI...</Text>
      </View>
    );
  }

  // Sequential layout: while the question audio is still in its pre-roll
  // (`idle` / `audio_wait`) or actively playing (`audio_playing`), only the
  // Question Audio card + Speed/Voice controls are visible — these are the
  // only affordances that matter before the user has heard the prompt. Once
  // the audio finishes (`audio_done` and onward: prep countdown, recording,
  // review), the question card and its controls collapse out and the
  // Recorded card takes over the surface. Cheap conditional render — both
  // sub-trees are unmounted when not needed, so child effects (waveform
  // animations, audio-progress subscriptions, voice dropdowns) don't keep
  // running in the background.
  const phase = flow.phase;
  const isPreRecordingPhase =
    phase === 'idle' || phase === 'audio_wait' || phase === 'audio_playing';

  return (
    <View style={styles.container}>
      {hasAudio && isPreRecordingPhase && (
        <QuestionAudioCard
          audioProgress={audioProgress}
          secondsLeft={secondsLeft}
          onPlay={() => flow.replayAudio()}
          onSpeaker={() => flow.replayAudio()}
        />
      )}

      {hasRecording && !isPreRecordingPhase && (
        <RecordedCard
          recordedUri={recordedUri}
          recordingDurationSec={recordingDurationSec}
          secondsLeft={secondsLeft}
          maxRecordingSec={maxRecordingSec}
        />
      )}

      {hasAudio && isPreRecordingPhase && (
        <SpeedVoiceRow
          selectedSpeed={selectedSpeed}
          onSelectSpeed={onSelectSpeed}
          selectedVoiceId={selectedVoiceId}
          onSelectVoice={onSelectVoice}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: scale(12),
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#EAEAEC',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    gap: scale(8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1C1F2A',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  statusText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
  },

  // Buttons
  circleBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnDisabled: {
    backgroundColor: '#C7C7CC',
  },

  // Waveform
  waveformWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
    height: scale(32),
  },
  bar: {
    width: scale(2),
    borderRadius: scale(1),
    minHeight: scale(4),
  },

  // Timer
  timeText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
    minWidth: scale(38),
    textAlign: 'right',
  },

  // Action row inside the recorded card. Children stretch to the card
  // width so Record Now / Try Again render as full-width pills.
  actionRow: {
    width: '100%',
  },
  recordNowBtn: {
    width: '100%',
    backgroundColor: '#94C23C',
    borderRadius: scale(8),
    paddingVertical: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordNowBtnText: {
    color: colors.white,
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  retakeBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#8E8E93',
    borderRadius: scale(8),
    paddingVertical: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeBtnText: {
    color: '#48484A',
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },

  // Controls row
  controlsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: scale(12),
  },
  controlGroup: {
    flex: 1,
    gap: scale(4),
  },
  controlLabel: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    gap: scale(6),
    alignSelf: 'flex-start',
  },
  dropdownBtnText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1C1E',
  },
  dropdownPanel: {
    position: 'absolute',
    top: scale(34),
    left: 0,
    backgroundColor: colors.white,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minWidth: scale(110),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownPanelRight: {
    left: 'auto',
    right: 0,
  },
  dropdownItem: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
  },
  dropdownItemActive: {
    backgroundColor: '#F2F2F7',
  },
  dropdownItemText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1C1C1E',
  },
  dropdownItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },

  // Submitting
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
  },
  submittingText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#94C23C',
    marginLeft: scale(8),
  },
});
