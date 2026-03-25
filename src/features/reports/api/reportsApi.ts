import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Report } from "@/types/entities";

export const reportsApi = {
  list: (page = 1, status?: string) => {
    let url = `/api/reports/?page=${page}`;
    if (status) url += `&status=${status}`;
    return http.get<PaginatedResponse<Report>>(url);
  },

  get: (id: number) => http.get<Report>(`/api/reports/${id}/`),

  /** POST /api/reports/generate/ — returns 202 */
  generate: (data: {
    title: string;
    report_type: string;
    filters_applied?: Record<string, unknown>;
  }) => http.post<Report & { detail?: string }>("/api/reports/generate/", data),

  delete: (id: number) => http.delete(`/api/reports/${id}/`),
};
