import type { AdminChecks, AdminCheckDef, TechnicalScore } from "../types";

/** Clamp a criterion score to the 0–100 scale. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Weighted average of the technical criteria (0–100, one decimal), the same
 * formula the backend applies on finalize. Null when there is nothing to
 * average (no criteria or all weights 0).
 */
export function weightedScore(scores: TechnicalScore[]): number | null {
  let total = 0;
  let weights = 0;
  for (const s of scores) {
    const w = Number.isFinite(s.weight) && s.weight > 0 ? s.weight : 0;
    total += clampScore(Number(s.score)) * w;
    weights += w;
  }
  if (weights === 0) return null;
  return Math.round((total / weights) * 10) / 10;
}

/** Keys of the administrative checks that are not satisfied. */
export function failingChecks(checks: AdminChecks, defs: AdminCheckDef[]): string[] {
  const keys = defs.length > 0 ? defs.map((d) => d.key) : Object.keys(checks);
  return keys.filter((k) => !checks[k]);
}

export interface ExamPreview {
  score: number | null;
  passesScore: boolean;
  checksOk: boolean;
  /** What finalize would decide with the current values. */
  outcome: "approved" | "rejected";
}

/** Live preview: approved iff score ≥ passing score AND every admin check holds. */
export function previewExam(
  scores: TechnicalScore[],
  passingScore: number,
  checks: AdminChecks,
  defs: AdminCheckDef[],
): ExamPreview {
  const score = weightedScore(scores);
  const passesScore = score !== null && score >= passingScore;
  const checksOk = failingChecks(checks, defs).length === 0;
  return {
    score,
    passesScore,
    checksOk,
    outcome: passesScore && checksOk ? "approved" : "rejected",
  };
}

export const EXAM_RESULT_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "No aprobado",
};
