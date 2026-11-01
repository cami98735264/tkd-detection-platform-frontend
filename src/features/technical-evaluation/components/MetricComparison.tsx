import { Dumbbell, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DetailedRecommendation,
  EvaluationResults,
  MetricDetail,
  MetricKey,
  MetricStatus,
  RecommendationPriority,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";
import {
  METRIC_FALLBACK_LABELS,
  METRIC_UNITS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatRange,
  formatWithUnit,
  gaugeGeometry,
  getMetricDetails,
} from "@/features/technical-evaluation/lib/kickFeedback";

const STATUS_BADGE: Record<MetricStatus, "success" | "warning" | "destructive"> = {
  optimal: "success",
  close: "warning",
  needs_work: "destructive",
};

const STATUS_DOT: Record<MetricStatus, string> = {
  optimal: "bg-success",
  close: "bg-warning",
  needs_work: "bg-error",
};

const PRIORITY_BADGE: Record<RecommendationPriority, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const PRIORITY_BORDER: Record<RecommendationPriority, string> = {
  high: "border-l-error",
  medium: "border-l-warning",
  low: "border-l-border",
};

export function MetricStatusBadge({
  metric,
}: {
  metric: Pick<MetricDetail, "status" | "status_display">;
}) {
  return (
    <Badge variant={STATUS_BADGE[metric.status]} data-status={metric.status} className="shrink-0">
      {metric.status_display || STATUS_LABELS[metric.status]}
    </Badge>
  );
}

/** Horizontal track: optimal range band, optimal tick and the executed value marker. */
export function MetricGauge({ metric }: { metric: MetricDetail }) {
  const g = gaugeGeometry(metric);
  const label = `${metric.label}: ${formatWithUnit(metric.value, metric.unit)} frente al rango óptimo ${formatRange(metric.optimal_min, metric.optimal_max, metric.unit)}`;
  return (
    <div role="img" aria-label={label} className="relative h-3 w-full">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-success/30"
        style={{ left: `${g.bandStart}%`, width: `${Math.max(g.bandEnd - g.bandStart, 1)}%` }}
      />
      <div
        className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded bg-text/60"
        style={{ left: `${g.optimal}%` }}
      />
      <div
        className={cn(
          "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow",
          STATUS_DOT[metric.status],
        )}
        style={{ left: `${g.value}%` }}
      />
    </div>
  );
}

/** One metric: executed vs optimal, gauge, status and the backend's explanation. */
export function MetricComparisonCard({ metric }: { metric: MetricDetail }) {
  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      data-testid={`metric-${metric.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{metric.label}</p>
        <MetricStatusBadge metric={metric} />
      </div>
      <p className="mt-2 font-display tabular-nums text-text">
        <span className="text-2xl font-semibold">{formatWithUnit(metric.value, metric.unit)}</span>
        <span className="ml-1.5 text-sm text-muted">
          / óptimo {formatWithUnit(metric.optimal, metric.unit)}
        </span>
      </p>
      <div className="mt-3">
        <MetricGauge metric={metric} />
        <div className="mt-1 flex justify-between gap-2 text-xs text-faint">
          <span>Ejecutado</span>
          <span>
            Rango óptimo {formatRange(metric.optimal_min, metric.optimal_max, metric.unit)}
          </span>
        </div>
      </div>
      {metric.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted">{metric.description}</p>
      )}
    </div>
  );
}

/** Priority-sorted "what to improve" list (expects already-sorted input). */
export function ImprovementList({
  recommendations,
  metrics,
}: {
  recommendations: DetailedRecommendation[];
  metrics: MetricDetail[];
}) {
  const labelFor = (key: MetricKey) =>
    metrics.find((m) => m.key === key)?.label ?? METRIC_FALLBACK_LABELS[key] ?? "";
  return (
    <ol className="space-y-3">
      {recommendations.map((rec, i) => (
        <li
          key={`${rec.metric}-${i}`}
          data-testid="improvement-item"
          className={cn(
            "rounded-md border border-border border-l-4 bg-surface p-4",
            PRIORITY_BORDER[rec.priority] ?? "border-l-border",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {rec.priority in PRIORITY_LABELS && (
              <Badge variant={PRIORITY_BADGE[rec.priority]}>{PRIORITY_LABELS[rec.priority]}</Badge>
            )}
            {labelFor(rec.metric) && (
              <span className="text-xs font-medium uppercase tracking-wider text-faint">
                {labelFor(rec.metric)}
              </span>
            )}
          </div>
          {rec.title && (
            <p className="mt-2 font-display font-semibold tracking-tight text-text">{rec.title}</p>
          )}
          {rec.detail && <p className="mt-1 text-sm leading-relaxed text-muted">{rec.detail}</p>}
          {rec.drills.length > 0 && (
            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                <Dumbbell className="h-3.5 w-3.5" />
                Ejercicios sugeridos
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-text">
                {rec.drills.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Compact history-table cell: "173.3° / 175°" with a status dot, or the legacy value. */
export function MetricTableCell({
  results,
  metricKey,
}: {
  results: EvaluationResults | null;
  metricKey: MetricKey;
}) {
  if (!results) return <span className="text-faint">—</span>;
  const metric = getMetricDetails(results)?.find((m) => m.key === metricKey);
  if (!metric) {
    return (
      <span className="text-muted">
        {formatWithUnit(results[metricKey], METRIC_UNITS[metricKey])}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={`${metric.status_display} · óptimo ${formatWithUnit(metric.optimal, metric.unit)}`}
    >
      <span
        aria-hidden
        data-status={metric.status}
        className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[metric.status])}
      />
      <span className="text-text tabular-nums">{formatWithUnit(metric.value, metric.unit)}</span>
      <span className="text-xs text-faint tabular-nums">
        / {formatWithUnit(metric.optimal, metric.unit)}
      </span>
      <span className="sr-only">{metric.status_display}</span>
    </span>
  );
}

export function OptimalReferenceNote({ results }: { results: EvaluationResults }) {
  const ref = results.optimal_reference;
  if (!ref) return null;
  const stature =
    typeof ref.athlete_height_cm === "number"
      ? `estatura ${formatWithUnit(ref.athlete_height_cm, "cm")} (${ref.height_basis === "athlete" ? "registrada" : "estimada desde el video"})`
      : null;
  return (
    <p className="flex items-start gap-2 text-xs text-faint">
      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Valores óptimos para {ref.kick_type || "esta patada"}
        {stature ? ` · ${stature}` : ""}.{ref.source_note ? ` ${ref.source_note}` : ""}
      </span>
    </p>
  );
}
