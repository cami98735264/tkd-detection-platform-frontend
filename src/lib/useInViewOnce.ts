import { useEffect, useState, type RefObject } from "react";

/**
 * Returns `true` once the referenced element first crosses the viewport
 * threshold. Stays `true` thereafter — does not re-fire on scroll-up.
 *
 * Skips observation entirely when the user prefers reduced motion: returns
 * `true` immediately so consumers can render at their final state.
 */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  threshold = 0.15,
): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setSeen(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold, seen]);

  return seen;
}
