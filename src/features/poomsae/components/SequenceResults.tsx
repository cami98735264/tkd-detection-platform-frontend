import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/features/gamification/components/ProgressBar";
import { cn } from "@/lib/utils";

import {
  formatClipTime,
  handShapeLabel,
  normalizeMovementResults,
  normalizeSegmentResults,
  normalizeSequenceSummary,
  stepLabel,
  turnLabel,
} from "../lib/sequence";
import { SEGMENT_PASS_SCORE } from "../lib/video";
import type { HandCheck, MovementCheck, PoomsaeAttempt } from "../types";

function asNumber(v: MovementCheck["expected"]): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function CheckBadge({ kind, check }: { kind: "turn" | "step"; check: MovementCheck }) {
  const describe = (v: MovementCheck["expected"]) => {
    if (v == null || v === "") return "—";
    if (kind === "turn") {
      const n = asNumber(v);
      return n != null ? turnLabel(n) : String(v);
    }
    return stepLabel(String(v));
  };
  const title = `${kind === "turn" ? "Giro" : "Desplazamiento"}: esperado ${describe(
    check.expected,
  )}, medido ${describe(check.measured)}`;
  return (
    <Badge variant={check.passed ? "success" : "destructive"} title={title} aria-label={title}>
      {kind === "turn" ? "Giro" : "Paso"} {check.passed ? "✓" : "✗"}
    </Badge>
  );
}

/** Expected vs detected hand shape (C.8); non-evaluable never counts as a fail. */
export function HandShapeLine({ hand }: { hand: HandCheck }) {
  const expected = hand.expected ? handShapeLabel(hand.expected) : null;
  const detected = hand.evaluable ? handShapeLabel(hand.detected) : "No evaluable";
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>
        Mano{expected ? `: esperado ${expected}` : ""} · detectado {detected}
      </span>
      {hand.evaluable && hand.passed != null ? (
        <Badge variant={hand.passed ? "success" : "destructive"}>
          Forma de la mano {hand.passed ? "✓" : "✗"}
        </Badge>
      ) : (
        <Badge variant="outline-muted">No evaluable</Badge>
      )}
    </div>
  );
}

/**
 * Sequence analysis of a segment / full attempt (C.2/C.3): summary, per
 * segment scores (full mode) and the movement-by-movement timeline.
 */
export default function SequenceResults({
  attempt,
}: {
  attempt: Pick<PoomsaeAttempt, "movement_results" | "sequence_summary" | "segment_results">;
}) {
  const movements = normalizeMovementResults(attempt.movement_results);
  const summary = normalizeSequenceSummary(attempt.sequence_summary);
  const segments = normalizeSegmentResults(attempt.segment_results);
  if (movements.length === 0 && !summary && segments.length === 0) return null;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="rounded-md border border-border bg-surface-2/50 p-3 text-sm">
          <p className="font-semibold text-text">Secuencia</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Esperados</dt>
              <dd className="tabular-nums text-text">{summary.expected_movements}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Detectados</dt>
              <dd className="tabular-nums text-text">{summary.detected_movements}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">En orden</dt>
              <dd className="tabular-nums text-text">{summary.matched_in_order}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Movimientos extra</dt>
              <dd className="tabular-nums text-text">{summary.extra}</dd>
            </div>
          </dl>
          <p className={cn("mt-2 text-xs", summary.order_ok ? "text-success" : "text-error")}>
            {summary.order_ok ? "Orden correcto." : "El orden de los movimientos no es correcto."}
            {summary.missing.length > 0 && <> Faltan: {summary.missing.join(", ")}.</>}
          </p>
        </div>
      )}

      {segments.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-text">Resultado por segmento</p>
          <ul className="space-y-2">
            {segments.map((s, i) => (
              <li key={s.segment ?? i} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-text">{s.segment_name}</span>
                  <span className="tabular-nums text-muted">
                    {s.matched != null && s.expected != null && (
                      <span className="mr-2 text-xs">
                        {s.matched}/{s.expected} mov.
                      </span>
                    )}
                    {s.score != null ? Math.round(s.score) : "—"}
                  </span>
                </div>
                <ProgressBar
                  percent={s.score ?? 0}
                  label={`Puntaje de ${s.segment_name}`}
                  barClassName={cn((s.score ?? 0) < SEGMENT_PASS_SCORE && "bg-warning")}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {movements.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-text">Movimiento a movimiento</p>
          <ol className="divide-y divide-divider rounded-md border border-border">
            {movements.map((m) => (
              <li key={m.number} className="flex items-start gap-3 px-3 py-2 text-sm">
                {m.matched ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-label="Detectado"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-error"
                    aria-label="No detectado"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text">
                      {m.number}. {m.name}
                    </span>
                    {m.turn && <CheckBadge kind="turn" check={m.turn} />}
                    {m.step && <CheckBadge kind="step" check={m.step} />}
                  </div>
                  <span className="block text-xs text-muted">
                    {m.matched ? `En ${formatClipTime(m.time_s)}` : "No se detectó"}
                  </span>
                  {m.hand && <HandShapeLine hand={m.hand} />}
                  {m.issues.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                      {m.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="shrink-0 tabular-nums text-muted">
                  {m.score != null ? Math.round(m.score) : "—"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
