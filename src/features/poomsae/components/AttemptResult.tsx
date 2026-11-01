import { CheckCircle2, Hand, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/features/gamification/components/ProgressBar";
import { cn } from "@/lib/utils";

import {
  HAND_SHAPE_NOTE,
  handShapeLabel,
  hasSequenceResults,
  isHandShapeKey,
  normalizeHandCheck,
} from "../lib/sequence";
import { elementLabel, SEGMENT_PASS_SCORE } from "../lib/video";
import type { PoomsaeAttempt } from "../types";
import SequenceResults, { HandShapeLine } from "./SequenceResults";

interface Props {
  attempt: PoomsaeAttempt;
  onRepeat?: () => void;
  repeatLabel?: string;
  onClose?: () => void;
}

/** Score, per-element scores, criteria (passed/failed) and Spanish feedback. */
export default function AttemptResult({ attempt, onRepeat, repeatLabel, onClose }: Props) {
  if (attempt.status === "failed") {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-error" />
          <p className="font-display text-lg font-semibold text-text">
            No se pudo analizar el intento
          </p>
          <p className="mx-auto max-w-md text-sm text-muted">
            {attempt.feedback ||
              "Asegúrate de que el cuerpo completo sea visible, con buena luz, e inténtalo de nuevo."}
          </p>
          <div className="flex justify-center gap-2">
            {onRepeat && (
              <Button onClick={onRepeat}>
                <RefreshCw className="h-4 w-4" />
                {repeatLabel ?? "Repetir"}
              </Button>
            )}
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Volver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = attempt.score ?? 0;
  const passed = score >= SEGMENT_PASS_SCORE;
  const elements = Object.entries(attempt.element_scores ?? {});
  const criteria = attempt.criteria_results ?? [];
  const feedback = (attempt.feedback ?? "").split(/\n+/).filter((l) => l.trim());
  const isFull = attempt.mode === "full";
  const techniqueHand = normalizeHandCheck(attempt.hand);
  const shown = (key: string, v: string | number | null) =>
    isHandShapeKey(key) && typeof v === "string" ? handShapeLabel(v) : v;
  // Sequence attempts list many per-movement criteria: keep them collapsed.
  const sequence = hasSequenceResults(attempt);
  const passedLabel = isFull
    ? "Forma certificada"
    : attempt.mode === "technique"
      ? "Técnica superada"
      : "Segmento superado";
  const pendingLabel = isFull
    ? `Necesitas ${SEGMENT_PASS_SCORE} para certificar la forma`
    : `Necesitas ${SEGMENT_PASS_SCORE} para superarlo`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <div className="flex flex-wrap items-center gap-2">
            <span>{isFull ? "Resultado de la forma completa" : "Resultado del intento"}</span>
            {attempt.script_provisional && <Badge variant="outline">Guion provisional</Badge>}
          </div>
          <Badge variant={passed ? (isFull ? "highlight" : "success") : "warning"}>
            {passed ? passedLabel : pendingLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div
            className={cn(
              "grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 font-display text-3xl font-semibold tabular-nums",
              passed ? "border-success text-success" : "border-warning text-text",
            )}
            aria-label={`Puntaje ${score}`}
          >
            {Math.round(score)}
          </div>
          {elements.length > 0 && (
            <ul className="flex-1 space-y-2">
              {elements.map(([el, val]) => (
                <li key={el} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text">{elementLabel(el)}</span>
                    <span className="tabular-nums text-muted">{Math.round(val)}</span>
                  </div>
                  <ProgressBar percent={val} label={`Puntaje de ${elementLabel(el)}`} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <SequenceResults attempt={attempt} />

        {techniqueHand && (
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold text-text">Forma de la mano</p>
            <HandShapeLine hand={techniqueHand} />
          </div>
        )}

        {criteria.length > 0 && (
          <details open={!sequence}>
            <summary className="mb-2 cursor-pointer text-sm font-semibold text-text">
              Criterios evaluados ({criteria.length})
            </summary>
            <ul className="divide-y divide-divider rounded-md border border-border">
              {criteria.map((c) => (
                <li key={c.key} className="flex items-start gap-3 px-3 py-2 text-sm">
                  {c.passed ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-label="Cumplido"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-error"
                      aria-label="No cumplido"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-text">{c.label}</p>
                    <p className="text-xs text-muted">
                      Medido: {shown(c.key, c.value) ?? "—"}
                      {c.expected != null && c.expected !== "" && (
                        <> · Esperado: {shown(c.key, c.expected)}</>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        {feedback.length > 0 && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
            <p className="mb-1 text-sm font-semibold text-text">Recomendaciones</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {feedback.map((line, i) => (
                <li key={i}>{line.replace(/^[-•]\s*/, "")}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-start gap-2 text-xs text-muted">
          <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{HAND_SHAPE_NOTE}</span>
        </p>

        {(onRepeat || onClose) && (
          <div className="flex flex-wrap gap-2">
            {onRepeat && (
              <Button onClick={onRepeat}>
                <RefreshCw className="h-4 w-4" />
                {repeatLabel ?? "Repetir"}
              </Button>
            )}
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Volver
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
