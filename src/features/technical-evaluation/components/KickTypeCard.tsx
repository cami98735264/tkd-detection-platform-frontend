import { CheckCircle2, Target } from "lucide-react";

import { cn } from "@/lib/utils";

interface KickTypeCardProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

export default function KickTypeCard({
  name,
  selected,
  onClick,
}: KickTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-lg border bg-surface p-4 text-left transition-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      {selected && (
        <CheckCircle2
          className="absolute right-2 top-2 h-4 w-4 text-primary"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-md transition-interactive",
          selected
            ? "bg-primary/15 text-primary"
            : "bg-primary/10 text-primary group-hover:bg-primary/15",
        )}
      >
        <Target className="h-4 w-4" />
      </span>
      <p
        className={cn(
          "font-display text-base font-semibold tracking-tight",
          selected ? "text-primary" : "text-text",
        )}
      >
        {name}
      </p>
    </button>
  );
}
