import { http } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Notification } from "@/types/entities";

/**
 * REST client for the durable notification feed (the bell).
 *
 * Per the realtime contract, all endpoints are scoped server-side to
 * `request.user` as recipient. The bell is REST-backed (source of truth so it
 * survives reloads); the WS `notification.created` event is just the live delta.
 */
export const notificationsApi = {
  /** GET /notifications/ — newest first, paginated; `unread` filters to unread. */
  list: (opts: { page?: number; unread?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.unread) params.set("unread", "true");
    const qs = params.toString();
    return http.get<PaginatedResponse<Notification>>(
      `/notifications/${qs ? `?${qs}` : ""}`,
    );
  },

  /** GET /notifications/unread_count/ → { count: N }. */
  unreadCount: () =>
    http.get<{ count: number }>("/notifications/unread_count/"),

  /** POST /notifications/{id}/read/ — mark one read (sets read_at). */
  markRead: (id: number) =>
    http.post<unknown>(`/notifications/${id}/read/`),

  /** POST /notifications/mark_all_read/ — mark all of the user's unread as read. */
  markAllRead: () => http.post<unknown>("/notifications/mark_all_read/"),
};
