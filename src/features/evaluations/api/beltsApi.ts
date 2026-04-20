import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface Belt {
  id: number;
  nombre: string;
  grado: number;
  created_at: string;
}

export const beltsApi = {
  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<Belt>>(`/belts/?page=${page}&search=${encodeURIComponent(search)}`),
};