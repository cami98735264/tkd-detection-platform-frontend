import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Evaluation } from "@/types/entities";

export const evaluationsApi = {
  list: (page = 1, athleteId?: number) => {
    let url = `/evaluations/?page=${page}`;
    if (athleteId) url += `&athlete_id=${athleteId}`;
    return http.get<PaginatedResponse<Evaluation>>(url);
  },

  get: (id: number) => http.get<Evaluation>(`/evaluations/${id}/`),

  create: (data: {
    athlete: number;
    program?: number | null;
    evaluated_at: string;
    result_summary: string;
    metrics: { metric_name: string; score: number; notes?: string | null }[];
    notes?: string | null;
  }) => http.post<Evaluation>("/evaluations/", data),

  /** Only result_summary and notes can be updated by non-admin */
  update: (
    id: number,
    data: {
      result_summary?: string;
      notes?: string | null;
      athlete?: number;
      program?: number | null;
      evaluated_at?: string;
      metrics?: { id?: number | null; metric_name: string; score: number; notes?: string | null }[];
    },
  ) => http.patch<Evaluation>(`/evaluations/${id}/`, data),

  delete: (id: number) => http.delete(`/evaluations/${id}/`),
};
