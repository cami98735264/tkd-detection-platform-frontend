import type {
  AnalysisQuality,
  AnalyzedKick,
  DetailedRecommendation,
  EvaluationResults,
  MetricDetail,
  MetricKey,
  MetricStatus,
  RecommendationPriority,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";

/** Display order of the four kick metrics (matches the legacy cards). */
export const METRIC_ORDER: MetricKey[] = ["angle", "height", "speed", "stability"];

export const METRIC_FALLBACK_LABELS: Record<MetricKey, string> = {
  angle: "Ángulo",
  height: "Altura",
  speed: "Velocidad",
  stability: "Estabilidad",
};

export const METRIC_UNITS: Record<MetricKey, string> = {
  angle: "°",
  height: "cm",
  speed: "m/s",
  stability: "%",
};

export const STATUS_LABELS: Record<MetricStatus, string> = {
  optimal: "Óptimo",
  close: "Cerca",
  needs_work: "Por mejorar",
};

export const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  high: "Prioridad alta",
  medium: "Prioridad media",
  low: "Prioridad baja",
};

const PRIORITY_RANK: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStatus = (v: unknown): v is MetricStatus =>
  v === "optimal" || v === "close" || v === "needs_work";

/** Trim to at most 2 decimals without trailing zeros ("175", "173.3", "0.99"). */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}

/** "173.3°", "160.8 cm", "5.8 m/s", "85.6 %". */
export function formatWithUnit(n: number, unit: string): string {
  const num = formatNumber(n);
  if (!unit) return num;
  return unit === "°" ? `${num}°` : `${num} ${unit}`;
}

/** "165–180°" / "140–160 cm". */
export function formatRange(min: number, max: number, unit: string): string {
  return `${formatNumber(min)}–${formatWithUnit(max, unit)}`;
}

/** Status per the contract when the backend sends none/an unknown one. */
export function deriveStatus(
  m: Pick<MetricDetail, "value" | "optimal_min" | "optimal_max" | "score">,
) {
  if (m.value >= m.optimal_min && m.value <= m.optimal_max) return "optimal" as const;
  return m.score >= 70 ? ("close" as const) : ("needs_work" as const);
}

/**
 * Validated, ordered executed-vs-optimal metrics, or `null` when the payload
 * comes from an older backend without `metrics` (callers then render the
 * legacy value-only cards).
 */
export function getMetricDetails(
  results: EvaluationResults | null | undefined,
): MetricDetail[] | null {
  const raw: unknown = results?.metrics;
  if (!Array.isArray(raw)) return null;

  const parsed: MetricDetail[] = [];
  for (const item of raw as Partial<MetricDetail>[]) {
    if (!item || typeof item !== "object") continue;
    const { key, value, optimal } = item;
    if (typeof key !== "string" || !isNum(value) || !isNum(optimal)) continue;
    const metricKey = key as MetricKey;
    const optimal_min = isNum(item.optimal_min) ? item.optimal_min : optimal;
    const optimal_max = isNum(item.optimal_max) ? item.optimal_max : optimal;
    const score = isNum(item.score) ? item.score : 0;
    const base = { value, optimal_min, optimal_max, score };
    const status = isStatus(item.status) ? item.status : deriveStatus(base);
    parsed.push({
      key: metricKey,
      label: item.label || METRIC_FALLBACK_LABELS[metricKey] || key,
      unit: typeof item.unit === "string" ? item.unit : (METRIC_UNITS[metricKey] ?? ""),
      value,
      optimal,
      optimal_min: Math.min(optimal_min, optimal_max),
      optimal_max: Math.max(optimal_min, optimal_max),
      ratio: isNum(item.ratio) ? item.ratio : optimal ? Number((value / optimal).toFixed(2)) : 0,
      score,
      status,
      status_display: item.status_display || STATUS_LABELS[status],
      description: typeof item.description === "string" ? item.description : "",
    });
  }
  if (parsed.length === 0) return null;

  const rank = (k: string) => {
    const i = METRIC_ORDER.indexOf(k as MetricKey);
    return i === -1 ? METRIC_ORDER.length : i;
  };
  return parsed.sort((a, b) => rank(a.key) - rank(b.key));
}

