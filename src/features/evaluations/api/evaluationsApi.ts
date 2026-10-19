import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Evaluation } from "@/types/entities";

export interface EvaluationMetricPayload {
  id?: number | null;
  metric_name: string;
  score: number;
  notes?: string | null;
}

export interface EvaluationCreatePayload {
  athlete: number;
  program?: number | null;
  evaluated_at: string;
  result_summary: string;
  metrics: EvaluationMetricPayload[];
  notes?: string | null;
}

/** Only result_summary and notes can be updated by non-admin. */
export type EvaluationUpdatePayload = Partial<EvaluationCreatePayload>;

/** What EvaluationFormModal submits: a full create body or a partial update. */
export type EvaluationFormPayload = EvaluationCreatePayload | EvaluationUpdatePayload;

export const evaluationsApi = {
  list: (page = 1, athleteId?: number) => {
    let url = `/evaluations/?page=${page}`;
    if (athleteId) url += `&athlete_id=${athleteId}`;
    return http.get<PaginatedResponse<Evaluation>>(url);
  },

  get: (id: number) => http.get<Evaluation>(`/evaluations/${id}/`),

  create: (data: EvaluationCreatePayload) => http.post<Evaluation>("/evaluations/", data),

  update: (id: number, data: EvaluationUpdatePayload) =>
    http.patch<Evaluation>(`/evaluations/${id}/`, data),

  delete: (id: number) => http.delete(`/evaluations/${id}/`),
};
