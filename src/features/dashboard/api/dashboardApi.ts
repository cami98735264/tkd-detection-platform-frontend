import { http } from "@/lib/http";

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

export interface DashboardExportPdf {
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
  exportPdf: () => http.get<DashboardExportPdf>("/dashboard/export/pdf/"),
};
