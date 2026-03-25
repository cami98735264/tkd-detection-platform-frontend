import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Evaluation } from "@/types/entities";

export const evaluationsApi = {
  list: (page = 1, athleteId?: number) => {
    let url = `/api/evaluations/?page=${page}`;
    if (athleteId) url += `&athlete_id=${athleteId}`;
    return http.get<PaginatedResponse<Evaluation>>(url);
  },

  get: (id: number) => http.get<Evaluation>(`/api/evaluations/${id}/`),

  create: (data: {
    athlete: number;
    program?: number | null;
    evaluated_at: string;
    result_summary: string;
    metrics: { metric_name: string; score: number; notes?: string | null }[];
    notes?: string | null;
  }) => http.post<Evaluation>("/api/evaluations/", data),

  /** Only result_summary and notes can be updated */
  update: (
    id: number,
    data: { result_summary?: string; notes?: string | null },
  ) => http.patch<Evaluation>(`/api/evaluations/${id}/`, data),

  delete: (id: number) => http.delete(`/api/evaluations/${id}/`),
};
