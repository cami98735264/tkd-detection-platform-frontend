import { describe, expect, it } from "vitest";

import { clampScore, failingChecks, previewExam, weightedScore } from "./examScore";

const defs = [
  { key: "documents_complete", label: "Documentos" },
  { key: "attendance_ok", label: "Asistencia" },
];

describe("weightedScore", () => {
  it("averages by weight and rounds to one decimal", () => {
    expect(
      weightedScore([
        { criterion: "Poomsae", score: 80, weight: 1 },
        { criterion: "Kyorugi", score: 60, weight: 2 },
      ]),
    ).toBe(66.7);
  });

  it("ignores non-positive weights and clamps scores", () => {
    expect(
      weightedScore([
        { criterion: "A", score: 150, weight: 1 },
        { criterion: "B", score: 10, weight: 0 },
      ]),
    ).toBe(100);
    expect(weightedScore([])).toBeNull();
    expect(weightedScore([{ criterion: "A", score: 50, weight: 0 }])).toBeNull();
  });

  it("clamps garbage to 0", () => {
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(-5)).toBe(0);
  });
});

describe("previewExam", () => {
  const scores = [{ criterion: "Poomsae", score: 75, weight: 1 }];

  it("approves when score passes and every check holds", () => {
    const p = previewExam(scores, 70, { documents_complete: true, attendance_ok: true }, defs);
    expect(p).toEqual({ score: 75, passesScore: true, checksOk: true, outcome: "approved" });
  });

  it("rejects on a failing admin check even with a good score", () => {
    const p = previewExam(scores, 70, { documents_complete: true, attendance_ok: false }, defs);
    expect(p.outcome).toBe("rejected");
    expect(failingChecks({ documents_complete: true }, defs)).toEqual(["attendance_ok"]);
  });

  it("rejects below the passing score", () => {
    const p = previewExam(scores, 80, { documents_complete: true, attendance_ok: true }, defs);
    expect(p.passesScore).toBe(false);
    expect(p.outcome).toBe("rejected");
  });

  it("uses the checks object keys when no definitions are known", () => {
    expect(failingChecks({ a: true, b: false }, [])).toEqual(["b"]);
  });
});
