// Req 7 — Gamification (apps.gamification). See docs/listado-1-requirements-contract.md.

export interface LevelInfo {
  number: number;
  name: string;
  min_xp: number;
  /** null at the top level. */
  next_min_xp: number | null;
  /** 0–1 progress towards the next level. */
  progress: number;
}

export interface StreakInfo {
  current: number;
  best: number;
  last_active_date: string | null;
  active_today: boolean;
}

export interface BadgeInfo {
  code: string;
  name: string;
  description: string;
  icon: string;
  xp_reward?: number;
  earned_at?: string | null;
}

export type ChallengeKind = "kick" | "weekly";
export type ChallengeMetric =
  "sessions" | "min_score" | "practice_days" | "attendance_days" | "poomsae_segments";

export interface ActiveChallenge {
  id: number;
  title: string;
  kind: ChallengeKind;
  metric: ChallengeMetric;
  target_value: number;
  value: number;
  completed: boolean;
  end_date: string | null;
  xp_reward: number;
}

export interface XpEventInfo {
  date: string;
  source: string;
  points: number;
  description: string;
}

export interface GamificationProfile {
  athlete: number | null;
  athlete_name: string;
  category: string | null;
  xp: number;
  level: LevelInfo;
  streak: StreakInfo;
  badges: BadgeInfo[];
  locked_badges: BadgeInfo[];
  active_challenges: ActiveChallenge[];
  recent_events: XpEventInfo[];
}

export type LeaderboardPeriod = "week" | "month" | "all";

export interface LeaderboardEntry {
  rank: number;
  athlete: number;
  athlete_name: string;
  category: string | null;
  xp: number;
  level: number;
  streak: number;
  badges: number;
  is_me: boolean;
}

export interface Leaderboard {
  category: string | null;
  period: LeaderboardPeriod;
  results: LeaderboardEntry[];
}

export interface PracticeLog {
  id: number;
  athlete: number;
  date: string;
  minutes: number;
  activity: string;
  notes: string;
}

export interface PracticeLogPayload {
  athlete?: number;
  date: string;
  minutes: number;
  activity: string;
  notes?: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  kind: ChallengeKind;
  kick_type: string | null;
  metric: ChallengeMetric;
  target_value: number;
  start_date: string;
  end_date: string;
  category: string | null;
  xp_reward: number;
  active: boolean;
  my_progress?: { value: number; completed: boolean; completed_at?: string | null } | null;
}

export type ChallengePayload = Omit<Challenge, "id" | "my_progress">;

export interface CategoryOption {
  value: string;
  label: string;
}
