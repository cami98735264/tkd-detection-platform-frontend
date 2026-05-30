import { Bell, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useNotificationsStore } from "@/features/notifications/store/notificationsStore";
import {
  relativeTimeEs,
  resolveNotificationLink,
} from "@/features/notifications/notificationLinks";
import type { Notification } from "@/types/entities";

/**
 * Header notification center. REST-backed (survives reloads) with live deltas
 * applied by NotificationsBootstrap. Reuses the DropdownMenu primitives for
 * aria/keyboard/focus-trap.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const loading = useNotificationsStore((s) => s.loading);
  const loaded = useNotificationsStore((s) => s.loaded);
  const hasMore = useNotificationsStore((s) => s.hasMore);
  const loadingMore = useNotificationsStore((s) => s.loadingMore);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const loadMore = useNotificationsStore((s) => s.loadMore);

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);
  const showInitialLoading = loading && !loaded;
  const isEmpty = loaded && notifications.length === 0;

  const handleSelect = (n: Notification) => {
    void markRead(n.id);
    const to = resolveNotificationLink(n.resource, role);
    if (to) navigate(to);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : "Notificaciones"
          }
          className="relative grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-error px-1 text-[0.625rem] font-semibold leading-none text-white"
            >
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <p className="text-sm font-semibold text-text">Notificaciones</p>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="h-3.5 w-3.5" />
            Marcar todas
          </button>
        </div>

        <div className="max-h-[22rem] overflow-y-auto border-t border-divider">
          {showInitialLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-1 px-3 py-10 text-center">
              <Bell className="h-7 w-7 text-faint" />
              <p className="text-sm font-medium text-text">Sin notificaciones</p>
              <p className="text-xs text-muted">
                Aquí verás avisos sobre tus evaluaciones y reportes.
              </p>
            </div>
          ) : (
            <>
              {notifications.map((n) => {
                const unread = !n.read_at;
                return (
                  <DropdownMenuItem
                    key={n.id}
                    onSelect={() => handleSelect(n)}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-0.5 rounded-none px-3 py-2.5 focus:bg-surface-2",
                      unread && "bg-primary/5",
                    )}
                  >
                    <div className="flex w-full items-start gap-2">
                      {unread && (
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                      <div className={cn("min-w-0 flex-1", !unread && "pl-4")}>
                        <p
                          className={cn(
                            "truncate text-sm text-text",
                            unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="line-clamp-2 text-xs text-muted">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[0.6875rem] text-faint">
                          {relativeTimeEs(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="flex w-full items-center justify-center gap-2 border-t border-divider px-3 py-2.5 text-xs font-medium text-primary hover:bg-surface-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Ver más
                </button>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
