# LA App — Audio Module Documentation

End-to-end reference for the audio recording + playback subsystem that powers
the speaking practice flows (Read Aloud, Repeat Sentence, Describe Image,
Re-tell Lecture, Answer Short Questions, Respond to a Situation, Summarize
Discussion) and the standalone Microphone Setup screen.

> Branch: `feature/audio-module`
> Native dependency: [`react-native-nitro-sound`](https://www.npmjs.com/package/react-native-nitro-sound) `^0.2.14`
> (built on [`react-native-nitro-modules`](https://www.npmjs.com/package/react-native-nitro-modules) `^0.35.0`)

---

## 1. Why a dedicated module

The native `react-native-nitro-sound` library exposes a **single global
recorder + player handle** (singleton). Without coordination, two callers
(e.g. a question-audio player and a voice recorder) can:

- Tear down each other's native session
- Leave React state "stuck" (UI shows *playing* while native is already stopped)
- Race during `start`/`stop` and leak listeners

The audio module solves this with one ownership coordinator + two focused
hooks + one high-level orchestrator + reusable UI components.

---

## 2. File layout

```
src/
├── hooks/practiceMedia/
│   ├── index.ts                  ← public exports
│   ├── soundCoordinator.ts       ← exclusive ownership of native singleton
│   ├── useAudioPlayer.ts         ← playback hook
│   ├── useVoiceRecorder.ts       ← recording hook
│   └── useQuestionMediaFlow.ts   ← high-level state machine for a question
│
├── components/practiceMedia/
│   ├── index.ts                  ← public exports
│   ├── styles.ts                 ← shared `mediaStyles` + `scale()`
│   ├── AudioStatusCard.tsx       ← AudioPlayingCard / AudioWaitCard / SubmittingCard
│   ├── MediaStatusInline.tsx     ← compact inline status row
│   ├── PrepTimerCard.tsx         ← pre-recording countdown card
│   ├── RecordingPanel.tsx        ← active-recording panel (waveform + stop)
│   ├── RecordedPlaybackBar.tsx   ← playback bar for captured recording
│   ├── ReviewPanel.tsx           ← review/retake/submit actions
│   └── WaveformBar.tsx           ← single animated bar (used by RecordingPanel)
│
├── screens/Microphone/
│   └── MicrophoneSetupScreen.tsx ← onboarding mic test screen
│
└── screens/Practice/
    └── PracticeQuestionDetailScreen.tsx  ← consumes useQuestionMediaFlow
```

---

## 3. Architecture overview

```
┌────────────────────────────────────────────────────────────────┐
│                    Screen layer                                │
│   PracticeQuestionDetailScreen / MicrophoneSetupScreen         │
└───────────────────────────┬────────────────────────────────────┘
                            │ consumes
                            ▼
┌────────────────────────────────────────────────────────────────┐
│              useQuestionMediaFlow (orchestrator)               │
│  Phases: idle → audio_wait → audio_playing → audio_done        │
│                       → prep_countdown → recording → review    │
└───────────────┬───────────────────────────────┬────────────────┘
                │                               │
        ┌───────▼────────┐               ┌──────▼─────────┐
        │ useAudioPlayer │               │ useVoiceRecorder│
        └───────┬────────┘               └──────┬─────────┘
                │  acquire/release/preempt      │
                └──────────────┬────────────────┘
                               ▼
                  ┌──────────────────────────┐
                  │    soundCoordinator      │
                  │  (single-owner gate over │
                  │   the native singleton)  │
                  └──────────────┬───────────┘
                                 ▼
                    react-native-nitro-sound
                    (AVAudioRecorder / AVAudioPlayer on iOS,
                     MediaRecorder / MediaPlayer on Android)
```

---

## 4. The ownership coordinator (`soundCoordinator`)

`src/hooks/practiceMedia/soundCoordinator.ts`

A minimal module-level singleton that gates access to the native handle.

| API | Purpose |
|---|---|
| `acquire(id, kind, onPreempt)` | Claim the slot. If another owner holds it, their `onPreempt` callback fires so they can reset their React state. |
| `release(id)` | Release the slot **only if** you currently own it. |
| `isOwner(id)` | Cheap predicate guards every listener callback. |
| `currentKind()` | `'recorder' \| 'player' \| null` — for diagnostics. |

**Invariant:** every place that calls `Sound.start*` / `Sound.stop*` either
holds the slot or is performing best-effort teardown on unmount. Screens
should **never** import the coordinator directly — only the two hooks
interact with it.

---

## 5. `useAudioPlayer`

`src/hooks/practiceMedia/useAudioPlayer.ts`

Thin wrapper around `Sound.startPlayer / stopPlayer` that:

- Owns the coordinator slot while playing
- Tracks `positionMs` / `durationMs` / `progress` from the playback listener
- Fires `onComplete` on natural end, `onPreempt` when displaced by another
  consumer, `onError` if `startPlayer` rejects
- Guarantees listener cleanup on stop / unmount / error

### Options

```ts
interface UseAudioPlayerOptions {
  onComplete?: () => void;       // natural end of playback
  onPreempt?: () => void;        // displaced by another consumer
  onError?: (err: unknown) => void;
  initialRate?: number;          // 0.5..2.0, default 1.0
}
```

### Return value

```ts
interface UseAudioPlayerReturn {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  progress: number;              // [0..1]
  rate: number;                  // current playback rate
  play: (uri: string, rate?: number) => Promise<boolean>;
  stop: () => Promise<void>;
  setRate: (rate: number) => Promise<void>;
}
```

### Example

```tsx
const player = useAudioPlayer({
  initialRate: 1.0,
  onComplete: () => console.log('done'),
});

await player.play('https://cdn.example.com/audio.mp3');
// Change speed mid-playback
await player.setRate(1.5);
// later
await player.stop();
```

### Playback rate

Backed by `Sound.setPlaybackSpeed()` from `react-native-nitro-sound`. The
hook clamps to `[0.5, 2.0]` (AVAudioPlayer-safe range). The rate is
applied AFTER `startPlayer` resolves because most platforms reject a rate
change on a not-yet-started player.

---

## 6. `useVoiceRecorder`

`src/hooks/practiceMedia/useVoiceRecorder.ts`

Voice recording hook with:

- Android `RECORD_AUDIO` runtime permission gate (iOS uses the system prompt)
- Optional `maxDurationSec` auto-stop (used for fixed-length practice
  questions; pass `0` / omit for open-ended recordings)
- 1s wall-clock tick → `secondsElapsed` / `secondsRemaining` + `onTick`
- Native metering pushed into an `Animated.Value` for **re-render-free**
  waveform animation
- Robust against: rapid start/stop, preemption mid-`startRecorder`, parallel
  `start()` calls (deduped), unmount during in-flight start

### Options

```ts
interface UseVoiceRecorderOptions {
  maxDurationSec?: number;
  onFinish?: (uri: string | null, elapsedSec: number) => void;
  onTick?: (remainingSec: number) => void;
  onError?: (
    err: unknown,
    code: 'permission' | 'start' | 'stop' | 'interrupted' | 'empty',
  ) => void;
  /**
   * Auto-stop the recording when the app moves to background. Default `true`.
   * Disable only if you have configured a background-capable audio session.
   */
  stopOnBackground?: boolean;
}
```

### Error codes

| Code | When it fires |
|---|---|
| `permission` | Android `RECORD_AUDIO` denied (iOS uses native prompt + `start` failure) |
| `start` | `Sound.startRecorder()` rejected (mic busy, hardware error) |
| `stop` | `Sound.stopRecorder()` rejected (rare, usually safe to ignore) |
| `interrupted` | App moved to background / inactive while recording. `onFinish` also fires with `(null, 0)`. |
| `empty` | Native returned a URI but the file is empty / unreadable. `onFinish` also fires with `(null, elapsedSec)`. |

### Return value

```ts
interface UseVoiceRecorderReturn {
  isRecording: boolean;
  secondsElapsed: number;
  secondsRemaining: number;                          // 0 when no max set
  recording: { uri: string; durationSec: number } | null;
  amplitude: Animated.Value;                         // 0..1, native-driven
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
}
```

### Lifecycle safety flags (internal)

| Flag | Purpose |
|---|---|
| `stoppedRef` | True when no native recorder is active. Tick interval bails out if flipped while running. |
| `startInFlightRef` | Promise of the in-progress `start()` so a concurrent `stop()` can wait for native start to resolve before calling `stopRecorder`. |
| `stopRequestedRef` | Set synchronously inside `stop()` even while `startRecorder` is still awaiting — the post-await block sees this flag and tears the just-started session down cleanly. |

These three flags together close every race I've been able to hit on real
devices (Android in particular surfaces them because `startRecorder` can
take 300–800ms on cold start).

### Example

```tsx
const recorder = useVoiceRecorder({
  maxDurationSec: 35,
  onFinish: (uri, elapsedSec) => {
    if (uri) submit(uri, elapsedSec);
  },
});

await recorder.start();
// stops automatically after 35s, or manually:
await recorder.stop();
```

---

## 7. `useQuestionMediaFlow`

`src/hooks/practiceMedia/useQuestionMediaFlow.ts`

The orchestrator. Composes both lower-level hooks into a single state
machine that mirrors the real PTE question flow. The screen just renders
based on `phase` — all sequencing, timers, and recovery branches live here.

### Phases

```
idle ──► audio_wait ──► audio_playing ──► audio_done            (listening-only)
                                       └► prep_countdown ──► recording ──► review
```

| Phase | Meaning |
|---|---|
| `idle` | No media needed (reading / writing types) or freshly reset |
| `audio_wait` | Pre-audio countdown (`waitTimeBeforeAudio` from `practiceData`) |
| `audio_playing` | Question audio is playing |
| `audio_done` | Audio finished, no recording follows (listening MCQs etc.) |
| `prep_countdown` | Pre-recording prep timer (`waitTimeBeforeRecording` or `pteCoreWaitTimeBeforeRecording` when `isCore`) |
| `recording` | User voice recording in progress |
| `review` | Recording captured; user can retake / submit |

### Config

```ts
interface UseQuestionMediaFlowConfig {
  metadata: QuestionMetadata;            // from src/config/practiceData.ts
  isCore?: boolean;                      // flips prep time to PTE Core variant
  audioUrl?: string;                     // required when metadata.hasAudio
  autoStart?: boolean;                   // default true
  initialPlaybackRate?: number;          // 0.5..2.0, default 1.0
  onAudioFinish?: () => void;
  onRecordingFinish?: (uri: string | null, durationSec: number) => void;
  onError?: (message: string) => void;
}
```

### Return value (consumed by screens)

```ts
{
  phase: MediaPhase;
  secondsLeft: number;                   // live countdown for the current phase

  // Question-audio playback metrics
  audioPositionMs: number;
  audioDurationMs: number;
  audioProgress: number;
  playbackRate: number;                  // current rate (mirrors setPlaybackRate)

  // Captured recording (available from `review` onwards)
  recordedUri: string | null;
  recordingDurationSec: number;          // stable; never overwritten by playback
  amplitude: Animated.Value;             // waveform input
  resolvedPrepTimeSec: number;           // for instruction labels

  // Actions
  start: () => void;
  replayAudio: () => Promise<void>;      // re-play question audio without recording
  skipAudio: () => Promise<void>;
  startRecordingNow: () => Promise<void>;
  stopRecording: () => Promise<void>;
  retake: () => void;
  reset: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;  // 0.5..2.0
}
```

### `replayAudio` vs `start`

`start()` is the full state-machine entry — it tears down any captured
recording and walks the full audio → prep → recording → review flow.

`replayAudio()` is for the "Play Audio" button in a `review` /
`audio_done` state — plays the question audio again *without* clobbering
the user's captured recording. Always prefer `replayAudio` for replay
UIs; reserve `start()` for the initial entry and for explicit "restart
this question" actions.

### Notes on edge cases

- **Audio URL missing despite `hasAudio: true`** → skips audio, jumps to
  prep countdown (or `audio_done` for listening-only types).
- **`startPlayer` rejects** → `onError` path still calls `onAudioFinish`
  and proceeds, so the user is never stranded on a silent screen.
- **`waitTimeBeforeRecording === 0`** → prep stage is skipped, recording
  starts immediately.
- **`retake`** re-enters `prep_countdown` so the user gets the same lead-in
  they had on the first take.
- **`reset`** is the canonical "tear everything down" — call it on unmount
  or before navigating to a new question.

---

## 8. UI components (`src/components/practiceMedia/`)

All components share `mediaStyles` and a `scale()` helper from
`styles.ts` so they look consistent across screens.

| Component | Used in phase | Purpose |
|---|---|---|
| `AudioWaitCard` | `audio_wait` | "Audio plays in Ns" countdown card |
| `AudioPlayingCard` | `audio_playing` | Now-playing indicator with progress |
| `PrepTimerCard` | `prep_countdown` | Prep countdown + "Record Now" CTA |
| `RecordingPanel` | `recording` | Red badge + live waveform + Stop button |
| `WaveformBar` | inside `RecordingPanel` | Single animated bar |
| `ReviewPanel` | `review` | Playback + retake + submit actions |
| `RecordedPlaybackBar` | `review` | Scrubbable playback bar for captured audio |
| `SubmittingCard` | after submit | Loader card while answer uploads |
| `MediaStatusInline` | anywhere | Compact inline status row for tight layouts |

All amplitude-driven UI accepts the recorder hook's `Animated.Value`
directly — no need to mirror it into state. (The Microphone Setup screen
*does* mirror it into a number for the percentage-width volume meter, but
that's the exception, not the rule.)

---

## 9. Question metadata source

`src/config/practiceData.ts` exports `QuestionMetadata` per subcategory.
The fields the audio module reads:

| Field | Type | Used for |
|---|---|---|
| `hasAudio` | `boolean` | Whether to enter `audio_wait` / `audio_playing` at all |
| `waitTimeBeforeAudio` | `number` (sec) | Length of `audio_wait` phase |
| `waitTimeBeforeRecording` | `number` (sec) | Length of `prep_countdown` phase |
| `pteCoreWaitTimeBeforeRecording` | `number?` (sec) | Override applied when `isCore` is true |
| `recordingDuration` | `number` (sec) | Cap on the recording. `0` ⇒ no recording stage. |
| `nextButtonBehavior` | `'enable' \| 'disable-until-audio-play'` | Screen-level "Next" gating (not the audio module's concern) |

A copy of the full timing table lives in
[`doc/api_config_doc.md`](./api_config_doc.md#3-practice-question-types-static-mapping).

---

## 10. Microphone Setup screen

`src/screens/Microphone/MicrophoneSetupScreen.tsx`

Onboarding flow that uses **the same two hooks** rather than reinventing the
wheel:

1. Runtime permission check (auto on mount; explicit `requestPermission` on
   button tap).
2. 5-second mic test via `useVoiceRecorder` with `maxDurationSec: 5`.
3. Plays the captured recording back via `useAudioPlayer` so the user can
   verify input.
4. Fancy hero animation (`MicPulse`) + 28-bar waveform visualisation +
   percentage volume meter — all driven by the recorder's `amplitude`
   `Animated.Value`.

This screen is the recommended reference when wiring the hooks into any
new audio-touching UI.

---

## 11. Native setup checklist

### iOS (`ios/LA/Info.plist`)

- `NSMicrophoneUsageDescription` — required string explaining why the app
  records audio. Without it, iOS rejects the permission request silently.
- The `AVAudioSession` is configured by `react-native-nitro-sound`
  internally; no additional code required.

### Android (`android/app/src/main/AndroidManifest.xml`)

- `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
- Runtime permission is requested by `useVoiceRecorder` on first
  `start()` call — see `requestAndroidPermission()`.
- File-system writes target the app's cache directory (default
  `nitro-sound` path) — no `WRITE_EXTERNAL_STORAGE` needed on API 29+.

After bumping the native dep run:

```bash
cd ios && pod install && cd ..
```

---

## 12. Adding a new audio-capable screen

The 5-step recipe:

```tsx
// 1. Pull metadata for this question type
const metadata = practiceData.find(p => p.id === subcategoryId)!;

// 2. Wire the orchestrator
const flow = useQuestionMediaFlow({
  metadata,
  audioUrl: question.audioUrl,
  isCore: useUser().variant === 'PTE_CORE',
  onRecordingFinish: (uri, durationSec) => {
    if (uri) uploadAnswer({ uri, durationSec });
  },
  onError: msg => showToast(msg, 'error'),
});

// 3. Render the right card based on phase
switch (flow.phase) {
  case 'audio_wait':       return <AudioWaitCard secondsLeft={flow.secondsLeft} />;
  case 'audio_playing':    return <AudioPlayingCard progress={flow.audioProgress} />;
  case 'prep_countdown':   return <PrepTimerCard secondsLeft={flow.secondsLeft} onRecordNow={flow.startRecordingNow} />;
  case 'recording':        return <RecordingPanel secondsLeft={flow.secondsLeft} amplitude={flow.amplitude} onStop={flow.stopRecording} />;
  case 'review':           return <ReviewPanel uri={flow.recordedUri!} durationSec={flow.recordingDurationSec} onRetake={flow.retake} onSubmit={submit} />;
  default:                 return null;
}

// 4. Tear down on navigate-away
useEffect(() => () => { flow.reset(); }, []);

// 5. Trust the hook — never call Sound.* directly from the screen
```

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| UI stays in `recording` after stop | Caller bypassed the hook and called `Sound.stopRecorder()` directly | Always use `recorder.stop()` / `flow.stopRecording()` |
| Recording works once then fails | Listener leak from a previous owner | Confirm coordinator `release()` ran — usually means you held on to a stale `Sound.add*Listener` outside the hook |
| Android permission re-prompts every time | `PermissionsAndroid.check` returning false despite grant | Likely API 30+ background restriction — direct user to Settings via `Linking.openSettings()` (see `MicrophoneSetupScreen` failed-step branch) |
| Waveform doesn't move | Forgot to pass `amplitude` from the hook into `RecordingPanel` / `WaveformBar` | Pass `recorder.amplitude` (or `flow.amplitude`), not a plain number |
| Two players talk over each other | Both bypass `soundCoordinator` | Only consume audio via `useAudioPlayer` — never construct your own `Sound.startPlayer` call |

---

## 14. Future work (`feature/audio-module` TODO)

Recently fixed in this branch:

- [x] **Playback rate selector** — `useAudioPlayer.setRate()` + threaded
      through `useQuestionMediaFlow.setPlaybackRate()`.
- [x] **`replayAudio()`** dedicated action so the "Play Audio" button no
      longer clobbers a captured recording.
- [x] **iOS permission flicker** — `setIsRecording(true)` now happens
      *after* `Sound.startRecorder` resolves, so the UI doesn't flash
      "Recording…" while the iOS mic prompt is on screen.
- [x] **AppState backgrounding** triggers a graceful stop with a new
      `'interrupted'` error code (replaces the silent "phantom recording"
      bug where users came back from backgrounded app with an empty file).
- [x] **Empty-file validation** — every captured URI is checked for
      non-zero size before being reported to the consumer. Empty files
      surface as `onError(..., 'empty')` + `onFinish(null, _)`.
- [x] **Android amplitude normalization** — formula now copes with both
      iOS (-60..0 dB) and Android (-160..0 dB) ranges plus the legacy
      linear 0..1 reporting some Android devices use.
- [x] **`secondsRemaining` initial value** — starts at `0` instead of
      `maxDurationSec` so the UI doesn't show a misleading countdown
      before recording begins.
- [x] **soundCoordinator dev warnings + `__resetForTests`** added.
- [x] **`useFocusEffect` cleanup** on `PracticeQuestionDetailScreen` so
      audio stops when navigating away.
- [x] **`replayAudio` no longer clobbers the captured recording** —
      previously `await recorder.reset()` inside `replayAudio` cleared
      the user's answer the moment they tapped Play Audio in review.
- [x] **No more "audio replay → infinite prep loop"** — `onComplete` /
      `onPreempt` / `onError` paths now route through `settleAfterAudio()`
      which checks `recordedRef.current` and lands back in `review` if a
      recording already exists, instead of unconditionally restarting the
      prep countdown.
- [x] **Android file URI normalization** — `fetch(uri)` in
      `isRecordingNonEmpty` now goes through `toFileUri()` which adds
      the missing `file:///` prefix for Android's bare absolute paths.
      Was causing every Android recording to surface as `'empty'`.
- [x] **Playback progress bar finishes at 100%** — the
      `addPlaybackEndListener` now snaps `positionMs` to `e.duration`
      so the bar fills completely instead of getting stuck at ~98%.
- [x] **Mic permission denied → Settings shortcut** —
      `PracticeQuestionDetailScreen.handleMediaError` shows an Alert
      with an "Open Settings" CTA when the error message indicates a
      permission issue.

Still outstanding:

- [ ] Background-audio session config on iOS (route audio through speaker
      even on silent mode for question audio)
- [ ] Bluetooth headset routing test pass
- [ ] Offline cache layer for question audio (currently re-streamed)
- [ ] Optional `react-native-track-player` evaluation for queued listening
      sections
- [ ] Unit tests for `soundCoordinator` preemption matrix
- [ ] Storybook entries for every `practiceMedia/*` component
- [ ] **Full audio session interruption handling** (mid-call resume,
      Siri/AirPods bursts) — requires a small native bridge module that
      forwards `AVAudioSessionInterruptionNotification` and Android
      `AudioManager.OnAudioFocusChangeListener` events into JS. AppState
      handling covers the dominant "app backgrounded" case.
- [ ] **Recording GC** — stale files in cache dir (`~/Library/Caches/`
      on iOS, `getCacheDir()` on Android) are pruned by the OS under
      storage pressure, but a session-list + age-based prune on app
      launch would be more polite to power users.
