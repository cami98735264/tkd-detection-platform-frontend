import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockWebSocket } from "../../../test-unit/mockWebSocket";
import type { RealtimeClient } from "./realtimeClient";

// Fresh singleton per test (the client is a module-level singleton). We reset
// the module registry and re-import so cross-test state never leaks.
async function freshClient(): Promise<RealtimeClient> {
  vi.resetModules();
  MockWebSocket.reset();
  const mod = await import("./realtimeClient");
  return mod.realtimeClient;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  // Deterministic backoff: jitter term → 0 ⇒ delay = expo * 0.75.
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ENVELOPE = {
  type: "notification.created",
  resource: "notification",
  id: 1,
  data: { id: 1, title: "hi" },
  ts: "2026-05-30T12:00:00Z",
};

describe("realtimeClient", () => {
  it("connects to {wsUrl}/ws/realtime/ and reaches 'open'", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.last!.url).toBe("ws://localhost:8000/ws/realtime/");
    expect(client.getStatus()).toBe("connecting");

    MockWebSocket.last!.serverOpen();
    expect(client.getStatus()).toBe("open");
  });

  it("does NOT fire onReconnect on the first open, but DOES after a real reconnect", async () => {
    const client = await freshClient();
    const onReconnect = vi.fn();
    client.onReconnect(onReconnect);

    client.setEnabled(true);
    client.connect();
    MockWebSocket.last!.serverOpen();
    expect(onReconnect).not.toHaveBeenCalled();

    // Network drop (non-4401) ⇒ reconnect scheduled with backoff.
    MockWebSocket.last!.serverClose(1006);
    expect(client.getStatus()).toBe("closed");
    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(750); // expo(1000)*0.75 with jitter 0
    expect(MockWebSocket.instances).toHaveLength(2); // reconnect attempt

    MockWebSocket.last!.serverOpen();
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("sends a ping heartbeat and reconnects when the pong times out", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect();
    const sock = MockWebSocket.last!;
    sock.serverOpen();

    vi.advanceTimersByTime(25_000); // PING_INTERVAL
    expect(sock.sent).toContain(JSON.stringify({ type: "ping" }));

    vi.advanceTimersByTime(10_000); // PONG_TIMEOUT with no traffic ⇒ force-close
    expect(client.getStatus()).toBe("closed");

    vi.advanceTimersByTime(750); // backoff reconnect
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("does NOT force-close when traffic arrives before the pong deadline", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect();
    const sock = MockWebSocket.last!;
    sock.serverOpen();

    vi.advanceTimersByTime(25_000); // ping sent, pong deadline armed
    sock.serverMessage({ type: "pong" }); // proves liveness
    vi.advanceTimersByTime(10_000);

    expect(client.getStatus()).toBe("open");
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("dispatches known events, ignores pong and unknown types", async () => {
    const client = await freshClient();
    const handler = vi.fn();
    client.subscribe("notification.created", handler);
    client.setEnabled(true);
    client.connect();
    const sock = MockWebSocket.last!;
    sock.serverOpen();

    sock.serverMessage({ type: "pong" });
    sock.serverMessage({ type: "totally.unknown", resource: "x", id: 9, data: {}, ts: "t" });
    sock.serverMessage("}{ not json");
    expect(handler).not.toHaveBeenCalled();

    sock.serverMessage(ENVELOPE);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(ENVELOPE);
  });

  it("stops retrying after a 4401 close (auth rejected)", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect();
    MockWebSocket.last!.serverOpen();

    MockWebSocket.last!.serverClose(4401);
    expect(client.getStatus()).toBe("closed");

    vi.advanceTimersByTime(60_000); // no reconnect should be scheduled
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("is StrictMode-safe: a remount cancels the deferred teardown (no socket churn)", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect(); // refCount 1
    client.connect(); // refCount 2 (StrictMode double-invoke)
    MockWebSocket.last!.serverOpen();
    expect(MockWebSocket.instances).toHaveLength(1);

    client.disconnect(); // refCount 1 — socket must stay open
    expect(MockWebSocket.last!.readyState).toBe(MockWebSocket.OPEN);

    client.disconnect(); // refCount 0 — teardown deferred a macrotask
    client.connect(); // remount cancels the pending teardown
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.last!.readyState).toBe(MockWebSocket.OPEN);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("tears down the socket when the last consumer disconnects", async () => {
    const client = await freshClient();
    client.setEnabled(true);
    client.connect();
    MockWebSocket.last!.serverOpen();

    client.disconnect(); // refCount 0
    vi.advanceTimersByTime(1); // run deferred teardown
    expect(MockWebSocket.last!.readyState).toBe(MockWebSocket.CLOSED);
    expect(client.getStatus()).toBe("closed");
  });
});
