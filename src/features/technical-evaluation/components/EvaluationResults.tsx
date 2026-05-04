import { CheckCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EvaluationResults } from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface EvaluationResultsProps {
  results: EvaluationResults;
  onClose?: () => void;
}

export default function EvaluationResultsView({ results, onClose }: EvaluationResultsProps) {
  const tone =
    results.overall_score >= 80
      ? "success"
      : results.overall_score >= 60
        ? "warning"
        : "error";

  const scoreClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-error";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <CheckCircle className="h-5 w-5 text-success" />
          Resultados de la evaluación
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-6 border-b border-divider">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Puntuación general
          </p>
          <div className={cn("mt-2 font-display text-7xl font-semibold tabular-nums", scoreClass)}>
            {results.overall_score}
            <span className="text-3xl text-faint">/100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Ángulo" value={results.angle} unit="°" />
          <MetricCard label="Altura" value={results.height} unit="cm" />
          <MetricCard label="Velocidad" value={results.speed} unit="m/s" />
          <MetricCard label="Estabilidad" value={results.stability} unit="%" />
        </div>

        {results.recommendations && (
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="font-display font-semibold tracking-tight text-text">
              Recomendaciones
            </p>
            <p className="mt-1 text-sm text-muted">{results.recommendations}</p>
          </div>
        )}

        <div>
          <Badge variant="success">Evaluación completada</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text">
        {value}
        <span className="ml-1 text-sm text-faint">{unit}</span>
      </p>
    </div>
  );
}
