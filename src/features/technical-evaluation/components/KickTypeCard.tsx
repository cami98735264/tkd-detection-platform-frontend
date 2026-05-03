import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KickTypeCardProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

export default function KickTypeCard({ name, selected, onClick }: KickTypeCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative p-4 cursor-pointer text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40 hover:bg-surface-2",
      )}
      aria-pressed={selected}
    >
      {selected && (
        <CheckCircle2
          className="absolute right-2 top-2 h-4 w-4 text-primary"
          aria-hidden="true"
        />
      )}
      <p
        className={cn(
          "font-display text-base font-semibold tracking-tight",
          selected ? "text-primary" : "text-text",
        )}
      >
        {name}
      </p>
    </Card>
  );
}
