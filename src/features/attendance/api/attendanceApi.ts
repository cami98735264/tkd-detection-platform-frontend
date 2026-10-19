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
  training_name?: string;
  entrenamiento_name?: string;
  entrenamiento?: string;
  fecha: string;
  hora: string | null;
  status: AttendanceStatus;
  observaciones: string;
  registered_by_name: string;
  created_at: string;
  updated_at: string;
  /** Optional explicit confirmation flags, if the backend exposes them. */
  confirmed?: boolean;
  confirmed_at?: string | null;
}

/** Roles the backend lets confirm an attendance (owner athlete / linked parent). */
export const ATTENDANCE_CONFIRM_ROLES = ["sportsman", "parent"] as const;

/**
 * Whether a record still needs the athlete's/parent's confirmation. Prefers an
 * explicit `confirmed`/`confirmed_at` field; otherwise confirming means
 * "mark as present" (backend contract), so present records are done.
 */
export function needsConfirmation(record: AttendanceRecord): boolean {
  if (typeof record.confirmed === "boolean") return !record.confirmed;
  if (record.confirmed_at !== undefined) return record.confirmed_at === null;
  return record.status !== "present";
}

export interface AttendanceBulkRecord {
  athlete_id: number;
  status: AttendanceStatus;
  observaciones?: string;
}

export interface AttendanceBulkPayload {
  program_id: number;
  records: AttendanceBulkRecord[];
}

export interface AttendanceBulkResult {
  created: number;
  errors: { athlete_id: number; error: string }[];
  fecha?: string;
  hora?: string;
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
    http.post<AttendanceBulkResult>(`/attendances/bulk/`, payload),

  /**
   * POST /attendances/{id}/confirm/ — allowed for the athlete who owns the
   * record or a linked parent; 403 for anyone else. Returns the updated record.
   */
  confirm: (id: number) => http.post<AttendanceRecord>(`/attendances/${id}/confirm/`, {}),

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