/** Recommendations sorted high → medium → low (stable; unknown priorities last). */
export function getSortedRecommendations(
  results: EvaluationResults | null | undefined,
): DetailedRecommendation[] {
  const raw: unknown = results?.detailed_recommendations;
  if (!Array.isArray(raw)) return [];
  return (raw as Partial<DetailedRecommendation>[])
    .filter((r): r is Partial<DetailedRecommendation> => !!r && typeof r === "object")
    .filter((r) => !!(r.title || r.detail))
    .map((r) => ({
      metric: r.metric as MetricKey,
      priority: r.priority as RecommendationPriority,
      title: r.title ?? "",
      detail: r.detail ?? "",
      drills: Array.isArray(r.drills) ? r.drills.filter((d) => typeof d === "string" && d) : [],
    }))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.r.priority] ?? 3;
      const pb = PRIORITY_RANK[b.r.priority] ?? 3;
      return pa - pb || a.i - b.i;
    })
    .map(({ r }) => r);
}

export interface GaugeGeometry {
  /** Percent (0–100) positions on the track. */
  bandStart: number;
  bandEnd: number;
  optimal: number;
  value: number;
}

/** Track scale padded around both the optimal range and the executed value. */
export function gaugeGeometry(
  m: Pick<MetricDetail, "value" | "optimal" | "optimal_min" | "optimal_max">,
): GaugeGeometry {
  const lo = Math.min(m.optimal_min, m.value, m.optimal);
  const hi = Math.max(m.optimal_max, m.value, m.optimal);
  const span = hi - lo;
  const pad = span > 0 ? span * 0.25 : Math.max(Math.abs(m.optimal) * 0.1, 1);
  const min = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;
  const max = hi + pad;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  return {
    bandStart: pos(m.optimal_min),
    bandEnd: pos(m.optimal_max),
    optimal: pos(m.optimal),
    value: pos(m.value),
  };
}

// --------------------------------------------------------------------------
// Analysis v2 quality report
// --------------------------------------------------------------------------

export type ConfidenceLevel = "high" | "medium" | "low";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "Confiabilidad alta",
  medium: "Confiabilidad media",
  low: "Confiabilidad baja",
};

export const LEG_LABELS: Record<"left" | "right", string> = {
  left: "pierna izquierda",
  right: "pierna derecha",
};

export interface QualitySummary {
  confidence: number | null;
  level: ConfidenceLevel | null;
  warnings: string[];
  kicks: AnalyzedKick[];
  usedIndex: number | null;
  realFps: number | null;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

/**
 * Normalise ``results.analysis_quality`` (v2). Returns null for legacy
 * sessions or malformed payloads, so the UI simply hides the section.
 */
export function getQualitySummary(results: EvaluationResults): QualitySummary | null {
  const q = results.analysis_quality as AnalysisQuality | null | undefined;
  if (!q || typeof q !== "object" || typeof q.version !== "number") return null;
  const confidence = finite(q.confidence);
  const warnings = Array.isArray(q.warnings)
    ? q.warnings.filter((w): w is string => typeof w === "string" && w.trim() !== "")
    : [];
  const kicks = Array.isArray(q.kicks)
    ? q.kicks.filter(
        (k): k is AnalyzedKick =>
          !!k && typeof k === "object" && finite(k.time_s) !== null && finite(k.overall) !== null,
      )
    : [];
  const usedIndex = finite(q.kick_used?.index);
  return {
    confidence,
    level: confidence === null ? null : confidenceLevel(confidence),
    warnings,
    kicks,
    usedIndex,
    realFps: finite(q.real_fps),
  };
}
