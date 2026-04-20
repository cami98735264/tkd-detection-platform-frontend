import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface UserActivity {
  id: number;
  user_email: string;
  user_name: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: number | null;
  created_at: string;
}

export const userActivityApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<UserActivity>>(`/users/actions/?page=${page}`),
};