import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

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

export const parentAthletesApi = {
  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<ParentAthlete>>(
      `/parent-athletes/?page=${page}&search=${encodeURIComponent(search)}`
    ),

  get: (id: number) =>
    http.get<ParentAthlete>(`/parent-athletes/${id}/`),

  create: (data: CreateParentAthlete) =>
    http.post<ParentAthlete>("/parent-athletes/", data),

  delete: (id: number) =>
    http.delete(`/parent-athletes/${id}/`),
};