import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Athlete } from "@/types/entities";

/** A child linked to the signed-in parent (GET /parent/children/). */
export interface ParentChild {
  id: number;
  athlete_id: number;
  athlete: Athlete;
  relationship: string;
}

export interface ParentAthlete {
  id: number;
  parent: number;
  parent_email: string;
  parent_full_name: string;
  athlete: number;
  athlete_full_name: string;
  athlete_belt: string | null;
  athlete_status: string;
  relationship: "mother" | "father" | "guardian";
  created_at: string;
}

export interface CreateParentAthlete {
  parent_id: number;
  athlete_id: number;
  relationship: "mother" | "father" | "guardian";
}

export interface RegisterParentAthletePayload {
  athlete: number;
  parent_relationship: "mother" | "father" | "guardian";
  parent_user_id?: number | null;
  parent_email?: string;
  parent_password?: string;
  parent_full_name?: string;
}

export const parentAthletesApi = {
  /** Children of the signed-in parent. */
  getChildren: () => http.get<ParentChild[]>("/parent/children/"),

  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<ParentAthlete>>(
      `/parent-athletes/?page=${page}&search=${encodeURIComponent(search)}`,
    ),

  get: (id: number) => http.get<ParentAthlete>(`/parent-athletes/${id}/`),

  create: (data: CreateParentAthlete) => http.post<ParentAthlete>("/parent-athletes/", data),

  /**
   * Atomic admin-only endpoint: creates (or links) a parent User and the
   * ParentAthlete relationship in a single transaction.
   */
  register: (data: RegisterParentAthletePayload) =>
    http.post<ParentAthlete>("/parent-athletes/register/", data),

  delete: (id: number) => http.delete(`/parent-athletes/${id}/`),
};
