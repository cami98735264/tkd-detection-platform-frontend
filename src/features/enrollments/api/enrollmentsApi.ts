import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Enrollment } from "@/types/entities";

export const enrollmentsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Enrollment>>(`/enrollments/?page=${page}`),

  get: (id: number) => http.get<Enrollment>(`/enrollments/${id}/`),

  create: (data: {
    athlete: number;
    program: number;
    start_date: string;
    end_date?: string | null;
    status?: string;
    notes?: string | null;
  }) => http.post<Enrollment>("/enrollments/", data),

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
  ) => http.put<Enrollment>(`/enrollments/${id}/`, data),

  delete: (id: number) => http.delete(`/enrollments/${id}/`),
};
