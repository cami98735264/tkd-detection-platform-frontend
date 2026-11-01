import { http } from "@/lib/http";

export type KickType =
  "Ap Chagui" | "Yop Chagui" | "Dollyo Chagui" | "Tuit Chagui" | "An Tario Chagui" | "Furio Chagui";

export interface ConsentStatus {
  consent_granted: boolean;
  consent_timestamp: string | null;
  requires_parent_consent?: boolean;
  granted_by?: string;
}

/** Per-child consent row returned to a parent by GET /technical-evaluation/consent/. */
export interface AthleteConsent {
  athlete_id: number;
  athlete_name: string;
  consent_granted: boolean;
  consent_timestamp: string | null;
}

/** Sportsman → own ConsentStatus; parent → one AthleteConsent per linked child. */
export type ConsentResponse = ConsentStatus | AthleteConsent[];

export type MetricKey = "angle" | "height" | "speed" | "stability";

/** optimal: inside [optimal_min, optimal_max]; close: score ≥ 70; needs_work: else. */
export type MetricStatus = "optimal" | "close" | "needs_work";

/** Executed vs optimal comparison for one metric (contract addendum, listado 1). */
export interface MetricDetail {
  key: MetricKey;
  label: string;
  unit: string;
  value: number;
  optimal: number;
  optimal_min: number;
  optimal_max: number;
  /** value / optimal, rounded to 2 decimals. */
  ratio: number;
  score: number;
  status: MetricStatus;
  status_display: string;
  description: string;
}

export type RecommendationPriority = "high" | "medium" | "low";

export interface DetailedRecommendation {
  metric: MetricKey;
  priority: RecommendationPriority;
  title: string;
  detail: string;
  drills: string[];
}

export interface OptimalReference {
  kick_type: string;
  athlete_height_cm: number | null;
  height_basis: "athlete" | "estimated";
  source_note: string;
}

/** One kick found in the clip (analysis v2). */
export interface AnalyzedKick {
  time_s: number;
  leg: "left" | "right";
  overall: number;
  angle: number;
  height: number;
  speed: number;
  stability: number;
}

/** Recording-quality report of analysis v2 (absent for older sessions). */
export interface AnalysisQuality {
  version: number;
  real_fps?: number;
  detection_rate?: number;
  kicks_detected?: number;
  kicks?: AnalyzedKick[];
  kick_used?: { time_s: number; leg: "left" | "right"; index: number };
  view?: "side" | "front" | "diagonal" | "unknown";
  warnings?: string[];
  confidence?: number;
}

export interface EvaluationResults {
  angle: number;
  height: number;
  speed: number;
  stability: number;
  overall_score: number;
  /** Short summary (kept for backward compatibility). */
  recommendations: string;
  /** Absent on backends that predate the executed-vs-optimal addendum. */
  metrics?: MetricDetail[];
  detailed_recommendations?: DetailedRecommendation[];
  optimal_reference?: OptimalReference | null;
  analysis_quality?: AnalysisQuality | null;
}

export interface EvaluationSession {
  id: number;
  kick_type: KickType;
  recording_url: string;
  status: "recording" | "processing" | "completed" | "failed";
  results: EvaluationResults | null;
  recommendations: string;
  created_at: string;
}

export const technicalEvaluationApi = {
  getConsent: (athleteId?: number) => {
    const params = athleteId ? `?athlete_id=${athleteId}` : "";
    return http.get<ConsentResponse>(`/technical-evaluation/consent/${params}`);
  },

  setConsent: (granted: boolean, athleteId?: number) =>
    http.post<ConsentStatus>("/technical-evaluation/consent/", {
      consent_granted: granted,
      athlete_id: athleteId,
    }),

  listSessions: (athleteId?: number) => {
    const params = athleteId ? `?athlete_id=${athleteId}` : "";
    return http.get<EvaluationSession[]>(`/technical-evaluation/sessions/${params}`);
  },

  getSession: (id: number) => http.get<EvaluationSession>(`/technical-evaluation/sessions/${id}/`),

  deleteSession: (id: number) => http.delete(`/technical-evaluation/sessions/${id}/`),

  createSession: (kickType: KickType, recordingUrl: string, athleteId?: number) =>
    http.post<EvaluationSession>(
      "/technical-evaluation/sessions/",
      {
        kick_type: kickType,
        recording_url: recordingUrl,
        athlete_id: athleteId,
      },
      // Synchronous server-side analysis (MediaPipe model load + processing)
      // can take 30–60s on the first call after server start; the global 10s
      // axios timeout is too tight here.
      { timeout: 120_000 },
    ),
};
