import { http } from "@/lib/http";
import type { Profile } from "@/types/entities";

export const profileApi = {
  /** GET /api/profile/ */
  get: () => http.get<Profile>("/api/profile/"),

  /** PUT /api/profile/ — all required fields must be sent */
  update: (data: Omit<Profile, "user_id" | "updated_at">) =>
    http.put<Profile>("/api/profile/", data),
};
