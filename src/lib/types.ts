export type Platform = "x" | "linkedin" | "instagram" | "youtube" | "newsletter" | "other";
export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "newsletter", label: "Newsletter" },
  { id: "other", label: "Other" },
];
export const platformLabel = (p: string) => PLATFORMS.find((x) => x.id === p)?.label ?? p;

export const FORMATS = [
  "Short posts",
  "Threads",
  "Long-form posts",
  "Newsletters",
  "Video scripts",
  "Carousels",
  "Polls & questions",
];

export interface Profile {
  id: string;
  creator_name: string | null;
  primary_platform: Platform | null;
  niche: string | null;
  goals: string | null;
  preferred_formats: string[];
  onboarding_completed: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  platform: Platform;
  source: "manual" | "url" | "csv" | "api";
  external_id: string | null;
  url: string | null;
  content: string;
  published_at: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  impressions: number | null;
  is_sample: boolean;
  created_at: string;
}

export type AnalysisKind = "writing_dna" | "performance_patterns" | "content_gaps" | "audience";

export interface AnalysisRow<T = unknown> {
  id: string;
  kind: AnalysisKind;
  version: number;
  posts_analysed: number;
  result: T;
  model: string | null;
  created_at: string;
}

export interface IdeaRow {
  id: string;
  topic: string;
  hook: string | null;
  angle: string | null;
  rationale: string | null;
  format: string | null;
  status: "new" | "saved" | "dismissed" | "used";
  created_at: string;
}
