// ---------------------------------------------------------------------------
// Realtime wire types — mirrors tkd-backend/docs/realtime-contract.md exactly.
// ---------------------------------------------------------------------------
// Server → client envelope: { type, resource, id, data, ts }.
// `data` is trimmed server-side (never a full model dump) EXCEPT for
// `notification.created`, whose `data` is a full serialized Notification.
// ---------------------------------------------------------------------------

/** Connection status surfaced to React via useRealtime(). */
export type RealtimeStatus = "connecting" | "open" | "closed";

/**
 * The event-type union from the contract.
 *
 * Two families:
 *  - `notification.created` → durable bell feed (full Notification in `data`).
 *  - `*.updated` / `*.created` → ephemeral live page syncs (trimmed `data`).
 *
 * Note: "reconnected" is NOT a wire event — it is delivered out-of-band via
 * RealtimeClient.onReconnect(), so it is intentionally absent from this union.
 */
export type RealtimeEventType =
  | "notification.created"
  | "tech_eval.updated"
  | "report.updated"
  | "evaluation.created"
  | "enrollment.updated";

/** The JSON envelope every server → client message conforms to. */
export interface RealtimeEnvelope<T = unknown> {
  type: RealtimeEventType;
  resource: string;
  id: number | string;
  data: T;
  ts: string;
}

export type RealtimeEventHandler = (env: RealtimeEnvelope) => void;
export type StatusListener = (status: RealtimeStatus) => void;
export type ReconnectListener = () => void;

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set<RealtimeEventType>([
  "notification.created",
  "tech_eval.updated",
  "report.updated",
  "evaluation.created",
  "enrollment.updated",
]);

/** Narrow an unknown parsed message to a known RealtimeEnvelope. */
export function isRealtimeEnvelope(value: unknown): value is RealtimeEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === "string" && KNOWN_EVENT_TYPES.has(t);
}
