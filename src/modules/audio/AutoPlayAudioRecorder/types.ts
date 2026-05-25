export interface AutoPlayAudioRecorderProps {
  audioUrl?: string | null;
  audioStartDelay?: number;
  recordingStartDelay?: number;
  recordingDuration?: number;
  showAudio?: boolean;
  hideStopButton?: boolean;
  isExtensive?: boolean;
  onProcessComplete?: (data: ProcessCompletionPayload | null) => void;
  onAudioComplete?: () => void;
  onRecordingStart?: () => void;
  onRecordingComplete?: (data: {
    filePath: string;
    duration: number;
  }) => void;
  onRecordingData?: (data: unknown) => void;
  onPhaseChange?: (phase: RecorderPhase) => void;
  onStatusChange?: (status: RecorderStatus) => void;
  componentKey?: string;
  borderColor?: string;
  stopButtonShow?: boolean;
  isPaused?: boolean;
  isDarkMode?: boolean;
}

export interface AutoPlayAudioRecorderRef {
  stopRecording: () => Promise<
    { filePath: string; duration: number } | undefined
  >;
  cleanup: () => Promise<void>;
  stopAudio: () => Promise<void>;
  isCompleted: () => boolean;
}

// String enum kept loose so existing callsites that pass arbitrary
// phase names don't break. Canonical values listed for reference.
export type RecorderPhase =
  | 'waiting'
  | 'audio-countdown'
  | 'playing-audio'
  | 'recording-countdown'
  | 'recording'
  | 'completed'
  | string;

export interface RecorderStatus {
  phase: RecorderPhase;
  isAudioPlaying: boolean;
  isCountdownActive: boolean;
  isRecording: boolean;
  isCompleted: boolean;
}

export interface ProcessCompletionPayload {
  audioCompleted: boolean;
  recordingCompleted: boolean;
  recordingDuration: number;
  processCompleted: boolean;
  recordingFilePath: string;
  isCompleted: boolean;
}
