import { downloadFile } from "@/lib/download";
import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Report, ReportStatus } from "@/types/entities";

export interface GenerateReportPayload {
  title: string;
  report_type: Report["report_type"] | string;
  filters_applied?: Record<string, unknown>;
}

/** Statuses after which a report no longer changes (stop polling). */
export const TERMINAL_REPORT_STATUSES: readonly ReportStatus[] = ["completed", "failed"];

export function isReportInProgress(report: Pick<Report, "status">): boolean {
  return !TERMINAL_REPORT_STATUSES.includes(report.status);
}

/** Relative (to the API base) download endpoint, used when the payload has no download_url. */
export function reportDownloadPath(id: number): string {
  return `reports/${id}/download/`;
}

export const reportsApi = {
  list: (page = 1, status?: ReportStatus) => {
    let url = `/reports/?page=${page}`;
    if (status) url += `&status=${status}`;
    return http.get<PaginatedResponse<Report>>(url);
  },

  get: (id: number) => http.get<Report>(`/reports/${id}/`),

  /** POST /reports/generate/ — 202 Accepted with the pending report. */
  generate: (data: GenerateReportPayload) =>
    http.post<Report & { detail?: string }>("/reports/generate/", data),

  delete: (id: number) => http.delete(`/reports/${id}/`),

  /**
   * Download the generated CSV through the authenticated endpoint (cookies
   * sent by axios; never a public /media link).
   */
  download: (report: Pick<Report, "id" | "title" | "download_url">) =>
    downloadFile(
      report.download_url || reportDownloadPath(report.id),
      `${report.title.trim().replace(/[^\w.-]+/g, "_") || `reporte-${report.id}`}.csv`,
    ),
};
