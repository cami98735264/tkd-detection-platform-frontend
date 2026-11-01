import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  challengePercent,
  levelForXp,
  levelProgress,
  normalizeProfile,
} from "./levels";

describe("levelForXp", () => {
  it("maps XP onto the contract thresholds", () => {
    expect(levelForXp(0)).toMatchObject({ number: 1, name: "Principiante", next_min_xp: 100 });
    expect(levelForXp(420)).toMatchObject({ number: 3, min_xp: 300, next_min_xp: 600 });
    expect(levelForXp(420).progress).toBeCloseTo(0.4);
    expect(levelForXp(5000)).toMatchObject({ number: 7, next_min_xp: null, progress: 1 });
    expect(levelForXp(-10).number).toBe(1);
  });
});

describe("levelProgress", () => {
  it("uses the server progress ratio", () => {
    const level = { number: 3, name: "Practicante", min_xp: 300, next_min_xp: 600, progress: 0.4 };
    expect(levelProgress(level, 420)).toEqual({ percent: 40, remaining: 180, isMax: false });
  });

  it("falls back to XP when progress is missing and caps at the top level", () => {
    const level = { number: 2, name: "Aprendiz", min_xp: 100, next_min_xp: 300, progress: NaN };
    expect(levelProgress(level, 200).percent).toBe(50);
    expect(levelProgress({ ...level, next_min_xp: null }, 9999)).toEqual({
      percent: 100,
      remaining: 0,
      isMax: true,
    });
  });
});

describe("challengePercent", () => {
  it("clamps to 0–100", () => {
    expect(challengePercent(1, 3)).toBe(33);
    expect(challengePercent(5, 3)).toBe(100);
    expect(challengePercent(0, 0)).toBe(0);
  });
});

describe("normalizeProfile", () => {
  it("fills safe defaults for an unexpected body", () => {
    const p = normalizeProfile({ id: 1, full_name: "x" });
    expect(p.xp).toBe(0);
    expect(p.level.number).toBe(1);
    expect(p.badges).toEqual([]);
    expect(p.streak).toEqual({ current: 0, best: 0, last_active_date: null, active_today: false });
  });

  it("keeps a valid body", () => {
    const p = normalizeProfile({
      athlete: 3,
      athlete_name: "Ana",
      xp: 120,
      streak: { current: 2, best: 5, last_active_date: "2026-10-31", active_today: true },
      badges: [{ code: "streak_3" }],
    });
    expect(p.level.number).toBe(2);
    expect(p.streak.best).toBe(5);
    expect(p.badges).toHaveLength(1);
  });
});

describe("categoryLabel", () => {
  it("labels known categories", () => {
    expect(categoryLabel("cadete")).toBe("Cadetes");
    expect(categoryLabel(null)).toBe("Sin categoría");
    expect(categoryLabel("otra")).toBe("otra");
  });
});
