import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/types/api";

/**
 * Rate-limit cooldown helper (contract §2). When a request fails with a
 * throttle (429 / `error.code === "throttled"`), call `handle(err)` — it starts
 * a countdown seeded from `Retry-After` (or a 30s fallback) and returns true so
 * the caller can skip its generic error toast. While `cooldown > 0` the trigger
 * should be disabled and "Inténtalo de nuevo en N segundos" shown.
 */
export function useThrottle() {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const start = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const handle = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.isThrottled) {
        const seconds = err.retryAfter && err.retryAfter > 0 ? err.retryAfter : 30;
        start(seconds);
        return true;
      }
      return false;
    },
    [start],
  );

  return { cooldown, handle };
}
