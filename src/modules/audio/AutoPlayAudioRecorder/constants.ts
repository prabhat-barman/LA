// Inline config preserved from the original monolithic component.
// Extracted so timing magic numbers live in one place instead of being
// scattered across the audio state machine.
export const AudioConfig = {
  // How long we wait for the WebView/native player to load remote audio
  // before treating it as a buffer failure.
  AUDIO_LOAD_TIMEOUT: 15000,
} as const;

export const AudioErrorMessages = {
  RECORDING_FAILED: 'Recording failed. Please try again.',
} as const;
