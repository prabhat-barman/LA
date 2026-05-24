export type SkillCategory = 'Speaking' | 'Writing' | 'Reading' | 'Listening';

// Raw API video shape — backend can return any of several legacy field names,
// so the parser tolerates `unknown` and probes them defensively.
export type RawVideo = Record<string, unknown>;

export interface VideoItem {
  id: number | string;
  syntheticKey: string;
  chapter?: string;
  title: string;
  description?: string;
  duration?: string;
  author?: string;
  category?: SkillCategory;
  thumbnailUrl: string;
  videoUrl?: string;
  isIntro?: boolean;
  isFinalTip?: boolean;
  raw: RawVideo;
}

export interface ParsedVideosResponse {
  items: VideoItem[];
  message?: string;
}

export interface CategoryConfig {
  name: SkillCategory;
  color: string;
}
