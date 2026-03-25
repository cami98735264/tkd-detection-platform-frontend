import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Enrollment } from "@/types/entities";

export const enrollmentsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Enrollment>>(`/api/enrollments/?page=${page}`),

  get: (id: number) => http.get<Enrollment>(`/api/enrollments/${id}/`),

  create: (data: {
    athlete: number;
    program: number;
    start_date: string;
    end_date?: string | null;
    status?: string;
    notes?: string | null;
  }) => http.post<Enrollment>("/api/enrollments/", data),

  update: (
    id: number,
    data: {
      athlete: number;
      program: number;
      start_date: string;
      end_date?: string | null;
      status?: string;
      notes?: string | null;
    },
  ) => http.put<Enrollment>(`/api/enrollments/${id}/`, data),

  delete: (id: number) => http.delete(`/api/enrollments/${id}/`),
};
