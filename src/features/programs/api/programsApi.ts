import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Program } from "@/types/entities";

export const programsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Program>>(`/programs/?page=${page}`),

  get: (id: number) => http.get<Program>(`/programs/${id}/`),

  create: (data: {
    name: string;
    description?: string | null;
    schedule?: string | null;
    capacity?: number | null;
    active: boolean;
  }) => http.post<Program>("/programs/", data),

  update: (
    id: number,
    data: {
      name: string;
      description?: string | null;
      schedule?: string | null;
      capacity?: number | null;
      active: boolean;
    },
  ) => http.put<Program>(`/programs/${id}/`, data),

  delete: (id: number) => http.delete(`/programs/${id}/`),
};
