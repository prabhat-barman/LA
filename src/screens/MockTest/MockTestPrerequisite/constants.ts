import { Image } from 'react-native';
import type {
  MockSection,
  PrerequisiteSlide,
  PrerequisiteSlideKind,
} from './types';

// Per-category slide order. Mirrors the reference project's
// `carouselDataMap`. One deviation: we collapse the reference's two
// welcome tables (Part/Content/Time + Section/No.Q/Time) into a
// single `welcome-table` because the second table's section question
// counts are already surfaced by `module-intro`.
//
// The `intro-recording` (Personal Introduction) slide appears only
// where the candidate actually does speaking — Speaking, Full Mock,
// and the (rare) Reading/Listening sectionals that some PTE platforms
// include for identity verification. We follow the reference: it's
// part of every flow EXCEPT pure Writing, where there's no spoken
// component and the recording would be wasted.
//
//   • Speaking   → headset, mic, intro recording, module intro
//   • Writing    → keyboard, module intro
//   • Reading    → headset, mic, keyboard, intro recording, module intro
//   • Listening  → headset, mic, keyboard, intro recording, module intro
//   • Full Mock  → headset, mic, keyboard, test intro, speaking
//                  instructions, welcome table, intro recording,
//                  module intro
export const SLIDE_ORDER_BY_CATEGORY: Record<
  MockSection | 'Full Mock',
  PrerequisiteSlideKind[]
> = {
  Speaking: [
    'headset-check',
    'microphone-check',
    'intro-recording',
    'module-intro',
  ],
  Writing: ['keyboard-check', 'module-intro'],
  Reading: [
    'headset-check',
    'microphone-check',
    'keyboard-check',
    'intro-recording',
    'module-intro',
  ],
  Listening: [
    'headset-check',
    'microphone-check',
    'keyboard-check',
    'intro-recording',
    'module-intro',
  ],
  'Full Mock': [
    'headset-check',
    'microphone-check',
    'keyboard-check',
    'test-introduction',
    'speaking-instructions',
    'welcome-table',
    'intro-recording',
    'module-intro',
  ],
};

// Builds the typed slide list for a given category. Stable ids let
// FlatList's `keyExtractor` work without re-rendering on prop changes.
export const buildSlideList = (
  category: MockSection | 'Full Mock',
): PrerequisiteSlide[] => {
  return SLIDE_ORDER_BY_CATEGORY[category].map(kind => ({
    kind,
    id: `${category}-${kind}`,
  }));
};

// Bundled headset-check sample. Resolved via `Image.resolveAssetSource`
// so the native player gets a usable URL in both dev (Metro-served)
// and prod (bundled `file://` path). Using a local asset (instead of
// the SoundHelix sample we shipped initially) means the prereq works
// offline and never blocks on a remote fetch.
const HEADSET_CHECK_AUDIO_ASSET = require('../../../assets/audio/headsetCheck.mp3');
export const HEADSET_CHECK_AUDIO_URL =
  Image.resolveAssetSource(HEADSET_CHECK_AUDIO_ASSET).uri;

// Plain-language tip shown beneath the headset player.
export const HEADSET_CHECK_TIP =
  'Make sure you are wearing your headphones and adjust the volume to a comfortable level before continuing. The Next button will unlock once you have played the sample.';

// Step list shown beneath the mic recorder.
export const MICROPHONE_CHECK_INSTRUCTIONS: ReadonlyArray<string> = [
  'When you are ready, click the Record button and say "Testing, testing, one two three" out loud.',
  'Wait for the recording to finish (up to 20 seconds) or tap Stop yourself.',
  'Tap Playback to verify the audio came through clearly.',
  'If you can hear your own voice, you are ready to continue.',
];

// Step list shown beneath the keyboard practice input.
export const KEYBOARD_CHECK_INSTRUCTIONS: ReadonlyArray<string> = [
  'Tap the input below and type a short sentence to make sure your keyboard is responsive.',
  'You can switch between alphabet, number, and symbol layouts to confirm they all work.',
  'When the test starts you will type your answers in similar text fields.',
];

// Bulleted body for the Full Mock "Test Introduction" slide. Mirrors
// the static copy the reference project ships — kept verbose because
// real PTE candidates expect this level of detail before starting.
export const TEST_INTRODUCTION_TIPS: ReadonlyArray<string> = [
  'The test is divided into 3 parts. Each part may contain a number of sections that are individually timed. The timer is shown in the header.',
  'At the beginning of each part you will receive specific instructions detailing what to expect.',
  'Tapping Next confirms your answer and moves to the next question. Once you advance you cannot return to a previous question.',
  'You will be offered an optional break of up to 10 minutes before the Listening part.',
  'This test makes use of different varieties of English (British, American, Australian). You may answer in any standard variety.',
];

// Static script for the "Speaking Instructions" slide. The reference
// project pairs the prose with a four-image diagram gallery — we ship
// the prose alone for Phase 1.2.b and add the gallery later once
// we've sourced the assets.
export const SPEAKING_INSTRUCTIONS_BODY: ReadonlyArray<{
  heading: string;
  text: string;
}> = [
  {
    heading: 'Listening',
    text: 'The "Current Status" indicator tells you how long you have until the audio clip starts. A progress bar shows playback. When it reaches the right edge the clip will stop playing.',
  },
  {
    heading: 'Speaking',
    text: 'The "Current Status" indicator tells you how long you have until the microphone opens. Start speaking when the status changes to "Recording". You must finish before the progress bar reaches the right edge. If you stay silent for longer than 3 seconds the recording will stop and you cannot re-record.',
  },
];

// Personal Introduction (PTE-style identity-verification recording).
// The reference's `IntroduceYourSelf` slide shows a long prompt that
// the candidate reads aloud before recording. The recording is NOT
// scored — it's attached to the score report so the receiving
// institution can verify the speaker's voice. We surface the prompt
// verbatim so candidates aren't surprised by what to say.
export const PERSONAL_INTRO_PROMPT =
  'Please introduce yourself. For example, you could talk about one or more of the following: your interests, your plans for future study, why you want to study abroad, why you need to learn English, why you chose this test. You will have 25 seconds to think about your response and a further 30 seconds to record your answer. Your response will be sent together with your score report to the institutions you have nominated to receive them.';

export const INTRO_RECORDING_INSTRUCTIONS: ReadonlyArray<string> = [
  'Read the prompt above carefully before you start recording.',
  'Tap Record when you are ready, then speak clearly into the microphone for up to 20 seconds.',
  'You can tap Playback to listen to your introduction and re-record if you would like another take.',
  'When you are happy with the recording, tap Next to continue. This recording is for verification only and is not graded.',
];
