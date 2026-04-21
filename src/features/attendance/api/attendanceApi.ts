import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface AttendanceRecord {
  id: number;
  athlete_id: number;
  athlete_name: string;
  training_id: number;
  training_name: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "absent";
  confirmed_at: string | null;
}

export const attendanceApi = {
  list: (params: {
    athlete_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.athlete_id) query.set("athlete_id", String(params.athlete_id));
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.page) query.set("page", String(params.page));
    return http.get<PaginatedResponse<AttendanceRecord>>(`/attendances/?${query}`);
  },

  confirm: (id: number) =>
    http.post<AttendanceRecord>(`/attendances/${id}/confirm/`, {}),
};