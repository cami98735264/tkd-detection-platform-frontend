import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Edition } from "@/types/entities";

export const editionsApi = {
  list: (page = 1, programId?: number, search = "") => {
    let url = `/editions/?page=${page}`;
    if (programId) url += `&program_id=${programId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return http.get<PaginatedResponse<Edition>>(url);
  },

  get: (id: number) => http.get<Edition>(`/editions/${id}/`),

  create: (data: {
    program: number;
    start_date: string;
    end_date: string | null;
    schedule: string | null;
    active: boolean;
  }) => http.post<Edition>("/editions/", data),

  update: (id: number, data: Partial<{
    program: number;
    start_date: string;
    end_date: string | null;
    schedule: string | null;
    active: boolean;
  }>) => http.put<Edition>(`/editions/${id}/`, data),

  delete: (id: number) => http.delete(`/editions/${id}/`),
};