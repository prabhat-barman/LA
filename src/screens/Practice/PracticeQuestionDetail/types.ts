// Shared types for the Practice Question Detail screen and its sub-components.

export type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';

/**
 * Per-question voice variant returned by the list endpoint as
 * `question_audios[]`. `label` is the display name (e.g. "Lily") and
 * `value` is the storage path of the corresponding mp3. Only the voices
 * present in this array are actually playable for the question — the
 * top-level `voices` array on the API response is the global catalogue
 * and may include voices that have not yet been recorded for this item.
 */
export interface QuestionAudioVariant {
  label: string;
  value: string;
  question_id?: number | string;
}

/**
 * Multiple-choice option attached to a Reading / Listening MCQ question.
 * The backend ships these unsorted (raw insertion order), so callers must
 * sort by the leading letter (`A)`, `B)` …) before rendering.
 *
 * `correct` is `0`/`1` — for single-answer (cat 8/14) only one option is `1`;
 * for multi-answer (cat 9/15) multiple can be `1`.
 */
export interface MCQOption {
  id: number | string;
  question_id?: number | string;
  options: string;
  correct: number | string;
  index?: number;
}

export interface QuestionDetails {
  id: string | number;
  title?: string;
  q_title?: string;
  question_title?: string;
  name?: string;
  question?: string;
  question_mcq?: string;
  // Legacy alias for `question_mcq` returned by older endpoints. Newer
  // responses use `question_mcq`; keep both so the screen can fall back
  // without a runtime cast.
  mcq_question?: string;
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
  image_link?: string;
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
  question_audios?: QuestionAudioVariant[];
  option?: MCQOption[];
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
  // MCQ-only fields. `answer` holds the selected option id(s) as a
  // string (comma-separated for multi-answer); `correct` holds the
  // canonical correct id(s); `html` is the displayable option text the
  // user picked. These travel through `SHOW_HISTORY` for cat 8/9/14/15.
  answer?: string;
  correct?: string;
  html?: string;
  type?: number | string;
  // Present on the "Other students' attempts" feed (`SHOW_HISTORY`'s
  // `others` branch). Shape varies — sometimes an object, sometimes a
  // single-element array — so consumers route it through
  // `getAttemptUserName` which handles both.
  user?: unknown;
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
