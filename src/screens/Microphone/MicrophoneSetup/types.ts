// Stages the microphone setup flow walks the user through.
export type SetupStep = 'permission' | 'testing' | 'complete' | 'failed';

export interface MicTip {
  icon: string;
  tip: string;
}
