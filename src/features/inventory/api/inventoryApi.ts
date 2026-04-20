import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  description: string;
  created_at: string;
}

export interface CreateInventoryData {
  name: string;
  quantity: number;
  description: string;
}

export const inventoryApi = {
  list: (page = 1, search = "") =>
    http.get<PaginatedResponse<InventoryItem>>(`/inventory/?page=${page}&search=${encodeURIComponent(search)}`),

  get: (id: number) => http.get<InventoryItem>(`/inventory/${id}/`),

  create: (data: CreateInventoryData) => http.post<InventoryItem>("/inventory/", data),

  update: (id: number, data: CreateInventoryData) => http.put<InventoryItem>(`/inventory/${id}/`, data),

  delete: (id: number) => http.delete(`/inventory/${id}/`),
};
