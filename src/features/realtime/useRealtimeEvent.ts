import { useEffect, useRef } from "react";
import { realtimeClient } from "./realtimeClient";
import type { RealtimeEnvelope, RealtimeEventType } from "./types";

/**
 * Subscribe to a single realtime event type for the lifetime of the component.
 *
 * The handler is held in a ref and invoked through a stable wrapper, so passing
 * a fresh inline closure each render never re-subscribes — the subscription
 * only churns when `type` changes (or on unmount). Handlers always see the
 * latest props/state via closure.
 */
export function useRealtimeEvent(
  type: RealtimeEventType,
  handler: (env: RealtimeEnvelope) => void,
) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const stable = (env: RealtimeEnvelope) => handlerRef.current(env);
    return realtimeClient.subscribe(type, stable);
  }, [type]);
}
