import { describe, expect, it } from "vitest";

import {
  attemptUsesTechnique,
  formatPassRate,
  formatRange,
  formatValue,
  normalizeCalibrations,
  normalizeProposal,
  normalizeStats,
} from "./calibration";

describe("calibration normalisers", () => {
  it("normalises technique stats and tolerates the wrong shape", () => {
    expect(normalizeStats({ count: 0, results: [] })).toEqual({
      technique: null,
      attempts: 0,
      criteria: [],
    });
    const s = normalizeStats({
      technique: 4,
      attempts: "12",
      criteria: [
        {
          key: "knee",
          label: "Rodilla",
          min: 90,
          max: 120,
          unit: "deg",
          n: 10,
          mean: 101,
          p10: 92,
          p50: 100,
          p90: 115,
          pass_rate: 0.8,
        },
        { label: "sin clave" },
      ],
    });
    expect(s.technique).toBe(4);
    expect(s.attempts).toBe(12);
    expect(s.criteria).toHaveLength(1);
    expect(s.criteria[0]).toMatchObject({ key: "knee", p50: 100, pass_rate: 0.8 });
  });

  it("normalises a calibrate proposal ([min,max] or {min,max})", () => {
    const p = normalizeProposal({
      proposed: [
        {
          key: "knee",
          label: "Rodilla",
          unit: "deg",
          current: [90, 120],
          proposed: { min: 85, max: 125 },
          samples: 3,
        },
      ],
      applied: true,
    });
    expect(p.applied).toBe(true);
    expect(p.proposed[0].current).toEqual([90, 120]);
    expect(p.proposed[0].proposed).toEqual([85, 125]);
    expect(normalizeProposal("x")).toEqual({ proposed: [], applied: false });
  });

  it("normalises the history newest first", () => {
    const h = normalizeCalibrations({
      results: [
        {
          id: 1,
          created_at: "2026-10-01T00:00:00Z",
          created_by: { full_name: "Maestro" },
          attempt_ids: [3, "4"],
          previous_criteria: [],
          new_criteria: [{ key: "knee", label: "Rodilla", min: 85, max: 125, unit: "deg" }],
        },
        { id: 2, created_at: "2026-10-05T00:00:00Z", created_by_name: "Otro", reverted_at: "x" },
        { nope: true },
      ],
    });
    expect(h.map((c) => c.id)).toEqual([2, 1]);
    expect(h[0]).toMatchObject({ created_by_name: "Otro", reverted: true });
    expect(h[1]).toMatchObject({
      created_by_name: "Maestro",
      attempt_ids: [3, 4],
      reverted: false,
    });
    expect(h[1].new_criteria[0]).toMatchObject({ min: 85, max: 125 });
  });

  it("formats ranges, values and pass rates", () => {
    expect(formatRange(90, 120, "deg")).toBe("90°–120°");
    expect(formatRange(0.3, null, "ratio")).toBe("≥ 0.3");
    expect(formatRange(null, 2, "count")).toBe("≤ 2");
    expect(formatRange(null, null)).toBe("—");
    expect(formatValue(101.456, "deg")).toBe("101.46°");
    expect(formatValue(null)).toBe("—");
    expect(formatPassRate(0.8)).toBe("80 %");
    expect(formatPassRate(65)).toBe("65 %");
    expect(formatPassRate(null)).toBe("—");
  });

  it("matches attempts that include a technique", () => {
    const t = { id: 4, code: "ap_kubi" };
    expect(attemptUsesTechnique({ mode: "technique", technique: 4, criteria_results: [] }, t)).toBe(
      true,
    );
    expect(attemptUsesTechnique({ mode: "technique", technique: 5, criteria_results: [] }, t)).toBe(
      false,
    );
    const crit = (key: string) => ({ key, label: "", value: 1, expected: null, passed: true });
    expect(
      attemptUsesTechnique(
        { mode: "segment", technique: null, criteria_results: [crit("3.ap_kubi.knee")] },
        t,
      ),
    ).toBe(true);
    expect(
      attemptUsesTechnique(
        { mode: "full", technique: null, criteria_results: [crit("arae_makki.arm")] },
        t,
      ),
    ).toBe(false);
    expect(attemptUsesTechnique({ mode: "full", technique: null, criteria_results: null }, t)).toBe(
      false,
    );
  });
});
