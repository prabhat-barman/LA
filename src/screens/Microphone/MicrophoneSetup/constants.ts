import type { MicTip } from './types';

export const WAVE_BARS = 28;
export const MIC_TEST_DURATION_SEC = 5;
export const IDLE_AMPLITUDE = 0.15;

export const MIC_TIPS: ReadonlyArray<MicTip> = [
  { icon: '🔇', tip: 'Find a quiet room with minimal background noise' },
  { icon: '📏', tip: 'Hold device 15–20 cm from your mouth' },
  { icon: '🎙️', tip: "Don't cover the microphone with fingers" },
  { icon: '🔊', tip: 'Speak clearly at a normal conversational volume' },
];
