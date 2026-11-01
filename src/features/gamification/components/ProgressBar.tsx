import { cn } from "@/lib/utils";

interface Props {
  percent: number;
  label: string;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ percent, label, className, barClassName }: Props) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-700", barClassName)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
