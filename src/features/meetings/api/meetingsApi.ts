import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface Meeting {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  created_at: string;
}

export interface CreateMeetingData {
  title: string;
  description: string;
  date: string;
  time: string;
}

export const meetingsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Meeting>>(`/meetings/?page=${page}`),

  get: (id: number) => http.get<Meeting>(`/meetings/${id}/`),

  create: (data: CreateMeetingData) => http.post<Meeting>("/meetings/", data),

  update: (id: number, data: CreateMeetingData) => http.put<Meeting>(`/meetings/${id}/`, data),

  delete: (id: number) => http.delete(`/meetings/${id}/`),
};
