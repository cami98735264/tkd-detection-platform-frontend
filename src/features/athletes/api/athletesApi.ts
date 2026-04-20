import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Athlete } from "@/types/entities";

export const athletesApi = {
  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<Athlete>>(`/athletes/?page=${page}&search=${encodeURIComponent(search)}`),

  get: (id: number) => http.get<Athlete>(`/athletes/${id}/`),

  create: (data: {
    user?: number | null;
    full_name: string;
    date_of_birth?: string | null;
    category?: string | null;
    status: string;
  }) => http.post<Athlete>("/athletes/", data),

  update: (
    id: number,
    data: {
      user?: number | null;
      full_name: string;
      date_of_birth?: string | null;
      category?: string | null;
      status: string;
    },
  ) => http.put<Athlete>(`/athletes/${id}/`, data),

  delete: (id: number) => http.delete(`/athletes/${id}/`),
};
