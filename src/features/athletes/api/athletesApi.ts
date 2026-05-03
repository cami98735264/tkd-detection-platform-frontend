import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Athlete } from "@/types/entities";

export const athletesApi = {
  list: (page = 1, search = "", status = "", notEnrolled = false, pageSize?: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (notEnrolled) params.set("not_enrolled", "true");
    if (pageSize) params.set("page_size", String(pageSize));
    return http.get<PaginatedResponse<Athlete>>(`/athletes/?${params.toString()}`);
  },

  get: (id: number) => http.get<Athlete>(`/athletes/${id}/`),

  /** GET /api/athlete/me/ - Returns the athlete record for the current sportsman user */
  getMe: () => http.get<Athlete>("/athlete/me/"),

  create: (data: {
    user?: number | null;
    full_name: string;
    date_of_birth?: string | null;
    categoria_competencia?: number | null;
    status: string;
  }) => http.post<Athlete>("/athletes/", data),

  update: (
    id: number,
    data: {
      user?: number | null;
      full_name: string;
      date_of_birth?: string | null;
      categoria_competencia?: number | null;
      status: string;
    },
  ) => http.put<Athlete>(`/athletes/${id}/`, data),

  delete: (id: number) => http.delete(`/athletes/${id}/`),
};
