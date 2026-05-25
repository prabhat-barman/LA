export interface QuestionMetadata {
  id: number;
  type: string;
  waitTimeBeforeAudio: number;
  hasAudio: boolean;
  waitTimeBeforeRecording: number;
  recordingDuration: number;
  nextButtonBehavior: string;
  pteCoreWaitTimeBeforeRecording?: number;
  timeLimitSec?: number;
}

export const QUESTION_METADATA: QuestionMetadata[] = [
  {
    "id": 1,
    "type": "Read Aloud",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 35,
    "recordingDuration": 35,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 2,
    "type": "Repeat Sentence",
    "waitTimeBeforeAudio": 3,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 10,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 3,
    "type": "Describe Image",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 25,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 4,
    "type": "Re-tell Lecture",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "pteCoreWaitTimeBeforeRecording": 20,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 5,
    "type": "Answer Short Questions",
    "waitTimeBeforeAudio": 3,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 10,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 6,
    "type": "Summarize Written Text",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable",
    "timeLimitSec": 600
  },
  {
    "id": 7,
    "type": "Write Essay",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable",
    "timeLimitSec": 1200
  },
  {
    "id": 8,
    "type": "Multiple Type, Single Answer",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 9,
    "type": "Multiple Type, Double Answer",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 10,
    "type": "Reorder Paragraph",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 11,
    "type": "Reading Fill in the Blanks",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 12,
    "type": "Fill in the Blanks (Reading & Writing)",
    "waitTimeBeforeAudio": 0,
    "hasAudio": false,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "enable"
  },
  {
    "id": 13,
    "type": "Summarize Spoken Text",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 14,
    "type": "MCQ Single Answer",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 15,
    "type": "MCQ Multiple Answer",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 16,
    "type": "Listening Fill in the Blanks",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 17,
    "type": "Highlight Correct Summary",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 18,
    "type": "Select Missing Word",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 19,
    "type": "Highlight Incorrect Word",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 20,
    "type": "Write from Dictation",
    "waitTimeBeforeAudio": 10,
    "hasAudio": true,
    "waitTimeBeforeRecording": 0,
    "recordingDuration": 0,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 21,
    "type": "Respond to a Situation",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "pteCoreWaitTimeBeforeRecording": 20,
    "recordingDuration": 40,
    "nextButtonBehavior": "disable-until-audio-play"
  },
  {
    "id": 22,
    "type": "Summarize Discussion",
    "waitTimeBeforeAudio": 8,
    "hasAudio": true,
    "waitTimeBeforeRecording": 10,
    "recordingDuration": 120,
    "nextButtonBehavior": "disable-until-audio-play"
  }
];
