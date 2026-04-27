import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: number;
  athlete_id: number;
  athlete_name: string;
  edition_id: number;
  edition_name: string;
  program_name: string;
  fecha: string;
  hora: string | null;
  status: AttendanceStatus;
  observaciones: string;
  registered_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceBulkRecord {
  athlete_id: number;
  status: AttendanceStatus;
  observaciones?: string;
}

export interface AttendanceBulkPayload {
  edition_id: number;
  fecha: string;
  hora?: string;
  records: AttendanceBulkRecord[];
}

export const attendanceApi = {
  list: (params: {
    edition_id?: number;
    athlete_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.edition_id) query.set("edition_id", String(params.edition_id));
    if (params.athlete_id) query.set("athlete_id", String(params.athlete_id));
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.page) query.set("page", String(params.page));
    return http.get<PaginatedResponse<AttendanceRecord>>(`/attendances/?${query}`);
  },

  bulkCreate: (payload: AttendanceBulkPayload) =>
    http.post<{ created: number; errors: { athlete_id: number; error: string }[] }>(
      `/attendances/bulk/`,
      payload
    ),

  confirm: (id: number) =>
    http.post<AttendanceRecord>(`/attendances/${id}/confirm/`, {}),

  summary: (params: { athlete_id?: number; edition_id?: number }) => {
    const query = new URLSearchParams();
    if (params.athlete_id) query.set("athlete_id", String(params.athlete_id));
    if (params.edition_id) query.set("edition_id", String(params.edition_id));
    return http.get<{
      total_sessions: number;
      present_sessions: number;
      late_sessions: number;
      absent_sessions: number;
      attendance_rate: number;
    }>(`/attendances/summary/?${query}`);
  },
};