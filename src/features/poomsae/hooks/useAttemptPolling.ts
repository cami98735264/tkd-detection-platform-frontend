import { useEffect, useState } from "react";

import { poomsaeApi } from "../api/poomsaeApi";
import type { PoomsaeAttempt } from "../types";

const INTERVAL_MS = 2000;
const MAX_POLLS = 150; // ~5 minutes

/** Poll GET /poomsae/attempts/{id}/ until the analysis completes or fails. */
export function useAttemptPolling(attemptId: number | null) {
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
      if (polls >= MAX_POLLS) {
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
  }, [attemptId]);

  const done = attempt?.status === "completed" || attempt?.status === "failed";
  return { attempt, done, timedOut };
}
