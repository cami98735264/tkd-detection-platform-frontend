import { http } from "@/lib/http";
import { ApiError } from "@/types/api";

export interface DashboardStats {
  total_deportistas: number;
  total_programas: number;
  total_inscripciones: number;
  asistencia_mes: number;
  total_evaluaciones: number;
  total_usuarios: number;
}

export interface BeltDistribution {
  belt: string;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface TrendMonth {
  month: string;
  count: number;
}

export interface AttendanceByStatus {
  status: string;
  count: number;
}

export interface DashboardCharts {
  belt_distribution: BeltDistribution[];
  category_distribution: CategoryDistribution[];
  enrollment_trend: TrendMonth[];
  attendance_trend: TrendMonth[];
  attendance_by_status: AttendanceByStatus[];
  evaluation_trend: TrendMonth[];
}

/**
 * Data for the dashboard PDF. The backend endpoint is named export/pdf/ but
 * returns JSON; the PDF itself is rendered in the browser (DashboardCharts).
 */
export interface DashboardExportSummary {
  generated_at: string;
  period: {
    month: string;
    year: number;
  };
  summary: DashboardStats;
  distributions: {
    cinturones: { nombre: string; cantidad: number }[];
    categorias: { nombre: string; cantidad: number }[];
  };
  asistencia_detalle: { estado: string; cantidad: number }[];
}

export const dashboardApi = {
  stats: () => http.get<DashboardStats>("/dashboard/stats/"),
  charts: () => http.get<DashboardCharts>("/dashboard/charts/"),
  /**
   * JSON summary used to build the PDF client-side (not a PDF file).
   * `dashboard/export/` is the current endpoint; `dashboard/export/pdf/` is the
   * deprecated alias, used only if the backend doesn't have the new one yet.
   */
  exportSummary: () =>
    http.get<DashboardExportSummary>("/dashboard/export/").catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) {
        return http.get<DashboardExportSummary>("/dashboard/export/pdf/");
      }
      throw err;
    }),
};
