import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface ItemType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateItemTypeData {
  name: string;
}

export const itemTypesApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<ItemType>>(`/item-types/?page=${page}`),

  get: (id: number) => http.get<ItemType>(`/item-types/${id}/`),

  create: (data: CreateItemTypeData) => http.post<ItemType>("/item-types/", data),

  update: (id: number, data: CreateItemTypeData) => http.put<ItemType>(`/item-types/${id}/`, data),

  delete: (id: number) => http.delete(`/item-types/${id}/`),
};