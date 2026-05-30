import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/types/entities";

vi.mock("@/features/notifications/api/notificationsApi", () => ({
  notificationsApi: {
    unreadCount: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

import { notificationsApi } from "@/features/notifications/api/notificationsApi";
import { useNotificationsStore } from "./notificationsStore";

const api = notificationsApi as unknown as {
  unreadCount: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  markRead: ReturnType<typeof vi.fn>;
  markAllRead: ReturnType<typeof vi.fn>;
};

function mk(id: number, read = false): Notification {
  return {
    id,
    type: "tech_eval.completed",
    title: `n${id}`,
    body: "",
    resource: "tech_eval_session",
    resource_id: id,
    data: {},
    read_at: read ? "2026-05-30T00:00:00Z" : null,
    created_at: "2026-05-30T00:00:00Z",
  };
}

const store = useNotificationsStore;

beforeEach(() => {
  store.getState().reset();
  vi.clearAllMocks();
});

describe("notificationsStore", () => {
  it("pushLive prepends, bumps unread, and dedupes by id", () => {
    store.setState({ notifications: [mk(2)], unreadCount: 1, loaded: true });

    store.getState().pushLive(mk(5));
    expect(store.getState().notifications.map((n) => n.id)).toEqual([5, 2]);
    expect(store.getState().unreadCount).toBe(2);

    store.getState().pushLive(mk(5)); // duplicate id ⇒ no-op
    expect(store.getState().notifications.map((n) => n.id)).toEqual([5, 2]);
    expect(store.getState().unreadCount).toBe(2);
  });

  it("pushLive does not bump unread for an already-read notification", () => {
    store.setState({ notifications: [], unreadCount: 0 });
    store.getState().pushLive(mk(9, true));
    expect(store.getState().unreadCount).toBe(0);
  });

  it("init backfills unread_count + first page and marks loaded", async () => {
    api.unreadCount.mockResolvedValue({ count: 3 });
    api.list.mockResolvedValue({ count: 1, next: null, previous: null, results: [mk(1)] });

    await store.getState().init();

    expect(api.unreadCount).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledWith({ page: 1 });
    expect(store.getState().unreadCount).toBe(3);
    expect(store.getState().notifications.map((n) => n.id)).toEqual([1]);
    expect(store.getState().loaded).toBe(true);
    expect(store.getState().hasMore).toBe(false);
  });

  it("refresh re-fetches unread_count + first page (reconnect recovery)", async () => {
    store.setState({ notifications: [mk(99)], unreadCount: 0, page: 4 });
    api.unreadCount.mockResolvedValue({ count: 7 });
    api.list.mockResolvedValue({
      count: 1, next: "http://x/?page=2", previous: null, results: [mk(42)],
    });

    await store.getState().refresh();

    expect(store.getState().unreadCount).toBe(7);
    expect(store.getState().notifications.map((n) => n.id)).toEqual([42]);
    expect(store.getState().hasMore).toBe(true);
    expect(store.getState().page).toBe(1);
  });

  it("markRead optimistically clears unread then persists", async () => {
    store.setState({ notifications: [mk(1)], unreadCount: 1 });
    api.markRead.mockResolvedValue(undefined);

    await store.getState().markRead(1);

    expect(store.getState().notifications[0].read_at).not.toBeNull();
    expect(store.getState().unreadCount).toBe(0);
    expect(api.markRead).toHaveBeenCalledWith(1);
  });

  it("markRead reverts on API failure", async () => {
    store.setState({ notifications: [mk(1)], unreadCount: 1 });
    api.markRead.mockRejectedValue(new Error("boom"));

    await store.getState().markRead(1);

    expect(store.getState().notifications[0].read_at).toBeNull();
    expect(store.getState().unreadCount).toBe(1);
  });
});
