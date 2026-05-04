import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

// User type - mirrors backend UserSerializer
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_staff: boolean;
  role: "sportsman" | "parent" | "administrator";
  is_active: boolean;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password?: string;
  full_name: string;
  is_staff?: boolean;
  role: string;
  is_active?: boolean;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  is_staff?: boolean;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export interface ListUsersParams {
  page?: number;
  search?: string;
  role?: "sportsman" | "parent" | "administrator";
  /** Exclude sportsman users that already own an Athlete record. */
  withoutAthlete?: boolean;
}

export const usersApi = {
  list: (params: ListUsersParams = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.withoutAthlete) qs.set("without_athlete", "true");
    return http.get<PaginatedResponse<User>>(`/users/?${qs.toString()}`);
  },

  get: (id: number) => http.get<User>(`/users/${id}/`),

  create: (data: CreateUserData) => http.post<User>("/users/", data),

  update: (id: number, data: UpdateUserData) => http.put<User>(`/users/${id}/`, data),

  partialUpdate: (id: number, data: UpdateUserData) => http.patch<User>(`/users/${id}/`, data),

  delete: (id: number) => http.delete(`/users/${id}/`),
};
