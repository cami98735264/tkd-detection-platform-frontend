// Addendum C.4 — technique calibration tools (maestro). Defensive
// normalisers for stats / calibrate / calibrations bodies.
import type {
  CalibrationProposal,
  CalibrationTolerance,
  CriterionStats,
  PoomsaeAttempt,
  ProposedRange,
  Technique,
  TechniqueCalibration,
  TechniqueCriterion,
  TechniqueStats,
} from "../types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function list(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (isObj(data) && Array.isArray(data.results)) return data.results;
  return [];
}

export const TOLERANCE_OPTIONS: { value: CalibrationTolerance; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "strict", label: "Estricta" },
  { value: "lenient", label: "Flexible" },
];

export function normalizeStats(data: unknown): TechniqueStats {
  if (!isObj(data)) return { technique: null, attempts: 0, criteria: [] };
  const criteria: CriterionStats[] = (Array.isArray(data.criteria) ? data.criteria : [])
    .filter(isObj)
    .map((c) => ({
      key: str(c.key),
      label: str(c.label) || str(c.key),
      min: num(c.min),
      max: num(c.max),
      unit: str(c.unit),
      n: num(c.n) ?? 0,
      mean: num(c.mean),
      p10: num(c.p10),
      p50: num(c.p50),
      p90: num(c.p90),
      pass_rate: num(c.pass_rate),
    }))
    .filter((c) => c.key);
  return {
    technique: num(isObj(data.technique) ? data.technique.id : data.technique),
    attempts: num(data.attempts) ?? 0,
    criteria,
  };
}

function pair(v: unknown): [number | null, number | null] {
  if (Array.isArray(v)) return [num(v[0]), num(v[1])];
  if (isObj(v)) return [num(v.min), num(v.max)];
  return [null, null];
}

export function normalizeProposal(data: unknown): CalibrationProposal {
  if (!isObj(data)) return { proposed: [], applied: false };
  const proposed: ProposedRange[] = (Array.isArray(data.proposed) ? data.proposed : [])
    .filter(isObj)
    .map((p) => ({
      key: str(p.key),
      label: str(p.label) || str(p.key),
      unit: str(p.unit),
      current: pair(p.current),
      proposed: pair(p.proposed),
      samples: num(p.samples) ?? 0,
    }));
  return { proposed, applied: data.applied === true };
}

function criteriaList(v: unknown): TechniqueCriterion[] {
  return (Array.isArray(v) ? v : []).filter(isObj).map((c) => ({
    key: str(c.key),
    label: str(c.label) || str(c.key),
    joint: typeof c.joint === "string" ? c.joint : undefined,
    min: num(c.min),
    max: num(c.max),
    unit: typeof c.unit === "string" ? c.unit : undefined,
  }));
}

export function normalizeCalibrations(data: unknown): TechniqueCalibration[] {
  const rows = list(data).filter(isObj);
  // The backend logs a revert as a NEW entry whose `reverts` = id of the undone one.
  const revertedIds = new Set(
    rows.map((c) => num(c.reverts)).filter((n): n is number => n != null),
  );
  return rows
    .map((c) => {
      const by = c.created_by;
      const byName =
        typeof c.created_by_name === "string"
          ? c.created_by_name
          : isObj(by)
            ? str(by.full_name ?? by.name ?? by.email) || null
            : null;
      return {
        id: num(c.id) ?? 0,
        created_at: typeof c.created_at === "string" ? c.created_at : null,
        created_by_name: byName,
        attempt_ids: Array.isArray(c.attempt_ids)
          ? c.attempt_ids.map(num).filter((n): n is number => n != null)
          : [],
        previous_criteria: criteriaList(c.previous_criteria ?? c.previous),
        new_criteria: criteriaList(c.new_criteria ?? c.new),
        reverted: c.reverted === true || c.reverted_at != null || revertedIds.has(num(c.id) ?? -1),
        is_revert: num(c.reverts) != null || c.tolerance === "revert",
      };
    })
    .filter((c) => c.id > 0)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/** Format a [min, max] range with its unit ("90–120°", "≥ 0.3", "—"). */
export function formatRange(min: number | null, max: number | null, unit?: string): string {
  const u = unit === "deg" ? "°" : "";
  const f = (n: number) => `${Math.round(n * 100) / 100}${u}`;
  if (min != null && max != null) return `${f(min)}–${f(max)}`;
  if (min != null) return `≥ ${f(min)}`;
  if (max != null) return `≤ ${f(max)}`;
  return "—";
}

export function formatValue(v: number | null, unit?: string): string {
  if (v == null) return "—";
  return `${Math.round(v * 100) / 100}${unit === "deg" ? "°" : ""}`;
}

/** pass_rate may come as 0–1 or 0–100. */
export function formatPassRate(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(v <= 1 ? v * 100 : v)} %`;
}

/**
 * Whether a completed attempt can feed the calibration of `technique`:
 * technique-mode attempts of that technique, or sequence attempts whose
 * criteria keys mention its code ("<code>.<key>" / "<n>.<code>.<key>").
 */
export function attemptUsesTechnique(
  attempt: Pick<PoomsaeAttempt, "mode" | "technique" | "criteria_results">,
  technique: Pick<Technique, "id" | "code">,
): boolean {
  if (attempt.mode === "technique") return attempt.technique === technique.id;
  const keys = Array.isArray(attempt.criteria_results)
    ? attempt.criteria_results.map((c) => str(c?.key))
    : [];
  return keys.some((k) => k.split(".").includes(technique.code));
}
