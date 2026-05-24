// Shared types for the Practice Question Detail screen and its sub-components.

export type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';

export interface QuestionDetails {
  id: string | number;
  title?: string;
  q_title?: string;
  question_title?: string;
  name?: string;
  question?: string;
  text?: string;
  q_text?: string;
  paragraph?: string;
  audio?: string;
  audio_file?: string;
  question_audio?: string;
  q_audio?: string;
  image?: string;
  q_image?: string;
  question_image?: string;
  image_file?: string;
  sample_response?: string;
  answer?: string;
  model_answer?: string;
  sample_answer?: string;
  sample_audio?: string;
  sample_audio_file?: string;
  answer_audio?: string;
  transcript?: string;
  q_transcript?: string;
  audio_transcript?: string;
  translation?: string;
  q_translation?: string;
  audio_script?: string;
  script?: string;
  media_link?: string;
}

export interface AttemptLog {
  id: number | string;
  score?: any;
  overall_score?: any;
  total_score?: any;
  percentage?: any;
  score_percent?: any;
  created_at?: string;
  date?: string;
  fluency?: any;
  pronunciation?: any;
  content?: any;
}

export interface ScoreResult {
  score?: number;
  overall_score?: number;
  total_score?: number;
  score_percent?: number;
  percentage?: number;
  content_score?: number;
  fluency_score?: number;
  pronunciation_score?: number;
  grammar_score?: number;
  spelling_score?: number;
  content?: number;
  fluency?: number;
  pronunciation?: number;
  tutor_summary?: any;
  summary?: any;
  feedback?: any;
  words?: any[];
  word_details?: any[];
  new_html?: string;
  overall?: any;
  new_format?: any;
}

export type SortFilter = 'Latest' | 'Highest Score' | 'Lowest Score';
export type HistoryTab = 'me' | 'others';
export type PracticeMode = 'Normal' | 'One Line Strategy';
