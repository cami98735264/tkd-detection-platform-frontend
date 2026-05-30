// ---------------------------------------------------------------------------
// Realtime client — a SINGLE shared WebSocket for the whole app.
// ---------------------------------------------------------------------------
// Module-level singleton (closure factory, matching the functional style of
// src/lib/http.ts). Framework-agnostic — no React in here. The React layer
// (RealtimeProvider + hooks) drives it via connect/disconnect/setEnabled.
//
// Implements the CONSUMER side of tkd-backend/docs/realtime-contract.md:
//   - endpoint {wsUrl}/ws/realtime/, cookie JWT auth on the handshake
//   - {type, resource, id, data, ts} envelope dispatch
//   - {"type":"ping"} heartbeat; server replies {"type":"pong"}
//   - at-most-once delivery ⇒ emit a "reconnected" signal so subscribers refetch
//   - close code 4401 ⇒ auth rejected, stop retrying
//
// Designed to be StrictMode-safe (React 19 double-invokes effects in dev):
// connect()/disconnect() are idempotent + refcounted, teardown is deferred a
// macrotask so the synchronous unmount/remount churn never opens two sockets.
// ---------------------------------------------------------------------------

import { config } from "@/config/env";
import {
  isRealtimeEnvelope,
  type RealtimeEventHandler,
  type RealtimeEventType,
  type RealtimeStatus,
  type ReconnectListener,
  type StatusListener,
} from "./types";

export interface RealtimeClient {
  /** Idempotent + refcounted. Safe to call twice (StrictMode). */
  connect(): void;
  /** Refcounted release; tears down socket + timers when the count hits 0. */
  disconnect(): void;
  /**
   * Auth gate. `true` ⇒ allow connecting; `false` ⇒ close the socket and stop
   * reconnecting (logout). Does not affect the provider refcount.
   */
  setEnabled(enabled: boolean): void;
  /** Force a fresh connection now, resetting backoff (visibility refocus). */
  reconnectNow(): void;
  getStatus(): RealtimeStatus;
  /** Subscribe to status changes. Returns an unsubscribe fn. */
  onStatus(listener: StatusListener): () => void;
  /** Fires AFTER a successful reconnect (never on the first connect). */
  onReconnect(listener: ReconnectListener): () => void;
  /** Subscribe to a typed event. Returns an unsubscribe fn. */
  subscribe(type: RealtimeEventType, handler: RealtimeEventHandler): () => void;
}

// Tunable timing constants (not part of the contract — safe to adjust against
// the backend's actual idle-timeout once known).
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;
const PING_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const AUTH_REJECTED_CLOSE_CODE = 4401;

