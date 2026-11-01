import { describe, expect, it } from "vitest";

import type { EvaluationResults } from "@/features/technical-evaluation/api/technicalEvaluationApi";

import {
  confidenceLevel,
  deriveStatus,
  formatRange,
  formatWithUnit,
  gaugeGeometry,
  getMetricDetails,
  getQualitySummary,
  getSortedRecommendations,
} from "./kickFeedback";

const base: EvaluationResults = {
  angle: 170,
  height: 150,
  speed: 6,
  stability: 90,
  overall_score: 80,
  recommendations: "",
};

describe("kickFeedback", () => {
  it("formats values with units", () => {
    expect(formatWithUnit(175.0, "°")).toBe("175°");
    expect(formatWithUnit(160.84, "cm")).toBe("160.84 cm");
    expect(formatWithUnit(5.8, "")).toBe("5.8");
    expect(formatRange(165, 180, "°")).toBe("165–180°");
    expect(formatRange(6, 9, "m/s")).toBe("6–9 m/s");
  });

  it("derives the contract status", () => {
    expect(deriveStatus({ value: 170, optimal_min: 165, optimal_max: 180, score: 10 })).toBe(
      "optimal",
    );
    expect(deriveStatus({ value: 150, optimal_min: 165, optimal_max: 180, score: 70 })).toBe(
      "close",
    );
    expect(deriveStatus({ value: 100, optimal_min: 165, optimal_max: 180, score: 69 })).toBe(
      "needs_work",
    );
  });

  it("returns null for legacy payloads and fills defaults for partial metrics", () => {
    expect(getMetricDetails(base)).toBeNull();
    expect(getMetricDetails(null)).toBeNull();
    expect(getMetricDetails({ ...base, metrics: [] })).toBeNull();

    const partial = {
      ...base,
      metrics: [{ key: "speed", value: 3, optimal: 6, score: 40, status: "weird" }],
    } as unknown as EvaluationResults;
    const [m] = getMetricDetails(partial)!;
    expect(m).toMatchObject({
      key: "speed",
      label: "Velocidad",
      unit: "m/s",
      optimal_min: 6,
      optimal_max: 6,
      ratio: 0.5,
      status: "needs_work",
      status_display: "Por mejorar",
      description: "",
    });
  });

  it("sorts recommendations by priority, keeping input order for ties", () => {
    const results = {
      ...base,
      detailed_recommendations: [
        { metric: "angle", priority: "low", title: "L", detail: "", drills: [] },
        { metric: "speed", priority: "high", title: "H1", detail: "", drills: ["a", 3] },
        { metric: "height", priority: "unknown", title: "U", detail: "" },
        { metric: "speed", priority: "medium", title: "M", detail: "", drills: [] },
        { metric: "speed", priority: "high", title: "H2", detail: "", drills: [] },
        { metric: "speed", priority: "high", title: "", detail: "" },
      ],
    } as unknown as EvaluationResults;
    const sorted = getSortedRecommendations(results);
    expect(sorted.map((r) => r.title)).toEqual(["H1", "H2", "M", "L", "U"]);
    expect(sorted[0].drills).toEqual(["a"]);
    expect(sorted[4].drills).toEqual([]);
    expect(getSortedRecommendations(base)).toEqual([]);
  });

  it("places the gauge markers within 0–100 around the optimal band", () => {
    const g = gaugeGeometry({ value: 173.3, optimal: 175, optimal_min: 165, optimal_max: 180 });
    expect(g.bandStart).toBeGreaterThan(0);
    expect(g.bandEnd).toBeLessThan(100);
    expect(g.value).toBeGreaterThan(g.bandStart);
    expect(g.value).toBeLessThan(g.optimal);

    const below = gaugeGeometry({ value: 0, optimal: 7, optimal_min: 6, optimal_max: 9 });
    expect(below.value).toBe(0);
    expect(below.bandStart).toBeGreaterThan(below.value);

    const flat = gaugeGeometry({ value: 5, optimal: 5, optimal_min: 5, optimal_max: 5 });
    expect(flat.value).toBeCloseTo(50);
  });
});

describe("getQualitySummary", () => {
  const base = {
    angle: 1,
    height: 1,
    speed: 1,
    stability: 1,
    overall_score: 50,
    recommendations: "",
  };
  it("returns null without a v2 report", () => {
    expect(getQualitySummary(base)).toBeNull();
    expect(getQualitySummary({ ...base, analysis_quality: null })).toBeNull();
  });
  it("normalises confidence levels and drops malformed entries", () => {
    const q = getQualitySummary({
      ...base,
      analysis_quality: {
        version: 2,
        confidence: 0.6,
        warnings: ["ok", "", 3 as unknown as string],
        kicks: [{ time_s: 1, overall: 70 } as never, null as never, { time_s: "x" } as never],
        kick_used: { time_s: 1, leg: "left", index: 1 },
        real_fps: 24,
      },
    });
    expect(q).toMatchObject({ level: "medium", warnings: ["ok"], usedIndex: 1, realFps: 24 });
    expect(q?.kicks).toHaveLength(1);
    expect(confidenceLevel(0.8)).toBe("high");
    expect(confidenceLevel(0.49)).toBe("low");
  });
});
