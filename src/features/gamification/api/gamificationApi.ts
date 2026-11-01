import { http } from "@/lib/http";
import { asList, toQuery } from "@/lib/list";

import { DEFAULT_CATEGORIES, normalizeProfile } from "../lib/levels";
import type {
  BadgeInfo,
  CategoryOption,
  Challenge,
  ChallengePayload,
  GamificationProfile,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  PracticeLog,
  PracticeLogPayload,
} from "../types";

export const gamificationApi = {
  profile: (athleteId?: number | null): Promise<GamificationProfile> =>
    http
      .get<unknown>(`/gamification/profile/${toQuery({ athlete_id: athleteId })}`)
      .then(normalizeProfile),

  leaderboard: (params: { category?: string | null; period: LeaderboardPeriod }) =>
    http
      .get<unknown>(
        `/gamification/leaderboard/${toQuery({ category: params.category, period: params.period })}`,
      )
      .then((d): Leaderboard => {
        const body = (d && typeof d === "object" ? d : {}) as Partial<Leaderboard>;
        return {
          category: body.category ?? params.category ?? null,
          period: body.period ?? params.period,
          results: asList<LeaderboardEntry>(d),
        };
      }),

  practiceLogs: (athleteId?: number | null) =>
    http
      .get<unknown>(`/gamification/practice-logs/${toQuery({ athlete_id: athleteId })}`)
      .then((d) => asList<PracticeLog>(d)),

  logPractice: (data: PracticeLogPayload) =>
    http.post<PracticeLog>("/gamification/practice-logs/", data),

  challenges: (params: { active?: boolean } = {}) =>
    http
      .get<unknown>(
        `/gamification/challenges/${toQuery({ active: params.active ? "true" : undefined, page_size: 100 })}`,
      )
      .then((d) => asList<Challenge>(d)),

  createChallenge: (data: ChallengePayload) =>
    http.post<Challenge>("/gamification/challenges/", data),

  updateChallenge: (id: number, data: Partial<ChallengePayload>) =>
    http.patch<Challenge>(`/gamification/challenges/${id}/`, data),

  deleteChallenge: (id: number) => http.delete(`/gamification/challenges/${id}/`),

  generateWeekly: () =>
    http
      .post<unknown>("/gamification/challenges/generate-weekly/", {})
      .then((d) => asList<Challenge>(d)),

  badges: () => http.get<unknown>("/gamification/badges/").then((d) => asList<BadgeInfo>(d)),

  /** Athlete categories (Req 3); falls back to the documented list. */
  categories: (): Promise<CategoryOption[]> =>
    http
      .get<unknown>("/athlete-categories/")
      .then((d) => {
        const list = asList<CategoryOption>(d).filter((c) => c && typeof c.value === "string");
        return list.length > 0 ? list : DEFAULT_CATEGORIES;
      })
      .catch(() => DEFAULT_CATEGORIES),
};
