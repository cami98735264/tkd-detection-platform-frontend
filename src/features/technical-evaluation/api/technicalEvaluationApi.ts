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
  created_at: string;
}

export const technicalEvaluationApi = {
  getConsent: () => http.get<ConsentStatus>("/technical-evaluation/consent/"),

  setConsent: (granted: boolean) =>
    http.post<ConsentStatus>("/technical-evaluation/consent/", { consent_granted: granted }),

  listSessions: () => http.get<EvaluationSession[]>("/technical-evaluation/sessions/"),

  getSession: (id: number) =>
    http.get<EvaluationSession>(`/technical-evaluation/sessions/${id}/`),

  createSession: (kick_type: KickType, recording_url: string) =>
    http.post<EvaluationSession>("/technical-evaluation/sessions/", {
      kick_type,
      recording_url,
    }),
};