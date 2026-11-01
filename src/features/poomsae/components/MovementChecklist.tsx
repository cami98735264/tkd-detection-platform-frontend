import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { stepLabel, turnArrow, turnLabel } from "../lib/sequence";
import type { PoomsaeMovement } from "../types";

interface Props {
  movements: PoomsaeMovement[];
  className?: string;
}

/** Ordered movement script of a segment / form, shown before recording (C.7). */
export default function MovementChecklist({ movements, className }: Props) {
  if (movements.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold text-text">
        Movimientos a ejecutar, en orden ({movements.length})
      </p>
      <ol className="divide-y divide-divider rounded-md border border-border">
        {movements.map((m) => (
          <li key={m.number} className="flex items-start gap-3 px-3 py-2 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
              {m.number}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-text">{m.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span aria-label={turnLabel(m.turn_deg)} title={turnLabel(m.turn_deg)}>
                  <span aria-hidden="true" className="mr-1 font-semibold text-text">
                    {turnArrow(m.turn_deg)}
                  </span>
                  {turnLabel(m.turn_deg)}
                </span>
                {m.step && <span>{stepLabel(m.step)}</span>}
              </span>
            </div>
            {m.kihap && <Badge variant="highlight">Kihap</Badge>}
          </li>
        ))}
      </ol>
    </div>
  );
}