function createRealtimeClient(): RealtimeClient {
  let ws: WebSocket | null = null;
  let status: RealtimeStatus = "closed";

  let refCount = 0; // provider mounts (StrictMode may transiently reach 2)
  let enabled = false; // authed && ready && !mockAuth && wsUrl present
  let attempt = 0; // backoff exponent
  let hasConnectedOnce = false; // first-connect vs reconnect discrimination
  let intentionalClose = false; // distinguish disconnect()/logout from a drop
  let authRejected = false; // 4401 ⇒ stop retrying until next login

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingTeardown: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let pongDeadline: ReturnType<typeof setTimeout> | null = null;

  const statusListeners = new Set<StatusListener>();
  const reconnectListeners = new Set<ReconnectListener>();
  const eventListeners = new Map<RealtimeEventType, Set<RealtimeEventHandler>>();

  // -- small helpers --------------------------------------------------------

  function setStatus(next: RealtimeStatus) {
    if (status === next) return;
    status = next;
    for (const l of [...statusListeners]) {
      try {
        l(next);
      } catch {
        /* isolate listener errors */
      }
    }
  }

  function emitReconnect() {
    for (const l of [...reconnectListeners]) {
      try {
        l();
      } catch {
        /* isolate listener errors */
      }
    }
  }

  function eligible(): boolean {
    return enabled && !authRejected && !!config.wsUrl && !config.mockAuth;
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearPongDeadline() {
    if (pongDeadline) {
      clearTimeout(pongDeadline);
      pongDeadline = null;
    }
  }

  function stopHeartbeat() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    clearPongDeadline();
  }

  // -- heartbeat ------------------------------------------------------------

  function armPongDeadline() {
    clearPongDeadline();
    pongDeadline = setTimeout(() => {
      // No traffic within the window ⇒ socket is dead. Force-close; onclose
      // will drive the reconnect.
      const dead = ws;
      if (dead) {
        intentionalClose = false;
        try {
          dead.close();
        } catch {
          /* ignore */
        }
      }
    }, PONG_TIMEOUT_MS);
  }

  function startHeartbeat() {
    stopHeartbeat();
    pingTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        /* ignore */
      }
      armPongDeadline();
    }, PING_INTERVAL_MS);
  }

  /** Any inbound traffic (pong or a real event) proves the socket is alive. */
  function noteTraffic() {
    clearPongDeadline();
  }

  // -- message dispatch -----------------------------------------------------

  function handleMessage(sock: WebSocket, ev: MessageEvent) {
    if (ws !== sock) return; // ignore stale socket
    noteTraffic();

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return; // malformed ⇒ silent
    }
    if (typeof parsed !== "object" || parsed === null) return;
    if ((parsed as { type?: unknown }).type === "pong") return; // heartbeat ack
    if (!isRealtimeEnvelope(parsed)) return; // unknown type ⇒ silent

    const set = eventListeners.get(parsed.type);
    if (!set || set.size === 0) return;
    // snapshot to tolerate unsubscribe-during-dispatch
    for (const h of [...set]) {
      try {
        h(parsed);
      } catch {
        /* isolate handler errors — one bad subscriber can't kill the bus */
      }
    }
  }

  // -- connection lifecycle -------------------------------------------------

  function open() {
    clearReconnectTimer();
    setStatus("connecting");

    // No token in the URL — the httpOnly JWT cookie rides the handshake
    // automatically. config.wsUrl resolves to our OWN origin, and the SPA's
    // Cloudflare Worker reverse-proxies /ws/ to the backend. Keeping the
    // handshake same-origin makes the cookie first-party, so browsers that
    // block third-party cookies (Brave Shields, Safari ITP) still send it.
    let sock: WebSocket;
    try {
      sock = new WebSocket(`${config.wsUrl}/ws/realtime/`);
    } catch {
      // Construction can throw on a malformed URL — degrade quietly.
      setStatus("closed");
      scheduleReconnect();
      return;
    }
    ws = sock;

    sock.onopen = () => {
      if (ws !== sock) return; // superseded
      const wasReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      attempt = 0; // reset backoff on a successful open
      authRejected = false;
      setStatus("open");
      startHeartbeat();
      if (wasReconnect) emitReconnect(); // only AFTER a real reconnect
    };

    sock.onmessage = (ev) => handleMessage(sock, ev);

    sock.onerror = () => {
      // Swallow — no console spam. onclose follows and drives any retry.
    };

    sock.onclose = (ev) => {
      if (ws !== sock) return; // close from a superseded socket
      stopHeartbeat();
      ws = null;

      if (ev.code === AUTH_REJECTED_CLOSE_CODE) {
        authRejected = true; // stop retrying; next login re-drives via setEnabled
        setStatus("closed");
        return;
      }
      if (intentionalClose) {
        intentionalClose = false;
        setStatus("closed");
        return;
      }
      setStatus("closed");
      scheduleReconnect(); // network drop / server down
    };
  }

  function openIfEligible() {
    if (!eligible()) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    open();
  }

  function scheduleReconnect() {
    if (!eligible()) return; // don't loop when logged out / 4401
    clearReconnectTimer();
    const expo = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
    const jitter = Math.random() * expo * 0.5; // ~50% jitter band
    const delay = Math.min(BACKOFF_CAP_MS, expo * 0.75 + jitter);
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openIfEligible();
    }, delay);
  }

  /** Close the live socket without scheduling a reconnect. */
  function closeSocket() {
    clearReconnectTimer();
    stopHeartbeat();
    if (ws) {
      const sock = ws;
      ws = null;
      intentionalClose = true;
      sock.onopen = sock.onmessage = sock.onerror = sock.onclose = null;
      try {
        if (sock.readyState === WebSocket.OPEN || sock.readyState === WebSocket.CONNECTING) {
          sock.close(1000, "client close");
        }
      } catch {
        /* ignore */
      }
    }
    intentionalClose = false;
    setStatus("closed");
  }

  function teardown() {
    closeSocket();
    hasConnectedOnce = false; // a fresh post-teardown connect counts as first
    attempt = 0;
  }

  // -- public API -----------------------------------------------------------

  return {
    connect() {
      refCount += 1;
      if (pendingTeardown) {
        clearTimeout(pendingTeardown);
        pendingTeardown = null;
      }
      if (refCount === 1) openIfEligible();
    },

    disconnect() {
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) {
        // Defer one macrotask so a synchronous StrictMode remount cancels it.
        if (pendingTeardown) clearTimeout(pendingTeardown);
        pendingTeardown = setTimeout(() => {
          pendingTeardown = null;
          if (refCount === 0) teardown();
        }, 0);
      }
    },

    setEnabled(next: boolean) {
      if (enabled === next) {
        // Even when unchanged, a re-affirm of `true` should clear a prior 4401.
        if (next && authRejected) {
          authRejected = false;
          openIfEligible();
        }
        return;
      }
      enabled = next;
      if (next) {
        authRejected = false;
        if (refCount > 0) openIfEligible();
      } else {
        // Logout: stop and close, no reconnect. Keep refcount intact.
        closeSocket();
      }
    },

    reconnectNow() {
      attempt = 0;
      clearReconnectTimer();
      if (ws && ws.readyState === WebSocket.OPEN) return;
      openIfEligible();
    },

    getStatus() {
      return status;
    },

    onStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },

    onReconnect(listener) {
      reconnectListeners.add(listener);
      return () => {
        reconnectListeners.delete(listener);
      };
    },

    subscribe(type, handler) {
      let set = eventListeners.get(type);
      if (!set) {
        set = new Set();
        eventListeners.set(type, set);
      }
      set.add(handler);
      return () => {
        set?.delete(handler);
      };
    },
  };
}

export const realtimeClient: RealtimeClient = createRealtimeClient();
