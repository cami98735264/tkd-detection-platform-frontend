import { http } from "@/lib/http";

export type KickType =
  | "Ap Chagui"
  | "Yop Chagui"
  | "Dollyo Chagui"
  | "Tuit Chagui"
  | "An Tario Chagui"
  | "Furio Chagui";

export interface ConsentStatus {
  consent_granted: boolean;
  consent_timestamp: string | null;
}

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
    return http.get<any>(`/technical-evaluation/consent/${params}`);
  },

  setConsent: (granted: boolean, athleteId?: number) =>
    http.post<any>("/technical-evaluation/consent/", {
      consent_granted: granted,
      athlete_id: athleteId,
    }),

  listSessions: (athleteId?: number) => {
    const params = athleteId ? `?athlete_id=${athleteId}` : "";
    return http.get<EvaluationSession[]>(`/technical-evaluation/sessions/${params}`);
  },

  getSession: (id: number) =>
    http.get<EvaluationSession>(`/technical-evaluation/sessions/${id}/`),

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