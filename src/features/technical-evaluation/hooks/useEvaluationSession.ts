import { useCallback, useEffect, useRef, useState } from "react";

import {
  technicalEvaluationApi,
  type EvaluationSession,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useRealtime, useRealtimeEvent } from "@/features/realtime";

/**
 * Tracks one technical-evaluation session until its analysis finishes:
 * realtime `tech_eval.updated` events when the socket is open, a 2 s polling
 * fallback otherwise, and a re-fetch after reconnects. `active` is true while
 * the results step is on screen. (Extracted from TechnicalEvaluationPage.)
 */
export function useEvaluationSession(active: boolean) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const { status: realtimeStatus, reconnectNonce } = useRealtime();

  // Fetch the authoritative session. The WS `tech_eval.updated` payload is
  // trimmed (no recommendations text), so on any update we load the full row.
  // `allowToast` gates the failure toast to the polling fallback path only —
  // when the socket is open, the durable `notification.created` event fires the
  // toast via the bell, so we mustn't double-toast here.
  const fetchSession = useCallback(
    async (id: number, allowToast: boolean) => {
      try {
        const s = await technicalEvaluationApi.getSession(id);
        setSession(s);
        if (s.status === "completed" || s.status === "failed") {
          setLoadingSession(false);
          if (s.status === "failed" && allowToast) {
            showToast({
              title: "Error en el análisis",
              description: s.recommendations || "No se pudo procesar la patada.",
              variant: "error",
            });
          }
        }
        return s.status;
      } catch {
        setLoadingSession(false);
        handleError(new Error("Error al obtener resultados"));
        return undefined;
      }
    },
    [showToast, handleError],
  );

  // Latest session id/status for effects that must not re-run on every fetch.
  const sessionStatusRef = useRef<EvaluationSession["status"] | undefined>(undefined);
  sessionStatusRef.current = session?.status;
  const sessionIdRef = useRef<number | null>(null);
  sessionIdRef.current = sessionId;

  // Live page sync: patch the open session from the realtime event. When the
  // socket is open this REPLACES the 2s poll. Filtered to the active session.
  useRealtimeEvent("tech_eval.updated", (env) => {
    if (sessionId == null || Number(env.id) !== sessionId) return;
    void fetchSession(sessionId, false);
  });

  // Initial load + polling fallback. While in the results step with a pending
  // session: fetch once, then keep polling every 2s ONLY while the socket is
  // not open. Stops on terminal status, on unmount, and when the socket opens.
  useEffect(() => {
    if (!active || sessionId == null) return;
    // Read through a ref: tick() handles termination internally, and re-running
    // on every fetch would loop while the socket is open.
    const status = sessionStatusRef.current;
    if (status === "completed" || status === "failed") return;

    let running = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (!running) return;
      const st = await fetchSession(sessionId, realtimeStatus !== "open");
      if (!running) return;
      const done = st === "completed" || st === "failed";
      if (!done && realtimeStatus !== "open") {
        timer = setTimeout(tick, 2000);
      }
    };
    void tick();

    return () => {
      running = false;
      if (timer) clearTimeout(timer);
    };
  }, [active, sessionId, realtimeStatus, fetchSession]);

  // Recover a session whose terminal event was missed while offline.
  useEffect(() => {
    // Only a reconnect should trigger this; id/status are read through refs.
    const id = sessionIdRef.current;
    if (reconnectNonce === 0 || id == null) return;
    const status = sessionStatusRef.current;
    if (status === "completed" || status === "failed") return;
    void fetchSession(id, false);
  }, [reconnectNonce, fetchSession]);

  /** Start tracking a freshly created session. */
  const begin = useCallback((id: number) => {
    setSessionId(id);
    setSession(null);
    setLoadingSession(true);
  }, []);

  /** Forget the current session (new evaluation / retry). */
  const clear = useCallback(() => {
    setSessionId(null);
    setSession(null);
  }, []);

  return { session, loadingSession, begin, clear };
}
