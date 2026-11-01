import { Badge } from "@/components/ui/badge";

import { elementLabel } from "../lib/video";
import type { Technique } from "../types";

/** Text reference for a fundamental technique (what the analysis checks). */
export default function TechniqueReference({ technique }: { technique: Technique }) {
  const criteria = technique.criteria ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="tonal">{elementLabel(technique.element)}</Badge>
        {technique.korean_name && (
          <span className="text-sm text-muted">{technique.korean_name}</span>
        )}
        {technique.difficulty != null && (
          <span className="text-xs text-faint">Dificultad {technique.difficulty}/3</span>
        )}
      </div>
      {technique.description && <p className="text-sm text-text">{technique.description}</p>}
      {criteria.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-text">Qué se evalúa</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
            {criteria.map((c) => (
              <li key={c.key}>
                {c.label}
                {(c.min != null || c.max != null) && (
                  <span className="text-faint">
                    {" "}
                    ({c.min ?? "…"}–{c.max ?? "…"}
                    {c.unit ? ` ${c.unit}` : ""})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
