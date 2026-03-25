import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Athlete } from "@/types/entities";

export const athletesApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Athlete>>(`/api/athletes/?page=${page}`),

  get: (id: number) => http.get<Athlete>(`/api/athletes/${id}/`),

  create: (data: {
    user?: number | null;
    full_name: string;
    date_of_birth?: string | null;
    category?: string | null;
    status: string;
  }) => http.post<Athlete>("/api/athletes/", data),

  update: (
    id: number,
    data: {
      user?: number | null;
      full_name: string;
      date_of_birth?: string | null;
      category?: string | null;
      status: string;
    },
  ) => http.put<Athlete>(`/api/athletes/${id}/`, data),

  delete: (id: number) => http.delete(`/api/athletes/${id}/`),
};
