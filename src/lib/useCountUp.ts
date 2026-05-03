import { useEffect, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a number from 0 to `target` over `durationMs`. Bypasses the ramp
 * (returns the target instantly) when the user prefers reduced motion or when
 * `target` isn't a finite number.
 */
export function useCountUp(
  target: number,
  durationMs = 800,
  ease: (t: number) => number = easeOutCubic,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof target !== "number" || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(ease(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, ease]);

  return value;
}
