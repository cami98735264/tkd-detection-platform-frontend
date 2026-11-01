import { AlertTriangle, CheckCircle, Lightbulb, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EvaluationResults } from "@/features/technical-evaluation/api/technicalEvaluationApi";
import {
  ImprovementList,
  MetricComparisonCard,
  OptimalReferenceNote,
} from "@/features/technical-evaluation/components/MetricComparison";
import {
  CONFIDENCE_LABELS,
  LEG_LABELS,
  formatNumber,
  getMetricDetails,
  getQualitySummary,
  getSortedRecommendations,
  type QualitySummary,
} from "@/features/technical-evaluation/lib/kickFeedback";

interface EvaluationResultsProps {
  results: EvaluationResults;
  onClose?: () => void;
}

export default function EvaluationResultsView({ results, onClose }: EvaluationResultsProps) {
  const tone =
    results.overall_score >= 80 ? "success" : results.overall_score >= 60 ? "warning" : "error";

  const scoreClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-error";

  // Older backends send only the raw values: fall back to the value-only cards.
  const metrics = getMetricDetails(results);
  const improvements = metrics ? getSortedRecommendations(results) : [];
  const allOptimal = !!metrics && metrics.every((m) => m.status === "optimal");
  const quality = getQualitySummary(results);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <CheckCircle className="h-5 w-5 text-success" />
          Resultados de la evaluación
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Cerrar resultados"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="text-center py-6 border-b border-divider">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Puntuación general
          </p>
          <div className={cn("mt-2 font-display text-7xl font-semibold tabular-nums", scoreClass)}>
            {results.overall_score}
            <span className="text-3xl text-faint">/100</span>
          </div>
        </div>

        {quality && <AnalysisQualitySection quality={quality} />}

        {metrics ? (
          <section aria-labelledby="executed-vs-optimal" className="space-y-3">
            <h3
              id="executed-vs-optimal"
              className="font-display font-semibold tracking-tight text-text"
            >
              Ejecutado vs. óptimo
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {metrics.map((m) => (
                <MetricComparisonCard key={m.key} metric={m} />
              ))}
            </div>
            <OptimalReferenceNote results={results} />
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Ángulo" value={results.angle} unit="°" />
            <MetricCard label="Altura" value={results.height} unit="cm" />
            <MetricCard label="Velocidad" value={results.speed} unit="m/s" />
            <MetricCard label="Estabilidad" value={results.stability} unit="%" />
          </div>
        )}

        {results.recommendations && (
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="font-display font-semibold tracking-tight text-text">
              {metrics ? "Resumen" : "Recomendaciones"}
            </p>
            <p className="mt-1 text-sm text-muted">{results.recommendations}</p>
          </div>
        )}

        {metrics && (improvements.length > 0 || allOptimal) && (
          <section aria-labelledby="what-to-improve" className="space-y-3">
            <h3
              id="what-to-improve"
              className="flex items-center gap-2 font-display font-semibold tracking-tight text-text"
            >
              <Lightbulb className="h-4 w-4 text-warning" />
              Qué debes mejorar
            </h3>
            {improvements.length > 0 ? (
              <ImprovementList recommendations={improvements} metrics={metrics} />
            ) : (
              <p className="text-sm text-muted">
                Todas las métricas están dentro de su rango óptimo. ¡Mantén esta técnica!
              </p>
            )}
          </section>
        )}

        <div>
          <Badge variant="success">Evaluación completada</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisQualitySection({ quality }: { quality: QualitySummary }) {
  const { level, warnings, kicks, usedIndex } = quality;
  const badge = level === "high" ? "success" : level === "medium" ? "warning" : "destructive";
  const used = usedIndex !== null ? kicks[usedIndex - 1] : undefined;
  if (!level && warnings.length === 0 && kicks.length === 0) return null;
  return (
    <section aria-labelledby="analysis-quality" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="analysis-quality" className="font-display font-semibold tracking-tight text-text">
          Calidad del análisis
        </h3>
        {level && <Badge variant={badge}>{CONFIDENCE_LABELS[level]}</Badge>}
      </div>
      {kicks.length > 0 && (
        <p className="text-sm text-muted">
          {kicks.length === 1
            ? "Se detectó 1 patada en el video."
            : `Se detectaron ${kicks.length} patadas; se muestra la mejor`}
          {kicks.length > 1 && used
            ? ` (n.º ${usedIndex}, ${LEG_LABELS[used.leg] ?? used.leg}, segundo ${formatNumber(used.time_s)}).`
            : kicks.length > 1
              ? "."
              : ""}
        </p>
      )}
      {kicks.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Patadas detectadas">
          {kicks.map((k, i) => (
            <li
              key={`${k.time_s}-${i}`}
              className={cn(
                "rounded-md border px-2 py-1 text-xs tabular-nums",
                i + 1 === usedIndex
                  ? "border-primary bg-primary/10 text-text"
                  : "border-border text-muted",
              )}
            >
              #{i + 1} · {formatNumber(k.time_s)} s · {formatNumber(k.overall)}/100
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="space-y-1" aria-label="Advertencias de la grabación">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 text-sm text-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text">
        {value}
        <span className="ml-1 text-sm text-faint">{unit}</span>
      </p>
    </div>
  );
}
