import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface Training {
  id: number;
  program: number;
  program_name: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  time: string;
  numero_atletas: number;
  created_at: string;
}

export interface CreateTrainingData {
  program: number;
  nombre: string;
  descripcion: string;
  fecha: string;
  time: string;
  numero_atletas: number;
}

export const trainingsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Training>>(`/routines/?page=${page}`),

  get: (id: number) => http.get<Training>(`/routines/${id}/`),

  create: (data: CreateTrainingData) => http.post<Training>("/routines/", data),

  update: (id: number, data: CreateTrainingData) => http.put<Training>(`/routines/${id}/`, data),

  delete: (id: number) => http.delete(`/routines/${id}/`),
};
