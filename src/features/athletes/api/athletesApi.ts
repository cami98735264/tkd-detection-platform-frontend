import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Athlete } from "@/types/entities";

export interface AthleteWritePayload {
  full_name: string;
  date_of_birth?: string | null;
  categoria_competencia?: number | null;
  belt_actual?: number | null;
  height_cm?: string | null;
  status: string;
}

export interface AthleteRegistrationPayload {
  // Athlete fields
  full_name: string;
  date_of_birth?: string | null;
  categoria_competencia?: number | null;
  belt_actual?: number | null;
  height_cm?: string | null;
  status?: string;

  // Sportsman account — exactly one of these two modes must be provided.
  sportsman_user_id?: number | null;
  sportsman_email?: string;
  sportsman_password?: string;

  // Parent (only when athlete is a minor) — same mutual-exclusivity rule.
  parent_user_id?: number | null;
  parent_email?: string;
  parent_password?: string;
  parent_full_name?: string;
  parent_relationship?: "mother" | "father" | "guardian";
}

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

  /**
   * Atomic admin-only registration: creates (or links) sportsman user, athlete,
   * and parent user + ParentAthlete link in a single transaction on the backend.
   */
  register: (data: AthleteRegistrationPayload) =>
    http.post<Athlete>("/athletes/register/", data),

  update: (id: number, data: AthleteWritePayload) =>
    http.put<Athlete>(`/athletes/${id}/`, data),

  delete: (id: number) => http.delete(`/athletes/${id}/`),
};
