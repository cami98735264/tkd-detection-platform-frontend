import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: ReactNode;
  /** Optional sub-line (helper text under the label). */
  helper?: string;
  delta?: { direction: "up" | "down"; value: string };
  icon?: LucideIcon;
  /** Treat the value as positive/negative cue (success/error tint on icon chip). */
  tone?: "default" | "success" | "warning" | "error";
}

interface StatsRowProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  loading?: boolean;
  className?: string;
}

const COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

const TONE_CHIP = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-text",
  error: "bg-error/12 text-error",
} as const;

export function StatsRow({ items, columns = 4, loading, className }: StatsRowProps) {
  return (
    <div className={cn("grid gap-4 grid-cols-1", COLS[columns], className)}>
      {items.map((item, idx) => (
        <Card key={`${item.label}-${idx}`} className="overflow-hidden">
          <CardContent className="flex items-start gap-4 p-5">
            {item.icon && (
              <span className={cn("grid h-10 w-10 place-items-center rounded-lg", TONE_CHIP[item.tone ?? "default"])}>
                <item.icon className="h-5 w-5" strokeWidth={2} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {item.label}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight text-text">
                {loading ? <Skeleton className="h-8 w-20" /> : <CountUpValue value={item.value} />}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {item.delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-medium",
                      item.delta.direction === "up" ? "text-success" : "text-error"
                    )}
                  >
                    {item.delta.direction === "up" ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {item.delta.value}
                  </span>
                )}
                {item.helper && <span className="text-muted">{item.helper}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Renders a stat value, animating from 0 only when the value is a finite
 * number. Strings, percentages, dashes, and ReactNodes pass through untouched.
 */
function CountUpValue({ value }: { value: ReactNode }) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const animated = useCountUp(isNumber ? (value as number) : 0);
  if (!isNumber) return <>{value}</>;
  return <>{animated}</>;
}
