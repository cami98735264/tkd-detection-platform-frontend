import { useRef, type ReactNode } from "react";

import { useInViewOnce } from "@/lib/useInViewOnce";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Threshold passed to IntersectionObserver. Default 0.15 (15% visible). */
  threshold?: number;
}

/**
 * Reveals its children with a slide-up-fade once the element first crosses the
 * viewport threshold. Renders invisible (`opacity-0`) until that point so the
 * keyframe entrance has somewhere to come from. Stays mounted and visible
 * thereafter — no re-trigger on scroll-up.
 */
export function ScrollReveal({ children, className, threshold = 0.15 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(ref, threshold);
  return (
    <div
      ref={ref}
      className={cn(seen ? "animate-slide-up-fade" : "opacity-0", className)}
    >
      {children}
    </div>
  );
}
