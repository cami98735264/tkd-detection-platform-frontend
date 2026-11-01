import type {
  ChallengeMetric,
  CategoryOption,
  GamificationProfile,
  LevelInfo,
  LeaderboardPeriod,
} from "../types";

/** XP thresholds (contract §7). */
export const LEVELS: { number: number; name: string; min_xp: number }[] = [
  { number: 1, name: "Principiante", min_xp: 0 },
  { number: 2, name: "Aprendiz", min_xp: 100 },
  { number: 3, name: "Practicante", min_xp: 300 },
  { number: 4, name: "Competidor", min_xp: 600 },
  { number: 5, name: "Avanzado", min_xp: 1000 },
  { number: 6, name: "Experto", min_xp: 1500 },
  { number: 7, name: "Maestro del dojang", min_xp: 2200 },
];

/** Level for a given XP total (client-side fallback when the API omits it). */
export function levelForXp(xp: number): LevelInfo {
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (safe >= LEVELS[i].min_xp) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (safe - cur.min_xp) / (next.min_xp - cur.min_xp) : 1;
  return {
    number: cur.number,
    name: cur.name,
    min_xp: cur.min_xp,
    next_min_xp: next ? next.min_xp : null,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

export interface LevelProgress {
  /** 0–100 integer for the progress bar. */
  percent: number;
  /** XP still needed for the next level (0 at the top). */
  remaining: number;
  isMax: boolean;
}

/** Progress-bar numbers for a level + XP pair. */
export function levelProgress(level: LevelInfo, xp: number): LevelProgress {
  if (level.next_min_xp == null) return { percent: 100, remaining: 0, isMax: true };
  const span = level.next_min_xp - level.min_xp;
  const ratio =
    Number.isFinite(level.progress) && level.progress >= 0
      ? level.progress
      : span > 0
        ? (xp - level.min_xp) / span
        : 0;
  return {
    percent: Math.round(Math.min(1, Math.max(0, ratio)) * 100),
    remaining: Math.max(0, level.next_min_xp - xp),
    isMax: false,
  };
}

/** 0–100 progress of a challenge. */
export function challengePercent(value: number, target: number): number {
  if (!target || target <= 0) return value > 0 ? 100 : 0;
  return Math.round(Math.min(1, Math.max(0, value / target)) * 100);
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Make a profile body safe to render, whatever the server returned. */
export function normalizeProfile(raw: unknown): GamificationProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<GamificationProfile>;
  const xp = typeof r.xp === "number" ? r.xp : 0;
  const level =
    r.level && typeof r.level === "object" && typeof r.level.number === "number"
      ? r.level
      : levelForXp(xp);
  return {
    athlete: typeof r.athlete === "number" ? r.athlete : null,
    athlete_name: typeof r.athlete_name === "string" ? r.athlete_name : "",
    category: typeof r.category === "string" ? r.category : null,
    xp,
    level,
    streak: {
      current: r.streak?.current ?? 0,
      best: r.streak?.best ?? 0,
      last_active_date: r.streak?.last_active_date ?? null,
      active_today: !!r.streak?.active_today,
    },
    badges: arr(r.badges),
    locked_badges: arr(r.locked_badges),
    active_challenges: arr(r.active_challenges),
    recent_events: arr(r.recent_events),
  };
}

export const METRIC_LABEL: Record<ChallengeMetric, string> = {
  sessions: "Sesiones de patadas",
  min_score: "Puntaje mínimo",
  practice_days: "Días de práctica",
  attendance_days: "Días de asistencia",
  poomsae_segments: "Segmentos de Poomsae",
};

export const PERIOD_LABEL: Record<LeaderboardPeriod, string> = {
  week: "Semana",
  month: "Mes",
  all: "Todo",
};

export const SOURCE_LABEL: Record<string, string> = {
  attendance: "Asistencia",
  tech_eval: "Evaluación técnica",
  technical_evaluation: "Evaluación técnica",
  poomsae: "Poomsae",
  practice: "Práctica",
  practice_log: "Práctica",
  challenge: "Reto",
  badge: "Insignia",
};

/** Fallback when /athlete-categories/ is unavailable (contract Req 3). */
export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { value: "preinfantil", label: "Preinfantiles" },
  { value: "infantil", label: "Infantiles" },
  { value: "cadete", label: "Cadetes" },
  { value: "juvenil", label: "Juveniles" },
  { value: "mayores", label: "Mayores (sénior)" },
];

export function categoryLabel(value: string | null | undefined, options = DEFAULT_CATEGORIES) {
  if (!value) return "Sin categoría";
  return options.find((o) => o.value === value)?.label ?? value;
}
