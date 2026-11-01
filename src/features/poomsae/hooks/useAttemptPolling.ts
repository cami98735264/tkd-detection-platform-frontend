import { useEffect, useState } from "react";

import { poomsaeApi } from "../api/poomsaeApi";
import type { PoomsaeAttempt } from "../types";

const INTERVAL_MS = 2000;
const MAX_POLLS = 150; // ~5 minutes

export interface PollingOptions {
  intervalMs?: number;
  maxPolls?: number;
}

/** Full run-throughs: the server allows up to 600 s of analysis (+ queue). */
export const FULL_POLLING: PollingOptions = { intervalMs: 5000, maxPolls: 180 }; // ~15 min

/** Poll GET /poomsae/attempts/{id}/ until the analysis completes or fails. */
export function useAttemptPolling(attemptId: number | null, options: PollingOptions = {}) {
  const intervalMs = options.intervalMs ?? INTERVAL_MS;
  const maxPolls = options.maxPolls ?? MAX_POLLS;
  const [attempt, setAttempt] = useState<PoomsaeAttempt | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setAttempt(null);
    setTimedOut(false);
    if (attemptId == null) return;
    let alive = true;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      polls += 1;
      try {
        const a = await poomsaeApi.getAttempt(attemptId);
        if (!alive) return;
        setAttempt(a);
        if (a?.status === "completed" || a?.status === "failed") return;
      } catch {
        // Transient errors: keep polling until the cap.
      }
      if (!alive) return;
      if (polls >= maxPolls) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(() => void tick(), INTERVAL_MS);
    };
    void tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId, intervalMs, maxPolls]);

  const done = attempt?.status === "completed" || attempt?.status === "failed";
  return { attempt, done, timedOut };
}
