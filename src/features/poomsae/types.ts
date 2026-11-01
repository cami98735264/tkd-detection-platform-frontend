// Req 8 — Poomsae learning & segmented evaluation (apps.poomsae).

export type TechniqueElement = "displacement" | "stance" | "block" | "hand_attack" | "kick";

export interface TechniqueCriterion {
  key: string;
  label: string;
  joint?: string;
  min?: number | null;
  max?: number | null;
  unit?: string;
}

export interface Technique {
  id: number;
  code: string;
  name: string;
  korean_name?: string;
  element: TechniqueElement;
  description?: string;
  criteria?: TechniqueCriterion[];
  difficulty?: number;
}

export interface PoomsaeProgress {
  segments_completed: number;
  segments_total: number;
  best_score: number | null;
}

export type VideoSource = "club" | "youtube" | "external";

export interface Poomsae {
  id: number;
  name: string;
  korean_name?: string;
  order: number;
  belt: number | null;
  belt_name: string | null;
  description: string;
  video_url: string | null;
  video_source?: VideoSource | null;
  video_credit?: string | null;
  video_license_note?: string | null;
  /** youtube-nocookie embed URL, or null. */
  video_embed_url: string | null;
  active?: boolean;
  segments_count: number;
  my_progress?: PoomsaeProgress | null;
}

export interface PoomsaeSegment {
  id: number;
  order: number;
  name: string;
  description: string;
  video_start_s: number | null;
  video_end_s: number | null;
  techniques: Technique[];
  expected_movements?: number | null;
  /** Athlete's best completed score on this segment (name varies by serializer). */
  best_score?: number | null;
  my_best_score?: number | null;
}

export interface PoomsaeDetail extends Poomsae {
  segments: PoomsaeSegment[];
}

export type AttemptMode = "segment" | "technique";
export type AttemptStatus = "processing" | "completed" | "failed";

export interface CriterionResult {
  key: string;
  label: string;
  value: number | string | null;
  expected: string | number | null;
  passed: boolean;
}

export interface PoomsaeAttempt {
  id: number;
  athlete?: number;
  athlete_name?: string;
  segment: number | null;
  segment_name?: string | null;
  poomsae_name?: string | null;
  technique: number | null;
  technique_name?: string | null;
  mode: AttemptMode;
  status: AttemptStatus;
  score: number | null;
  element_scores: Record<string, number> | null;
  criteria_results: CriterionResult[] | null;
  feedback: string;
  created_at: string;
}

/** One pose sample sent when the browser can't record video (fallback). */
export interface LandmarkFrame {
  /** Milliseconds since recording started. */
  t: number;
  landmarks: { x: number; y: number; z: number; visibility?: number }[];
}

export interface AttemptUpload {
  mode: AttemptMode;
  segment?: number;
  technique?: number;
  athlete?: number | null;
  recording?: Blob | null;
  landmarks?: LandmarkFrame[] | null;
}
