import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Program } from "@/types/entities";

export const programsApi = {
  list: (page = 1, search = "") => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    return http.get<PaginatedResponse<Program>>(`/programs/?${params.toString()}`);
  },

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
