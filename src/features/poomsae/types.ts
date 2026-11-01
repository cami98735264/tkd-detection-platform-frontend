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
  /** Expected hand shape (C.8); "" = not evaluated. */
  hand_shape?: HandShape | "" | null;
}

export type HandShape = "fist" | "knife" | "fingertips" | "palm" | "unknown";

/** Expected vs detected hand shape of a movement / technique (C.8). */
export interface HandCheck {
  expected: string | null;
  detected: string | null;
  confidence: number | null;
  evaluable: boolean;
  passed: boolean | null;
}

export interface PoomsaeProgress {
  segments_completed: number;
  segments_total: number;
  best_score: number | null;
  /** Best score of a full run-through (Addendum C.3). */
  best_full_score?: number | null;
  /** A full attempt scored ≥ 70 ("Forma certificada"). */
  full_completed?: boolean;
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
  /** Club-hosted reference video (C.5). */
  has_reference_video?: boolean;
  /** Endpoint path of the club-hosted video, or null. */
  reference_video_url?: string | null;
  reference_video_type?: string | null;
  reference_video_size?: number | null;
  /** Script verification by the maestro (C.9). */
  script_reviewed?: boolean;
  script_reviewed_by_name?: string | null;
  script_reviewed_at?: string | null;
  script_notes?: string | null;
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
  /** Numbers of the script movements in this segment (C.4). */
  movement_numbers?: number[] | null;
  /** Athlete's best completed score on this segment (name varies by serializer). */
  best_score?: number | null;
  my_best_score?: number | null;
}

export interface PoomsaeDetail extends Poomsae {
  segments: PoomsaeSegment[];
  /** Movement script summaries (C.4). */
  movements?: unknown[] | null;
  completed?: boolean;
  /** = my_progress.full_completed. */
  certified?: boolean;
}

export type StepKind = "forward" | "backward" | "in_place" | "side";

/** One row of the Kukkiwon movement script (C.1), normalised. */
export interface PoomsaeMovement {
  id: number | null;
  number: number;
  name: string;
  description: string;
  segment: number | null;
  stance: number | null;
  stance_name: string | null;
  hand: number | null;
  hand_name: string | null;
  kick: number | null;
  kick_name: string | null;
  turn_deg: number;
  step: StepKind | string | null;
  kihap: boolean;
  hold: boolean;
}

export interface MovementCheck {
  expected: number | string | null;
  measured: number | string | null;
  passed: boolean;
}

/** Per expected movement result of a sequence analysis (C.2). */
export interface MovementResult {
  number: number;
  name: string;
  matched: boolean;
  time_s: number | null;
  score: number | null;
  turn: MovementCheck | null;
  step: MovementCheck | null;
  hand: HandCheck | null;
  issues: string[];
}

export interface SequenceSummary {
  expected_movements: number;
  detected_movements: number;
  matched_in_order: number;
  missing: number[];
  extra: number;
  order_ok: boolean;
}

export interface SegmentResult {
  segment: number | null;
  segment_name: string;
  score: number | null;
  matched: number | null;
  expected: number | null;
}

export type AttemptMode = "segment" | "technique" | "full";
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
  user?: number | null;
  user_name?: string | null;
  poomsae?: number | null;
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
  /** Sequence modes only (C.2); absent on legacy attempts. */
  movement_results?: unknown;
  sequence_summary?: unknown;
  /** Full mode only (C.3). */
  segment_results?: unknown;
  /** Technique mode hand-shape result (C.8). */
  hand?: unknown;
  /** The script wasn't reviewed by the maestro when analysed (C.9). */
  script_provisional?: boolean;
}

export type ScriptMismatchKind =
  "missing" | "turn" | "step" | "stance" | "hand" | "kick" | "hand_shape";

export interface ScriptMismatch {
  number: number;
  name: string;
  kind: ScriptMismatchKind | string;
  expected: string | number | null;
  measured: string | number | null;
  suggestion: string;
}

export interface ScriptCheckResult {
  attempt: number | null;
  mismatches: ScriptMismatch[];
  ok: boolean;
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
  /** Full mode (C.3). */
  poomsae?: number;
  athlete?: number | null;
  recording?: Blob | null;
  landmarks?: LandmarkFrame[] | null;
}

// --- Calibration tools (C.4) -------------------------------------------------

export interface CriterionStats {
  key: string;
  label: string;
  min: number | null;
  max: number | null;
  unit: string;
  n: number;
  mean: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
  /** 0–1 (or 0–100 from some serializers; see lib). */
  pass_rate: number | null;
}

export interface TechniqueStats {
  technique: number | null;
  attempts: number;
  criteria: CriterionStats[];
}

export type CalibrationTolerance = "normal" | "strict" | "lenient";

export interface ProposedRange {
  key: string;
  label: string;
  unit: string;
  current: [number | null, number | null];
  proposed: [number | null, number | null];
  samples: number;
}

export interface CalibrationProposal {
  proposed: ProposedRange[];
  applied: boolean;
}

export interface TechniqueCalibration {
  id: number;
  created_at: string | null;
  created_by_name: string | null;
  attempt_ids: number[];
  previous_criteria: TechniqueCriterion[];
  new_criteria: TechniqueCriterion[];
  reverted: boolean;
}
