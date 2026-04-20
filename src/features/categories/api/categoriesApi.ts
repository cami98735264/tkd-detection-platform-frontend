import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { CompetitionCategory } from "@/types/entities";

export const categoriesApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<CompetitionCategory>>(`/competition-categories/?page=${page}`),

  get: (id: number) => http.get<CompetitionCategory>(`/competition-categories/${id}/`),

  create: (data: {
    nombre: string;
    edad_min: number;
    edad_max: number;
    belt_from: number;
    belt_to: number;
    peso_min: number;
    peso_max: number;
  }) => http.post<CompetitionCategory>("/competition-categories/", data),

  update: (id: number, data: {
    nombre: string;
    edad_min: number;
    edad_max: number;
    belt_from: number;
    belt_to: number;
    peso_min: number;
    peso_max: number;
  }) => http.put<CompetitionCategory>(`/competition-categories/${id}/`, data),

  delete: (id: number) => http.delete(`/competition-categories/${id}/`),
};
