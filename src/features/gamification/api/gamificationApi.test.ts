import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/http", () => ({ http: h }));

import { gamificationApi } from "./gamificationApi";

beforeEach(() => {
  for (const fn of Object.values(h)) fn.mockReset().mockResolvedValue({});
});

describe("gamificationApi", () => {
  it("requests a child's profile and normalises it", async () => {
    h.get.mockResolvedValueOnce({ xp: 320 });
    const p = await gamificationApi.profile(4);
    expect(h.get).toHaveBeenCalledWith("/gamification/profile/?athlete_id=4");
    expect(p.level.name).toBe("Practicante");
    await gamificationApi.profile();
    expect(h.get).toHaveBeenLastCalledWith("/gamification/profile/");
  });

  it("builds leaderboard queries and keeps results", async () => {
    h.get.mockResolvedValueOnce({
      category: "cadete",
      period: "week",
      results: [{ rank: 1, athlete: 3, is_me: true }],
    });
    const lb = await gamificationApi.leaderboard({ category: "cadete", period: "week" });
    expect(h.get).toHaveBeenCalledWith("/gamification/leaderboard/?category=cadete&period=week");
    expect(lb.results[0].is_me).toBe(true);
    expect(lb.category).toBe("cadete");
  });

  it("logs a practice and generates weekly challenges", async () => {
    await gamificationApi.logPractice({ date: "2026-11-01", minutes: 30, activity: "Poomsae" });
    expect(h.post).toHaveBeenCalledWith("/gamification/practice-logs/", {
      date: "2026-11-01",
      minutes: 30,
      activity: "Poomsae",
    });
    h.post.mockResolvedValueOnce([{ id: 1 }]);
    expect(await gamificationApi.generateWeekly()).toEqual([{ id: 1 }]);
    expect(h.post).toHaveBeenLastCalledWith("/gamification/challenges/generate-weekly/", {});
  });

  it("lists active challenges", async () => {
    h.get.mockResolvedValueOnce({ results: [{ id: 2 }] });
    expect(await gamificationApi.challenges({ active: true })).toEqual([{ id: 2 }]);
    expect(h.get).toHaveBeenCalledWith("/gamification/challenges/?active=true&page_size=100");
  });

  it("falls back to the documented categories", async () => {
    h.get.mockRejectedValueOnce(new Error("404"));
    expect((await gamificationApi.categories()).map((c) => c.value)).toContain("cadete");
    h.get.mockResolvedValueOnce([{ value: "x", label: "X" }]);
    expect(await gamificationApi.categories()).toEqual([{ value: "x", label: "X" }]);
  });
});
