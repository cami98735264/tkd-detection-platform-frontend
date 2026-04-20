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
}

export const usersApi = {
  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<User>>(`/users/?page=${page}&search=${encodeURIComponent(search)}`),

  get: (id: number) => http.get<User>(`/users/${id}/`),

  create: (data: CreateUserData) => http.post<User>("/users/", data),

  update: (id: number, data: UpdateUserData) => http.put<User>(`/users/${id}/`, data),

  partialUpdate: (id: number, data: UpdateUserData) => http.patch<User>(`/users/${id}/`, data),

  delete: (id: number) => http.delete(`/users/${id}/`),
};
