import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useFeedback } from "@/feedback/useFeedback";
import { useRealtime, useRealtimeEvent } from "@/features/realtime";
import type { Notification } from "@/types/entities";
import { useNotificationsStore } from "@/features/notifications/store/notificationsStore";
import { buildNotificationToast } from "@/features/notifications/notificationToasts";

const TOAST_DEDUPE_MS = 4_000;

/**
 * Headless bootstrap for the notification feed. Mount once inside
 * RealtimeProvider + FeedbackProvider + AuthInit.
 *
 *  - Backfills the bell (unread count + first page) on authenticated load,
 *    resets on logout.
 *  - Refetches on reconnect to recover events missed while offline.
 *  - Applies live `notification.created` pushes (prepend + bump unread) and
 *    fires a single role/type-aware toast, de-duping rapid repeats.
 */
export function NotificationsBootstrap() {
  const { showToast } = useFeedback();
  const role = useAuthStore((s) => s.user?.role);
  const isAuthed = useAuthStore(
    (s) => s.status === "ready" && s.isAuthenticated,
  );

  const init = useNotificationsStore((s) => s.init);
  const refresh = useNotificationsStore((s) => s.refresh);
  const reset = useNotificationsStore((s) => s.reset);
  const pushLive = useNotificationsStore((s) => s.pushLive);

  const { reconnectNonce } = useRealtime();
  const lastToastRef = useRef<Map<string, number>>(new Map());

  // Backfill on auth (REST-backed bell); clear on logout.
  useEffect(() => {
    if (isAuthed) void init();
    else reset();
  }, [isAuthed, init, reset]);

  // Recover missed events after a reconnect (delivery is at-most-once).
  useEffect(() => {
    if (reconnectNonce > 0 && isAuthed) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectNonce]);

  // Live pushes — the durable bell delta + toast.
  useRealtimeEvent("notification.created", (env) => {
    const n = env.data as Notification;
    if (!n || typeof n.id !== "number") return;

    pushLive(n);

    const key = `${n.type}:${n.resource_id ?? n.id}`;
    const now = Date.now();
    const last = lastToastRef.current.get(key);
    if (last && now - last < TOAST_DEDUPE_MS) return;
    lastToastRef.current.set(key, now);

    const toast = role ? buildNotificationToast(n, role) : null;
    if (toast) showToast(toast);
  });

  return null;
}
