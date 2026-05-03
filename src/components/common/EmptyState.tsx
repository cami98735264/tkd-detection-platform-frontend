import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** "panel" (inside a Card/section) or "page" (full-page). Defaults to "panel". */
  size?: "panel" | "page";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "panel",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "panel" ? "py-12 px-6" : "py-24 px-6",
        className
      )}
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary animate-scale-in-fade"
        style={{
          animationTimingFunction: "var(--ease-bounce)",
          animationDuration: "var(--duration-deliberate)",
        }}
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="mt-5 text-lg font-display font-semibold tracking-tight text-text animate-slide-up-fade stagger-2">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted animate-slide-up-fade stagger-3">
          {description}
        </p>
      )}
      {action && (
        <div
          className="mt-6 animate-slide-up-fade"
          style={{ animationDelay: "260ms" }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
