import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Shared, hoisted test doubles (vi.mock factories are hoisted above imports).
const h = vi.hoisted(() => ({
  showToast: vi.fn(),
  init: vi.fn(),
  refresh: vi.fn(),
  reset: vi.fn(),
  pushLive: vi.fn(),
  buildToast: vi.fn(),
  rt: { reconnectNonce: 0 },
  auth: {
    user: { role: "sportsman" } as { role: string } | undefined,
    status: "ready",
    isAuthenticated: true,
  },
  handlers: new Map<string, (env: unknown) => void>(),
}));

vi.mock("@/feedback/useFeedback", () => ({
  useFeedback: () => ({ showToast: h.showToast }),
}));
vi.mock("@/features/auth/store/authStore", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel(h.auth),
}));
vi.mock("@/features/notifications/store/notificationsStore", () => ({
  useNotificationsStore: (sel: (s: unknown) => unknown) =>
    sel({ init: h.init, refresh: h.refresh, reset: h.reset, pushLive: h.pushLive }),
}));
vi.mock("@/features/realtime", () => ({
  useRealtime: () => h.rt,
  useRealtimeEvent: (type: string, handler: (env: unknown) => void) => {
    h.handlers.set(type, handler);
  },
}));
vi.mock("@/features/notifications/notificationToasts", () => ({
  buildNotificationToast: h.buildToast,
}));

import { NotificationsBootstrap } from "./NotificationsBootstrap";

const notif = {
  id: 1, type: "tech_eval.completed", title: "Listo", body: "",
  resource: "tech_eval_session", resource_id: 10, data: {},
  read_at: null, created_at: "2026-05-30T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rt.reconnectNonce = 0;
  h.auth = { user: { role: "sportsman" }, status: "ready", isAuthenticated: true };
  h.handlers.clear();
  h.buildToast.mockReturnValue({ id: "toast-1", title: "Listo" });
});

describe("NotificationsBootstrap", () => {
  it("backfills (init) on authed mount and does NOT toast", () => {
    render(<NotificationsBootstrap />);
    expect(h.init).toHaveBeenCalledTimes(1);
    expect(h.reset).not.toHaveBeenCalled();
    expect(h.showToast).not.toHaveBeenCalled(); // backfill is silent
  });

  it("resets the store on logout", () => {
    h.auth = { user: undefined, status: "ready", isAuthenticated: false };
    render(<NotificationsBootstrap />);
    expect(h.reset).toHaveBeenCalledTimes(1);
    expect(h.init).not.toHaveBeenCalled();
  });

  it("on notification.created: prepends via pushLive and fires exactly one toast", () => {
    render(<NotificationsBootstrap />);
    const handler = h.handlers.get("notification.created")!;
    expect(handler).toBeTypeOf("function");

    handler({ type: "notification.created", resource: "notification", id: 1, data: notif, ts: "t" });

    expect(h.pushLive).toHaveBeenCalledWith(notif);
    expect(h.buildToast).toHaveBeenCalledWith(notif, "sportsman");
    expect(h.showToast).toHaveBeenCalledTimes(1);
  });

  it("dedupes rapid repeats of the same notification (single toast)", () => {
    render(<NotificationsBootstrap />);
    const handler = h.handlers.get("notification.created")!;
    const env = { type: "notification.created", resource: "notification", id: 1, data: notif, ts: "t" };

    handler(env);
    handler(env); // same type:resource_id within the dedupe window

    expect(h.pushLive).toHaveBeenCalledTimes(2); // store still deduped by id internally
    expect(h.showToast).toHaveBeenCalledTimes(1); // but only one toast
  });

  it("refetches (refresh) when a reconnect occurs", () => {
    h.rt.reconnectNonce = 1;
    render(<NotificationsBootstrap />);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });
});
