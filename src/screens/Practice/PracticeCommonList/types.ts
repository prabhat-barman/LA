export type TabName = 'All' | 'Prediction' | 'Exam Ques';

// Coloured tagging - matches the picker on PracticeQuestionDetailScreen
// so list and detail stay in sync.
export type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';

export interface ApiSubcategory {
  id: number;
  title: string;
  pte_core_title?: string;
  category: string;
  total_questions?: number;
  attempted?: number;
}

export interface QuestionItem {
  id: number | string;
  title: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
  isNew: boolean;
  isTagged?: boolean;
  tagColor?: TagColor;
  raw: unknown;
}
