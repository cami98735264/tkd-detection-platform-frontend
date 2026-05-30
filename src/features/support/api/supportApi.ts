import { http } from "@/lib/http";
import type { ApiEnvelope } from "@/types/api";
import { config } from "@/config/env";

/**
 * Support / contact request (contract §4 "Support / contact").
 *
 * - `email` is required only when unauthenticated; when authenticated the
 *   backend uses the session email and the field is omitted.
 * - `honeypot` must be empty; a non-empty value silently 200s with no send
 *   (anti-spam, contract §4). The frontend renders a hidden field and treats
 *   the response as a normal success regardless.
 */
export interface SupportRequestPayload {
  subject: string;
  message: string;
  email?: string;
  honeypot?: string;
}

export const supportApi = {
  submitSupportRequest: async (payload: SupportRequestPayload): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/support/contact/", payload);
  },
};
