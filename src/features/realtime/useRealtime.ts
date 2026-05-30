import { useEffect, useState, useSyncExternalStore } from "react";
import { realtimeClient } from "./realtimeClient";
import type { RealtimeStatus } from "./types";

/**
 * Subscribe to the shared realtime connection.
 *
 * - `status`: live connection status ("connecting" | "open" | "closed").
 * - `reconnectNonce`: starts at 0 and increments on every *reconnect* (never on
 *   the first connect). Depend on it in an effect to refetch resources missed
 *   while the socket was down (delivery is at-most-once):
 *
 *     const { reconnectNonce } = useRealtime();
 *     useEffect(() => { if (reconnectNonce > 0) refetch(); }, [reconnectNonce]);
 */
export function useRealtime() {
  const status = useSyncExternalStore<RealtimeStatus>(
    realtimeClient.onStatus,
    realtimeClient.getStatus,
    () => "closed", // server snapshot (Cloudflare Worker SSR)
  );

  const [reconnectNonce, setReconnectNonce] = useState(0);
  useEffect(
    () => realtimeClient.onReconnect(() => setReconnectNonce((n) => n + 1)),
    [],
  );

  return { status, reconnectNonce };
}
