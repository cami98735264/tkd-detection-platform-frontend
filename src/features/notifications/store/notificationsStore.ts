import { create } from "zustand";
import type { Notification } from "@/types/entities";
import { notificationsApi } from "@/features/notifications/api/notificationsApi";

// ---------------------------------------------------------------------------
// Notifications store — the durable bell feed.
// ---------------------------------------------------------------------------
// REST is the source of truth (survives reloads). The WS `notification.created`
// event is the live delta, applied via pushLive(). Toasts are NOT fired here —
// they're role/type-aware and live in the React bootstrap so the initial REST
// backfill never toasts (only genuine live pushes do).
// ---------------------------------------------------------------------------

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  /** True while the first page / unread count is being fetched. */
  loading: boolean;
  /** True once the first backfill has completed at least once. */
  loaded: boolean;
  /** True while loadMore() is in flight. */
  loadingMore: boolean;
  /** Whether the server reported a next page. */
  hasMore: boolean;
  page: number;

  /** Authenticated app load: fetch unread_count + first page. */
  init: () => Promise<void>;
  /** Re-fetch unread_count + first page to recover missed events (reconnect). */
  refresh: () => Promise<void>;
  /** Append the next page (panel "load more"). */
  loadMore: () => Promise<void>;
  /** Apply a live WS push: prepend (deduped by id) + bump unread. */
  pushLive: (n: Notification) => void;
  /** Optimistically mark one read + POST; revert on failure. */
  markRead: (id: number) => Promise<void>;
  /** Optimistically mark all read + POST; revert on failure. */
  markAllRead: () => Promise<void>;
  /** Clear everything (logout). */
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loaded: false,
  loadingMore: false,
  hasMore: false,
  page: 1,

  init: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsApi.unreadCount(),
        notificationsApi.list({ page: 1 }),
      ]);
      set({
        unreadCount: countRes.count ?? 0,
        // Coalesce to [] — never let an unexpected response shape (e.g. an HTML
        // error page from a misconfigured proxy) leave notifications undefined
        // and crash the bell on `.length`/`.map`.
        notifications: listRes.results ?? [],
        hasMore: Boolean(listRes.next),
        page: 1,
        loaded: true,
      });
    } catch {
      // Backend down / unreachable: stay quiet (no console spam, no crash).
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsApi.unreadCount(),
        notificationsApi.list({ page: 1 }),
      ]);
      set({
        unreadCount: countRes.count ?? 0,
        notifications: listRes.results ?? [],
        hasMore: Boolean(listRes.next),
        page: 1,
        loaded: true,
      });
    } catch {
      /* quiet */
    }
  },

  loadMore: async () => {
    const { hasMore, loadingMore, page, notifications } = get();
    if (!hasMore || loadingMore) return;
    set({ loadingMore: true });
    try {
      const next = page + 1;
      const res = await notificationsApi.list({ page: next });
      // De-dupe in case a live push already prepended one of these rows.
      const seen = new Set(notifications.map((n) => n.id));
      const fresh = (res.results ?? []).filter((n) => !seen.has(n.id));
      set({
        notifications: [...notifications, ...fresh],
        hasMore: Boolean(res.next),
        page: next,
      });
    } catch {
      /* quiet */
    } finally {
      set({ loadingMore: false });
    }
  },

  pushLive: (n) => {
    const { notifications, unreadCount } = get();
    if (notifications.some((x) => x.id === n.id)) return; // already have it
    set({
      notifications: [n, ...notifications],
      unreadCount: n.read_at ? unreadCount : unreadCount + 1,
    });
  },

  markRead: async (id) => {
    const prev = get().notifications;
    const target = prev.find((n) => n.id === id);
    if (!target || target.read_at) return; // already read / unknown
    const nowIso = new Date().toISOString();
    set({
      notifications: prev.map((n) =>
        n.id === id ? { ...n, read_at: nowIso } : n,
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await notificationsApi.markRead(id);
    } catch {
      // Revert on failure.
      set({
        notifications: prev,
        unreadCount: get().unreadCount + 1,
      });
    }
  },

  markAllRead: async () => {
    const prev = get().notifications;
    const prevUnread = get().unreadCount;
    if (prevUnread === 0) return;
    const nowIso = new Date().toISOString();
    set({
      notifications: prev.map((n) =>
        n.read_at ? n : { ...n, read_at: nowIso },
      ),
      unreadCount: 0,
    });
    try {
      await notificationsApi.markAllRead();
    } catch {
      set({ notifications: prev, unreadCount: prevUnread });
    }
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      loaded: false,
      loadingMore: false,
      hasMore: false,
      page: 1,
    }),
}));
