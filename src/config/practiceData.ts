import { colors } from '../theme/colors';

const Colors = {
  green_color: colors.success,
};

const text = {
  take_test: 'Take Test',
  mock_pending: 'Mock Pending',
  mock_result: 'Mock Result',
  progress_tracker: 'Progress Tracker',
};

export type { QuestionMetadata } from './subcategoryConfig';
export { QUESTION_METADATA } from './subcategoryConfig';


export const Data = {
  LOCKED_IDS: new Set([1, 2, 3, 4, 5, 6, 7, 13, 21, 22]),
  audiovariableSpeed: [
    { id: 0.5, name: "0.5 x" },
    { id: 1.0, name: "1.0 x" },
    { id: 1.5, name: "1.5 x" },
    { id: 2.0, name: "2.0 x" },
  ],
  speakingSection: [
    { name: "Read Aloud", id: 1 },
    { name: "Repeat Sentence", id: 2 },
    { name: "Describe Image", id: 3 },
    { name: "Re-tell Lecture", id: 4 },
    { name: "Answer Short Questions", id: 5 },
  ],
  PteCore_speakingSection: [
    { name: "Read Aloud", id: 1 },
    { name: "Repeat Sentence", id: 2 },
    { name: "Describe Image", id: 3 },
    { name: "Respond to a Situation", id: 21 },
    { name: "Answer Short Questions", id: 5 },
  ],
  writingSection: [
    { name: "Summarize Written Text", id: 6 },
    { name: "Write Essay", id: 7 },
  ],
  PteCore_writingSection: [
    { name: "Summarize Written Text", id: 6 },
    { name: "Write Email", id: 7 },
  ],
  readingSection: [
    { name: "Multiple Type, Single Answer", id: 8 },
    { name: "Multiple Type, Multiple Answer", id: 9 },
    { name: "Reorder Paragraph", id: 10 },
    { name: "Reading Fill in the Blanks", id: 11 },
    { name: "Fill in the Blanks Reading and Writing", id: 12 },
  ],
  listeningSection: [
    { name: "Summarize Spoken Text", id: 13 },
    { name: "MCQ Multiple Answer", id: 15 },
    { name: "Listening Fill in the Blanks", id: 16 },
    { name: "Highlight Correct Summary", id: 17 },
    { name: "MCQ Single Answer", id: 14 },
    { name: "Select Missing Word", id: 18 },
    { name: "Highlight Incorrect Word", id: 19 },
    { name: "Write From Dictation", id: 20 },
  ],
  ptecorelisteningSection: [
    { name: "Summarize Spoken text", id: 13 },
    { name: "MCQ multiple answer", id: 15 },
    { name: "Listening Fill in the Blanks", id: 16 },
    { name: "MCQ single answer", id: 14 },
    { name: "Select Missing Word", id: 18 },
    { name: "Highlight Incorrect word", id: 19 },
    { name: "Write from Dictation", id: 20 },
  ],
  totalSection: [
    { name: "Read Aloud", id: 1 },
    { name: "Repeat Sentence", id: 2 },
    { name: "Describe Image", id: 3 },
    { name: "Re-tell Lecture", id: 4 },
    { name: "Answer Short Questions", id: 5 },
    { name: "Summarize Written Text", id: 6 },
    { name: "Write Essay", id: 7 },
    { name: "Multiple Type, Single Answer", id: 8 },
    { name: "Multiple Type, Multiple Answer", id: 9 },
    { name: "Reorder Paragraph", id: 10 },
    { name: "Reading Fill in the Blanks", id: 11 },
    { name: "Fill in the Blanks Reading and Writing", id: 12 },
    { name: "Summarize Spoken text", id: 13 },
    { name: "MCQ single answer", id: 14 },
    { name: "MCQ multiple answer", id: 15 },
    { name: "Listening Fill in the Blanks", id: 16 },
    { name: "Highlight correct summary", id: 17 },
    { name: "Select Missing Word", id: 18 },
    { name: "Highlight Incorrect word", id: 19 },
    { name: "write from Dictation", id: 20 },
  ],
  center: [
    { label: "Offline", value: "0" },
    { label: "Online", value: "1" },
  ],

  selectBranch: [
    "Please Select Branch",
    "LA Parramatta Branch",
    "LA Sydney CBD Branch ",
    "LA Jalandhar Branch",
    "LA Gurdaspur Branch",
    "LA Amritsar Branch",
    "LA Sirsa Branch",
    "LA Sir Ganganagar Branch",
    "LA Kurukshetra Branch",
    "LA Online Student",
    "Not a student with LA",
  ],

  selectBranchFreeTrial: [
    "LA Parramatta Branch",
    "LA Sydney CBD Branch ",
    "LA Jalandhar Branch",
    "LA Gurdaspur Branch",
    "LA Amritsar Branch",
    "LA Online Student",
    "Not a student with LA",
  ],

  defaultLang: ["en-US", "en-GB"],

  selectDesiredScore: [
    "Select Desired Score",
    "36+ (5 Bands)",
    "42+ (5.5 Bands)",
    "50+ (6 Bands)",
    "58+ (6.5 Bands)",
    "65+ (7 Bands)",
    "73+ (7.5 Bands)",
    "79+ (8 Bands)",
  ],

  selectDesiredScoreWhole: [
    {
      value: "24",
      label: "24+ (4.5 Bands)",
      pte_overall: "24+",
      pte_listening: "26+",
      pte_reading: "29+",
      pte_speaking: "14+",
      pte_writing: "17+",
    },
    {
      value: "31",
      label: "31+ (5.0 Bands)",
      pte_overall: "31+",
      pte_listening: "33+",
      pte_reading: "36+",
      pte_speaking: "24+",
      pte_writing: "29+",
    },
    {
      value: "39",
      label: "39+ (5.5 Bands)",
      pte_overall: "39+",
      pte_listening: "40+",
      pte_reading: "42+",
      pte_speaking: "39+",
      pte_writing: "41+",
    },
    {
      value: "47",
      label: "47+ (6.0 Bands)",
      pte_overall: "47+",
      pte_listening: "47+",
      pte_reading: "48+",
      pte_speaking: "54+",
      pte_writing: "51+",
    },
    {
      value: "55",
      label: "55+ (6.5 Bands)",
      pte_overall: "55+",
      pte_listening: "53+",
      pte_reading: "54+",
      pte_speaking: "66+",
      pte_writing: "60+",
    },
    {
      value: "63",
      label: "63+ (7.0 Bands)",
      pte_overall: "63+",
      pte_listening: "58+",
      pte_reading: "59+",
      pte_speaking: "76+",
      pte_writing: "69+",
    },
    {
      value: "71",
      label: "71+ (7.5 Bands)",
      pte_overall: "71+",
      pte_listening: "64+",
      pte_reading: "65+",
      pte_speaking: "83+",
      pte_writing: "77+",
    },
    {
      value: "79",
      label: "79+ (8.0 Bands)",
      pte_overall: "79+",
      pte_listening: "69+",
      pte_reading: "70+",
      pte_speaking: "88+",
      pte_writing: "85+",
    },
    {
      value: "86",
      label: "86+ (8.5 Bands)",
      pte_overall: "86+",
      pte_listening: "75+",
      pte_reading: "75+",
      pte_speaking: "90",
      pte_writing: "90",
    },
    {
      value: "90",
      label: "90 (9.0 Bands)",
      pte_overall: "90",
      pte_listening: "81+",
      pte_reading: "81+",
      pte_speaking: null,
      pte_writing: null,
    },
  ],

  // Legacy score mapping for backward compatibility
  LEGACY_SCORE_MAPPING: {
    50: "31",
    55: "39",
    60: "47",
    65: "55",
    70: "63",
    75: "71",
    80: "79",
  } as Record<number, string>,

  // Helper function to migrate old score values to new format
  migrateLegacyScore: (value: any) => {
    const mapping: Record<string | number, string> = {
      // Legacy strings (e.g., '60')
      50: "31",
      55: "39",
      60: "47",
      65: "55",
      70: "63",
      75: "71",
      80: "79",
      // Legacy Band strings (e.g., '6.0')
      4.5: "24",
      "5.0": "31",
      5.5: "39",
      "6.0": "47",
      6.5: "55",
      "7.0": "63",
      7.5: "71",
      "8.0": "79",
      8.5: "86",
      "9.0": "90",
    };
    return mapping[value] || value;
  },
  scoreType: [
    { id: 0, name: "Content" },
    { id: 1, name: "Fluency" },
    { id: 2, name: "Pronunciation" },
    { id: 3, name: "Score" },
    { id: 4, name: "Grammar" },
    { id: 5, name: "Form" },
    { id: 6, name: "Vocabulary" },
    { id: 7, name: "Spelling" },
    { id: 8, name: "Structure" },
    { id: 9, name: "Linguistic range" },
  ],

  pte_core_scoreType: [
    { id: 0, name: "CONTENT" },
    { id: 1, name: "FLUENCY" },
    { id: 2, name: "PRONUNCIATION" },
    { id: 3, name: "SCORE" },
    { id: 4, name: "GRAMMAR" },
    { id: 5, name: "FROM" },
    { id: 6, name: "VOCABULARY" },
    { id: 7, name: "SPELLING" },
    { id: 8, name: "ORGANIZATION" },
    { id: 9, name: "EMAIL CONVENTIONS" },
  ],
  pagination: ["10", "50", "100", "500"],
  tagArray: [
    { color: "gray" },
    { color: "#e6d515" },
    { color: "#FF6464" },
    { color: Colors.green_color },
  ],
  tagArrayForDropdown: [
    { label: "No Tag", value: "gray" },
    { label: "Yellow", value: "#e6d515" },
    { label: "Red", value: "#FF6464" },
    { label: "Green", value: Colors.green_color },
  ],
  tagData: [
    { label: "No Tag", value: "0", color: "gray" },
    { label: "Yellow Tag", value: "1", color: "#e6d515" },
    { label: "Red Tag", value: "2", color: "#FF6464" },
    { label: "Green Tag", value: "3", color: Colors.green_color },
  ],
  center_mode: ["Offline", "Online"],

  QUESTION_TYPE_MAPPING: {
    1: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25], // Speaking
    2: [6, 7], // Writing
    3: [8, 9, 10, 11, 12], // Reading
    4: [13, 14, 15, 16, 17, 18, 19, 20], // Listening
    5: [21, 22, 23, 24, 25], // Full Mock
  } as Record<number, number[]>,

  // Remark type titles for score categorization
  REMARK_TITLES: {
    0: "Content : ",
    1: "Fluency : ",
    2: "Pronunciation : ",
    3: "Score : ",
    4: "Grammar :",
    5: "Form : ",
    6: "Vocabulary : ",
    7: "Spelling : ",
    8: "Structure : ",
    9: "Linguistic range : ",
  } as Record<number, string>,

  // Question type descriptions
  QUESTION_TYPES: {
    1: "Read Aloud",
    2: "Repeat Sentence",
    3: "Describe Image",
    4: "Retell Lecture",
    5: "Answer Short Question",
    6: "Summarize Written Text",
    7: "Write Essay",
    8: "Multiple Choice, Single Answer",
    9: "Multiple Choice, Multiple Answers",
    10: "Reorder Paragraph",
    11: "Fill in the Blanks (Drag and Drop)",
    12: "Fill in the Blanks (Dropdown)",
    13: "Summarize Spoken Text",
    14: "Multiple Choice, Single Answer",
    15: "Multiple Choice, Multiple Answers",
    16: "Fill in the Blanks (Type In)",
    17: "Highlight Correct Summary",
    18: "Select Missing Word",
    19: "Highlight Incorrect Words",
    20: "Write from Dictation",
    21: "Respond to a Situation",
    22: "Summarize Group Discussion",
  } as Record<number, string>,
  PTE_CORE_QUESTION_TYPES: {
    1: "Read Aloud",
    2: "Repeat Sentence",
    3: "Describe Image",
    4: "Respond to a Situation",
    5: "Answer Short Question",
    6: "Summarize Written Text",
    7: "Write Email",
    8: "Multiple Choice, Single Answer ",
    9: "Multiple Choice, Multiple Answer ",
    10: "Reorder Paragraph",
    11: "Fill in the Blanks (Drag and Drop)",
    12: "Fill in the Blanks (Dropdown)",
    13: "Summarize Spoken Text",
    14: "Multiple Choice, Single Answer",
    15: "Multiple Choice, Multiple Answers",
    16: "Fill in the Blanks (Type In)",
    18: "Select Missing Word",
    19: "Highlight Incorrect Words",
    20: "Write from Dictation",
  } as Record<number, string>,

  InstructionText: [
    {
      id: 1,
      text: `Look at the text below. In 35 seconds, you must read this text aloud as naturally and clearly as possible. You have 35 seconds to read aloud.`,
      maxRecordingSeconds: 35,
      paragraph:
        "A team of international researchers has uncovered a fascinating phenomenon: in response to rising global temperatures, Himalayan glaciers are actively working to preserve themselves by cooling the air in contact with their ice surface. However, it remains unclear how long these glaciers can continue to fight back against the effects of climate change.",
    },
    {
      id: 2,
      text: `You will hear a sentence. Please repeat the sentence exactly as you hear it. You will hear the sentence only once.`,
    },
    {
      id: 3,
      text: `Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing. You will have 40 seconds to give your response.`,
      maxRecordingSeconds: 40,
    },
    {
      id: 4,
      text: `You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard from the lecture in your own words. You will have 40 seconds to give your response.`,
      maxRecordingSeconds: 40,
      pteCore: `Listen to and read a description of a situation. You will have 20 seconds to think about your answer. Then you will hear a beep. You will have 40 seconds to answer the question. Please answer as completely as you can.`,
    },
    {
      id: 5,
      text: `You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.`,
      maxRecordingSeconds: 10,
      pteCore: `You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.`,
    },
    {
      id: 6,
      text: `Read the passage and summarise it using one sentence. Type your response in the box at the bottom of the screen. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points in the passage.`,
      pteCore: `Read the passage below. Summarise the passage using between 25 and 50 words. Type your response in the box at the bottom of the screen. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points in the passage.`,
    },
    {
      id: 7,
      text: `You will have 20 minutes to plan, write and revise an essay about the topic below. Your response will be judged on how well you develop a position, organize your ideas, present supporting details, and control the elements of standard written English. You should write 200-300 words.`,
      pteCore: `Read a description of a situation. Then write an email about the situation. You will have 9 minutes. You should aim to write 80-120 words. Write using complete sentences.`,
    },
    {
      id: 8,
      text: `Read the text and answer the multiple-choice question by selecting the correct response. Only one response is correct.`,
    },
    {
      id: 9,
      text: `Read the text and answer the question by selecting all the correct responses. More than one response is correct.`,
    },
    {
      id: 10,
      text: `The text boxes in the panel have been placed in a random order. Restore the original order by dragging the text boxes in the panel below.`,
    },
    {
      id: 11,
      text: `In the text below some words are missing. Drag words from the text box below to the appropriate place in the text. To undo an answer choice, drag the word back to the box below the text.`,
    },
    {
      id: 12,
      text: `Below is a text with blanks. Tap on each blank, a list of choices will appear. Select the appropriate answer choice for each blank.`,
    },
    {
      id: 13,
      text: `You will hear a short lecture. Write a summary for a fellow student who was not present at the lecture. You should write 50-70 words. You have 10 minutes to finish the task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the lecture.`,
      pteCore: `You will hear a short audio. Write a summary for a fellow student who was not present. You should write 20-30 words. You have 8 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the audio.`,
    },
    {
      id: 14,
      text: `Listen to the recording and answer the multiple-choice question by selecting the correct response. Only one response is correct.`,
    },
    {
      id: 15,
      text: `Listen to the recording and answer the question by selecting all the correct responses. You will need to select more than one response.`,
    },
    {
      id: 16,
      text: `You will hear a recording. Type the missing words in each blank.`,
    },
    {
      id: 17,
      text: `You will hear a recording. Tap on the paragraph that best relates to the recording.`,
    },
    {
      id: 18,
      text: `You will hear a recording about {Question Title}. At the end of the recording the last word or group of words has been replaced by a beep. Select the correct option to complete the recording.`,
    },
    {
      id: 19,
      text: `You will hear a recording. Below is a transcription of the recording. Some words in the transcription differ from what the speaker(s) said. Please tap on the words that are different.`,
    },
    {
      id: 20,
      text: `You will hear a sentence. Type the sentence in the box below exactly as you hear it. Write as much of the sentence as you can. You will hear the sentence only once.`,
    },
    {
      id: 21,
      text: `Listen to and read a description of a situation. You will have 10 seconds to think about your answer. Then you will hear a beep. You will have 40 seconds to answer the question. Please answer as completely as you can.`,
      maxRecordingSeconds: 40,
      pteCore: `Listen to and read a description of a situation. You will have 20 seconds to think about your answer. Then you will hear a beep. You will have 40 seconds to answer the question. Please answer as completely as you can.`,
    },
    {
      id: 22,
      text: `You will hear three people having a discussion. When you hear the beep, summarize the whole discussion. You will have 10 seconds to prepare and 2 minutes to give your response.`,
      maxRecordingSeconds: 120,
    },
  ],
  practiceItems: {
    Speaking: [
      { id: 1, title: "Read Aloud" },
      { id: 2, title: "Repeat Sentence" },
      { id: 3, title: "Describe Image" },
      { id: 4, title: "Re-tell lecture" },
      { id: 21, title: "Respond to a Situation" },
      { id: 22, title: "Summarize Group Discussion" },
      { id: 5, title: "Answer Short Questions" },
    ],
    Writing: [
      { id: 6, title: "Summarize Written Text" },
      { id: 7, title: "Write Essay" },
    ],
    Reading: [
      { id: 8, title: "Multiple Type, Single Answer" },
      { id: 9, title: "Multiple Type, Multiple Answer" },
      { id: 10, title: "Reorder Paragraph" },
      { id: 11, title: "Reading Fill in the Blanks" },
      { id: 12, title: "Fill in the Blanks Reading and Writing" },
    ],
    Listening: [
      { id: 13, title: "Summarize Spoken Text" },
      { id: 15, title: "MCQ Multiple Answer" },
      { id: 16, title: "Listening Fill in the Blanks" },
      { id: 17, title: "Highlight Correct Summary" },
      { id: 14, title: "MCQ Single Answer" },
      { id: 18, title: "Select Missing Word" },
      { id: 19, title: "Highlight Incorrect Word" },
      { id: 20, title: "Write From Dictation" },
    ],
  },
  materialOptions: [
    {
      id: 1,
      title: "Practice Question",
      screen: "PracticeScreen",
    },
    {
      id: 2,
      title: "Monthly Prediction",
      screen: "WeeklyPredictionScreen",
    },
    {
      id: 3,
      title: "Progress Tracker",
      screen: "ProgressTrackerScreen",
    },
  ],
  pte_core_materialOptions: [
    {
      id: 1,
      title: "Practice Question",
      screen: "PracticeScreen",
    },
    {
      id: 2,
      title: "Monthly Prediction",
      screen: "WeeklyPredictionScreen",
    },
    {
      id: 3,
      title: "Progress Tracker",
      screen: "ProgressTrackerScreen",
    },
  ],
  mockmaterialOptions: [
    {
      id: 1,
      title: text.take_test,
      screen: "MockTestHome",
    },
    { id: 2, title: text.mock_pending, screen: "MockTestHome" },
    { id: 3, title: text.mock_result, screen: "MockTestResultScreen" },
    { id: 4, title: text.progress_tracker, screen: "ProgressTrackerScreen" },
  ],
  pte_core_mockmaterialOptions: [
    {
      id: 1,
      title: text.take_test,
      screen: "MockTestHome",
    },
    { id: 2, title: text.mock_pending, screen: "MockTestHome" },
    { id: 3, title: text.mock_result, screen: "MockTestResultScreen" },
    { id: 4, title: text.progress_tracker, screen: "ProgressTrackerScreen" },
  ],
};

export default Data;
