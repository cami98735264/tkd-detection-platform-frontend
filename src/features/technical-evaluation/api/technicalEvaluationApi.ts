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

export interface EvaluationResults {
  angle: number;
  height: number;
  speed: number;
  stability: number;
  overall_score: number;
  recommendations: string;
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
