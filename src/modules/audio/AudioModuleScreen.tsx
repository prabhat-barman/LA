/**
 * AudioModuleScreen — One-stop UI Catalog for the entire `modules/audio` package.
 *
 * Yeh screen ek hi jagah pe poore audio module ka:
 *   • Overview / architecture summary
 *   • Har component ka live, interactive demo
 *   • Props + usage snippet
 *   • Dark mode + Extensive accent toggle
 *   • Custom audio URL input (apna URL paste karke turant test)
 *
 * Components dikhaye gaye:
 *   1. AudioPlayer            — simple wrapper (most-used)
 *   2. AudioPlaybackBar       — full waveform + seek bar (advanced)
 *   3. WaveformSeekBar        — UI primitive (standalone preview)
 *   4. HeadsetCheckPlayer     — pre-test headset check
 *   5. MicrophoneCheckPlayer  — record + playback mic check
 *   6. AutoPlayAudioRecorder  — full play-then-record flow
 *   7. AudioStore             — singleton state inspector
 *
 * Use:
 *   import { AudioModuleScreen } from 'src/modules/audio';
 *   <Stack.Screen name="AudioModuleDemo" component={AudioModuleScreen} />
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBarStyle,
} from 'react-native';

import AudioPlayer from './AudioPlayer';
import AudioPlaybackBar from './AudioPlaybackBar';
import WaveformSeekBar from './WaveformSeekBar';
import HeadsetCheckPlayer from './HeadsetCheckPlayer';
import MicrophoneCheckPlayer, { MicrophoneCheckPlayerRef } from './MicrophoneCheckPlayer';
import AutoPlayAudioRecorder, { AutoPlayAudioRecorderRef } from './AutoPlayAudioRecorder';
import AudioStore, { AudioState } from './AudioStore';

import { fonts } from '../../assets/font_color_&_family/font_color_and_family';

// ─── Demo audio URLs ─────────────────────────────────────────────────────────
const SAMPLE_AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const SAMPLE_AUDIO_2 = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
const SAMPLE_AUDIO_3 = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';

interface ThemePalette {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  accentSoft: string;
  badge: string;
  badgeText: string;
  pill: string;
  pillText: string;
  success: string;
  warning: string;
  danger: string;
}

// ─── Theme palette (light + dark) ────────────────────────────────────────────
const palette = (dark: boolean): ThemePalette => ({
  bg: dark ? '#0F1419' : '#F6F8FB',
  card: dark ? '#1A2230' : '#FFFFFF',
  cardAlt: dark ? '#202A3A' : '#F0F3F8',
  border: dark ? '#2A3548' : '#E4E8EF',
  text: dark ? '#F2F4F8' : '#1A1F2E',
  subtext: dark ? '#9AA4B5' : '#5A6478',
  accent: '#0084A3',
  accentSoft: dark ? '#0F3D4A' : '#D8F1F8',
  badge: dark ? '#243044' : '#E8EEF5',
  badgeText: dark ? '#A8B5CC' : '#4A5468',
  pill: dark ? '#2A3548' : '#EAF5F8',
  pillText: dark ? '#90CAF9' : '#0084A3',
  success: '#36B37E',
  warning: '#F4A261',
  danger: '#E5484D',
});

// ─── Reusable bits ───────────────────────────────────────────────────────────
const Pill = ({ label, t }: { label: string; t: ThemePalette }) => (
  <View style={[styles.pill, { backgroundColor: t.pill }]}>
    <Text style={[styles.pillText, { color: t.pillText }]}>{label}</Text>
  </View>
);

interface SectionProps {
  title: string;
  subtitle?: string;
  badges?: string[];
  t: ThemePalette;
  children: React.ReactNode;
}

const Section = ({ title, subtitle, badges = [], t, children }: SectionProps) => (
  <View style={[styles.section, { backgroundColor: t.card, borderColor: t.border }]}>
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: t.subtext }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>

    {badges.length > 0 && (
      <View style={styles.badgeRow}>
        {badges.map((b) => (
          <Pill key={b} label={b} t={t} />
        ))}
      </View>
    )}

    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const PropRow = ({ name, type, desc, t }: { name: string; type: string; desc: string; t: ThemePalette }) => (
  <View style={[styles.propRow, { borderBottomColor: t.border }]}>
    <View style={styles.propLeft}>
      <Text style={[styles.propName, { color: t.text }]}>{name}</Text>
      <Text style={[styles.propType, { color: t.pillText }]}>{type}</Text>
    </View>
    <Text style={[styles.propDesc, { color: t.subtext }]}>{desc}</Text>
  </View>
);

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  t: ThemePalette;
}

const ToggleRow = ({ label, value, onChange, t }: ToggleRowProps) => (
  <View style={styles.toggleRow}>
    <Text style={[styles.toggleLabel, { color: t.text }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: t.border, true: t.accent }}
      thumbColor="#FFFFFF"
    />
  </View>
);

interface ChipButtonProps {
  active: boolean;
  label: string;
  onPress: () => void;
  t: ThemePalette;
}

const ChipButton = ({ active, label, onPress, t }: ChipButtonProps) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[
      styles.chip,
      {
        backgroundColor: active ? t.accent : t.cardAlt,
        borderColor: active ? t.accent : t.border,
      },
    ]}
  >
    <Text
      style={[
        styles.chipText,
        { color: active ? '#FFFFFF' : t.text, fontFamily: fonts.DMSansMedium },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Live AudioStore inspector ───────────────────────────────────────────────
const StoreInspector = ({ t }: { t: ThemePalette }) => {
  const [state, setState] = useState<AudioState>(AudioStore.getCurrentState());

  useEffect(() => {
    const unsub = AudioStore.subscribe((s) => setState(s));
    return () => unsub();
  }, []);

  const fmt = (n: number | null | undefined) => (typeof n === 'number' ? n.toFixed(2) : '—');

  const rows = [
    ['id', state.id ?? '—'],
    ['url', state.url ? String(state.url).slice(-40) : '—'],
    ['playing', state.playing ? 'true' : 'false'],
    ['loading', state.loading ? 'true' : 'false'],
    ['position', `${fmt(state.position)} s`],
    ['duration', `${fmt(state.duration)} s`],
  ];

  return (
    <View style={[styles.inspector, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.inspectorRow}>
          <Text style={[styles.inspectorKey, { color: t.subtext }]}>{k}</Text>
          <Text
            style={[styles.inspectorValue, { color: t.text }]}
            numberOfLines={1}
          >
            {v}
          </Text>
        </View>
      ))}

      <View style={styles.inspectorActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => AudioStore.pause()}
          style={[styles.smallBtn, { backgroundColor: t.warning }]}
        >
          <Text style={styles.smallBtnText}>Pause</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => AudioStore.stop()}
          style={[styles.smallBtn, { backgroundColor: t.danger }]}
        >
          <Text style={styles.smallBtnText}>Stop</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => AudioStore.forceReset()}
          style={[styles.smallBtn, { backgroundColor: t.accent }]}
        >
          <Text style={styles.smallBtnText}>Force Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AudioModuleScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExtensive, setIsExtensive] = useState(false);
  const [activeUrl, setActiveUrl] = useState(SAMPLE_AUDIO);
  const [customUrl, setCustomUrl] = useState('');
  const [autoPlayMode, setAutoPlayMode] = useState<'manual' | 'auto' | 'both'>('manual');
  const [waveformProgress, setWaveformProgress] = useState(0.35);
  const [recorderResult, setRecorderResult] = useState<{ type: string; path: string; duration?: number } | null>(null);
  const [autoFlowState, setAutoFlowState] = useState({
    phase: 'idle',
    audioCompleted: false,
    recordingDuration: 0,
  });

  const autoRecorderRef = useRef<AutoPlayAudioRecorderRef>(null);

  const t = palette(isDarkMode);

  // Cleanup audio on unmount so demo screen exit hone par koi audio na bajta rahe.
  useEffect(() => {
    return () => {
      AudioStore.forceReset();
    };
  }, []);

  const applyCustomUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    AudioStore.forceReset();
    setActiveUrl(trimmed);
  };

  const statusBarStyle: StatusBarStyle = isDarkMode ? 'light-content' : 'dark-content';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={t.bg}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: t.accent }]}>modules / audio</Text>
          <Text style={[styles.title, { color: t.text }]}>Audio Module</Text>
          <Text style={[styles.subtitle, { color: t.subtext }]}>
            Single source of truth for playback, recording &amp; pre-test mic/headset
            checks. Built on react-native-nitro-sound,
            coordinated through a singleton AudioStore so only one audio plays at a time.
          </Text>

          <View style={styles.badgeRow}>
            <Pill label="react-native-nitro-sound" t={t} />
            <Pill label="singleton store" t={t} />
            <Pill label="dark mode" t={t} />
            <Pill label="extensive accent" t={t} />
          </View>
        </View>

        {/* ─── Global Controls ───────────────────────────────────────── */}
        <Section
          title="Global controls"
          subtitle="Yeh switches saare components ko ek saath affect karte hain."
          t={t}
        >
          <ToggleRow
            label="Dark mode"
            value={isDarkMode}
            onChange={setIsDarkMode}
            t={t}
          />
          <ToggleRow
            label="Extensive accent (mock-test theme)"
            value={isExtensive}
            onChange={setIsExtensive}
            t={t}
          />

          <Text style={[styles.label, { color: t.subtext }]}>Sample tracks</Text>
          <View style={styles.chipRow}>
            <ChipButton
              active={activeUrl === SAMPLE_AUDIO}
              label="Track 1"
              onPress={() => {
                AudioStore.forceReset();
                setActiveUrl(SAMPLE_AUDIO);
              }}
              t={t}
            />
            <ChipButton
              active={activeUrl === SAMPLE_AUDIO_2}
              label="Track 2"
              onPress={() => {
                AudioStore.forceReset();
                setActiveUrl(SAMPLE_AUDIO_2);
              }}
              t={t}
            />
            <ChipButton
              active={activeUrl === SAMPLE_AUDIO_3}
              label="Track 3"
              onPress={() => {
                AudioStore.forceReset();
                setActiveUrl(SAMPLE_AUDIO_3);
              }}
              t={t}
            />
          </View>

          <Text style={[styles.label, { color: t.subtext }]}>
            Custom URL (apna mp3 / m4a paste karein)
          </Text>
          <View style={styles.urlRow}>
            <TextInput
              style={[
                styles.urlInput,
                {
                  color: t.text,
                  backgroundColor: t.cardAlt,
                  borderColor: t.border,
                },
              ]}
              placeholder="https://example.com/audio.mp3"
              placeholderTextColor={t.subtext}
              value={customUrl}
              onChangeText={setCustomUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={applyCustomUrl}
              style={[styles.applyBtn, { backgroundColor: t.accent }]}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.activeUrlText, { color: t.subtext }]} numberOfLines={1}>
            Active: {activeUrl}
          </Text>
        </Section>

        {/* ─── 1. AudioPlayer ────────────────────────────────────────── */}
        <Section
          title="1. AudioPlayer"
          subtitle="Sabse simple, drop-in playback wrapper. Internally AudioPlaybackBar use karta hai. 90% jagah yahi component lagana hai."
          badges={['playback', 'autoPlay', 'countdown', 'playOnce']}
          t={t}
        >
          <Text style={[styles.label, { color: t.subtext }]}>autoPlay mode</Text>
          <View style={styles.chipRow}>
            {(['manual', 'auto', 'both'] as const).map((m) => (
              <ChipButton
                key={m}
                active={autoPlayMode === m}
                label={m}
                onPress={() => setAutoPlayMode(m)}
                t={t}
              />
            ))}
          </View>

          <View style={[styles.demoBox, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
            <AudioPlayer
              id={`demo-audio-player-${activeUrl}-${autoPlayMode}`}
              audioUrl={activeUrl}
              autoPlay={autoPlayMode}
              isDarkMode={isDarkMode}
              isExtensive={isExtensive}
              clickable
            />
          </View>

          <View style={styles.propTable}>
            <PropRow name="id" type="string" desc="Unique id (falls back to URL)" t={t} />
            <PropRow name="audioUrl" type="string" desc="Remote / local audio URL" t={t} />
            <PropRow
              name="autoPlay"
              type='bool | "auto" | "manual" | "both"'
              desc="Playback trigger mode"
              t={t}
            />
            <PropRow name="audioStartDelay" type="number" desc="Countdown (sec) before auto-play" t={t} />
            <PropRow name="playOnce" type="bool" desc="Block replay after completion" t={t} />
            <PropRow name="clickable" type="bool" desc="Show play/pause button" t={t} />
            <PropRow name="isDarkMode" type="bool" desc="Dark theme" t={t} />
            <PropRow name="isExtensive" type="bool" desc="Extensive mock-test accent" t={t} />
            <PropRow name="onPlaybackComplete" type="fn" desc="Called when audio ends" t={t} />
            <PropRow name="onReady" type="fn" desc="Receives { pause, resume } controls" t={t} />
          </View>
        </Section>

        {/* ─── 2. AudioPlaybackBar ───────────────────────────────────── */}
        <Section
          title="2. AudioPlaybackBar"
          subtitle="Full-featured bar — waveform seekbar, dark mode, lazy mount, time label control. Use karein jab fine-grained behaviour chahiye."
          badges={['waveform', 'seek', 'lazy mount']}
          t={t}
        >
          <View style={[styles.demoBox, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
            <AudioPlaybackBar
              id={`demo-playback-bar-${activeUrl}`}
              audioUrl={activeUrl}
              autoPlay="manual"
              isDarkMode={isDarkMode}
              isExtensive={isExtensive}
            />
          </View>

          <View style={styles.propTable}>
            <PropRow name="preload" type="bool" desc="Load duration on mount (default true)" t={t} />
            <PropRow
              name="lazyMountAudioEngine"
              type="bool"
              desc="Mount Nitro player only when active"
              t={t}
            />
            <PropRow
              name="showTimeOnlyWhenPlaying"
              type="bool"
              desc="Time label sirf playing pe dikhe"
              t={t}
            />
            <PropRow name="onPlayTimeChange" type="fn" desc="(position, duration) progress" t={t} />
            <PropRow name="onAudioComplete" type="fn" desc="End-of-track callback" t={t} />
            <PropRow name="isPaused" type="bool" desc="External pause (AppState/blur)" t={t} />
          </View>
        </Section>

        {/* ─── 3. WaveformSeekBar ────────────────────────────────────── */}
        <Section
          title="3. WaveformSeekBar"
          subtitle="UI primitive — bar-graph style waveform with tap-to-seek. Standalone bhi use ho sakta hai."
          badges={['UI primitive', 'tap to seek']}
          t={t}
        >
          <View style={[styles.demoBox, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
            <WaveformSeekBar
              progress={waveformProgress}
              onSeek={setWaveformProgress}
              seekWidth={300}
              isDarkMode={isDarkMode}
              isExtensive={isExtensive}
            />
            <Text style={[styles.helper, { color: t.subtext }]}>
              progress = {(waveformProgress * 100).toFixed(0)}% — kisi bhi bar pe tap karein
            </Text>
          </View>

          <View style={styles.propTable}>
            <PropRow name="progress" type="0..1" desc="Filled ratio" t={t} />
            <PropRow name="onSeek" type="fn(ratio)" desc="Bar tap callback" t={t} />
            <PropRow name="seekWidth" type="number" desc="Container width (px)" t={t} />
            <PropRow name="disabled" type="bool" desc="Disable taps" t={t} />
          </View>
        </Section>

        {/* ─── 4. HeadsetCheckPlayer ─────────────────────────────────── */}
        <Section
          title="4. HeadsetCheckPlayer"
          subtitle="Pre-test screen pe user apna headset / speaker verify karta hai."
          badges={['mock-test pre-req', 'self-contained']}
          t={t}
        >
          <View style={[styles.demoBox, { borderColor: t.border, padding: 0, backgroundColor: 'transparent' }]}>
            <HeadsetCheckPlayer
              id={`demo-headset-${activeUrl}`}
              audioUrl={activeUrl}
              isDarkMode={isDarkMode}
            />
          </View>

          <View style={styles.propTable}>
            <PropRow name="audioUrl" type="string" desc="Remote check-audio URL" t={t} />
            <PropRow
              name="onPlayingStateChange"
              type="fn(bool)"
              desc="Notify parent on play/pause"
              t={t}
            />
            <PropRow name="onPlayTimeChange" type="fn(pos, dur)" desc="Progress callback" t={t} />
          </View>
        </Section>

        {/* ─── 5. MicrophoneCheckPlayer ──────────────────────────────── */}
        <Section
          title="5. MicrophoneCheckPlayer"
          subtitle="20-sec mic check: record karein, playback karein, fir mock test enable hota hai. Permission + state-machine guard built-in."
          badges={['record', 'playback', 'permissions', 'state machine']}
          t={t}
        >
          <View style={[styles.demoBox, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
            <MicrophoneCheckPlayer
              onRecordingComplete={(path) => {
                setRecorderResult({ type: 'mic-check', path });
              }}
            />
          </View>

          {recorderResult?.type === 'mic-check' ? (
            <Text style={[styles.helper, { color: t.subtext }]} numberOfLines={2}>
              Last file: {recorderResult.path}
            </Text>
          ) : null}

          <View style={styles.propTable}>
            <PropRow
              name="onRecordingComplete"
              type="fn(filePath)"
              desc="m4a path after stopping"
              t={t}
            />
            <PropRow
              name="onStateChange"
              type="fn"
              desc="{ isRecording, hasFile, isPlaying, hasPlayed }"
              t={t}
            />
            <PropRow
              name="ref.stopAll()"
              type="imperative"
              desc="Force stop record + playback"
              t={t}
            />
          </View>
        </Section>

        {/* ─── 6. AutoPlayAudioRecorder ──────────────────────────────── */}
        <Section
          title="6. AutoPlayAudioRecorder"
          subtitle="PTE speaking flow: audio play → countdown → auto-record → stop. Phase machine ke saath full lifecycle handle karta hai."
          badges={['speaking flow', 'phase machine', 'auto-stop']}
          t={t}
        >
          <View style={[styles.demoBox, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
            <AutoPlayAudioRecorder
              ref={autoRecorderRef}
              componentKey={`demo-auto-${activeUrl}`}
              audioUrl={activeUrl}
              audioStartDelay={3}
              recordingStartDelay={2}
              recordingDuration={15}
              isExtensive={isExtensive}
              onAudioComplete={() =>
                setAutoFlowState((s) => ({ ...s, audioCompleted: true }))
              }
              onPhaseChange={(phase) => setAutoFlowState((s) => ({ ...s, phase }))}
              onRecordingComplete={({ filePath, duration }) =>
                setRecorderResult({ type: 'auto-flow', path: filePath, duration })
              }
              onProcessComplete={(d) =>
                setAutoFlowState((s) => ({
                  ...s,
                  recordingDuration: d ? d.recordingDuration : 0,
                }))
              }
            />
          </View>

          <View style={[styles.inspector, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
            <View style={styles.inspectorRow}>
              <Text style={[styles.inspectorKey, { color: t.subtext }]}>phase</Text>
              <Text style={[styles.inspectorValue, { color: t.text }]}>
                {autoFlowState.phase}
              </Text>
            </View>
            <View style={styles.inspectorRow}>
              <Text style={[styles.inspectorKey, { color: t.subtext }]}>audioCompleted</Text>
              <Text style={[styles.inspectorValue, { color: t.text }]}>
                {autoFlowState.audioCompleted ? 'true' : 'false'}
              </Text>
            </View>
            <View style={styles.inspectorRow}>
              <Text style={[styles.inspectorKey, { color: t.subtext }]}>recordingDuration</Text>
              <Text style={[styles.inspectorValue, { color: t.text }]}>
                {autoFlowState.recordingDuration} s
              </Text>
            </View>
          </View>

          <View style={styles.propTable}>
            <PropRow name="audioStartDelay" type="number" desc="Sec before audio plays" t={t} />
            <PropRow
              name="recordingStartDelay"
              type="number"
              desc="Gap (sec) between audio end + record start"
              t={t}
            />
            <PropRow
              name="recordingDuration"
              type="number"
              desc="Max record length (sec)"
              t={t}
            />
            <PropRow
              name="onPhaseChange"
              type="fn(phase)"
              desc="waiting → playing-audio → recording-countdown → recording → completed"
              t={t}
            />
            <PropRow
              name="onProcessComplete"
              type="fn"
              desc="Final payload with filePath + duration"
              t={t}
            />
          </View>
        </Section>

        {/* ─── 7. AudioStore inspector ───────────────────────────────── */}
        <Section
          title="7. AudioStore (singleton)"
          subtitle="Saare playback components yahi ke through coordinate karte hain — sirf ek audio ek time pe baj sakta hai."
          badges={['singleton', 'pub/sub', 'duration cache']}
          t={t}
        >
          <StoreInspector t={t} />

          <View style={styles.propTable}>
            <PropRow name="play(id, url)" type="method" desc="Switch to + play track" t={t} />
            <PropRow name="pause()" type="method" desc="Pause active track" t={t} />
            <PropRow name="resume()" type="method" desc="Resume from current position" t={t} />
            <PropRow name="stop()" type="method" desc="Pause + seek 0 + clear active ref" t={t} />
            <PropRow name="seekTo(seconds)" type="method" desc="Direct seek on active track" t={t} />
            <PropRow
              name="forceReset()"
              type="method"
              desc="Locked clear (use on screen unmount)"
              t={t}
            />
            <PropRow
              name="subscribe(fn)"
              type="method"
              desc="Listen to full state changes"
              t={t}
            />
            <PropRow
              name="getCachedDuration(url)"
              type="method"
              desc="Pre-fetched duration lookup"
              t={t}
            />
          </View>
        </Section>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: t.subtext }]}>
            All files live in{' '}
            <Text style={{ color: t.text, fontFamily: fonts.DMSansMedium }}>
              src/modules/audio/
            </Text>
          </Text>
          <Text style={[styles.footerText, { color: t.subtext }]}>
            import {'{'} AudioPlayer, AudioStore, ... {'}'} from{' '}
            <Text style={{ color: t.accent }}>'modules/audio'</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 16,
  },

  // Header
  header: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: fonts.DMSansMedium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.DMSansBold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.DMSansRegular,
    marginBottom: 14,
  },

  // Section card
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.DMSansSemiBold,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.DMSansRegular,
  },
  sectionBody: { marginTop: 12 },

  // Pill / badge
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    margin: 4,
  },
  pillText: {
    fontSize: 11,
    fontFamily: fonts.DMSansMedium,
    letterSpacing: 0.3,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: fonts.DMSansMedium,
  },

  // Chips
  label: {
    fontSize: 12,
    fontFamily: fonts.DMSansMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    margin: 4,
  },
  chipText: {
    fontSize: 13,
  },

  // URL input
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 13,
    fontFamily: fonts.DMSansRegular,
  },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.DMSansMedium,
  },
  activeUrlText: {
    fontSize: 11,
    fontFamily: fonts.DMSansRegular,
    marginTop: 8,
  },

  // Live demo container
  demoBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Helper text
  helper: {
    fontSize: 12,
    fontFamily: fonts.DMSansRegular,
    marginTop: 10,
    textAlign: 'center',
  },

  // Prop documentation table
  propTable: {
    marginTop: 6,
  },
  propRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  propName: {
    fontSize: 13,
    fontFamily: fonts.DMSansSemiBold,
    marginRight: 8,
  },
  propType: {
    fontSize: 11,
    fontFamily: fonts.DMSansRegular,
  },
  propDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.DMSansRegular,
  },

  // Inspector
  inspector: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  inspectorRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  inspectorKey: {
    width: 110,
    fontSize: 12,
    fontFamily: fonts.DMSansMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inspectorValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.DMSansMedium,
  },
  inspectorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -4,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    margin: 4,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.DMSansSemiBold,
  },

  // Footer
  footer: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: fonts.DMSansRegular,
    textAlign: 'center',
    marginVertical: 2,
  },
});
