import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({ config: { apiUrl: "", apiPrefix: "api/v1" } }));

import {
  formatClipTime,
  hasSequenceResults,
  movementPatch,
  movementsForSegment,
  normalizeMovementResults,
  normalizeMovements,
  normalizeSegmentResults,
  normalizeSequenceSummary,
  referenceVideoSrc,
  stepLabel,
  toMovementDraft,
  turnArrow,
  turnLabel,
  validateVideoFile,
} from "./sequence";
import { elementLabel, resolveVideo } from "./video";

const rawMovements = [
  {
    id: 12,
    number: 2,
    name: "Ap seogi · Momtong jireugi",
    segment: { id: 5, name: "Inicio" },
    stance: { id: 1, name: "Ap seogi" },
    hand: 7,
    hand_name: "Momtong jireugi",
    kick: null,
    turn_deg: 0,
    step: "forward",
    kihap: false,
  },
  {
    id: 11,
    number: 1,
    name: "Ap seogi · Arae makki (izquierda)",
    segment: 5,
    stance: 1,
    turn_deg: 90,
    step: "forward",
    kihap: true,
    hold: false,
  },
  { number: "x" },
  "garbage",
];

describe("movement script", () => {
  it("normalises FKs given as ids or summaries and sorts by number", () => {
    const m = normalizeMovements(rawMovements);
    expect(m.map((x) => x.number)).toEqual([1, 2]);
    expect(m[0]).toMatchObject({ id: 11, segment: 5, stance: 1, kihap: true, hold: false });
    expect(m[1]).toMatchObject({
      segment: 5,
      stance: 1,
      stance_name: "Ap seogi",
      hand: 7,
      hand_name: "Momtong jireugi",
      kick: null,
      hold: true,
    });
  });

  it("accepts paginated / wrapped bodies and anything else as empty", () => {
    expect(normalizeMovements({ results: rawMovements })).toHaveLength(2);
    expect(normalizeMovements({ movements: rawMovements })).toHaveLength(2);
    expect(normalizeMovements({ count: 0, results: [] })).toEqual([]);
    expect(normalizeMovements(null)).toEqual([]);
  });

  it("picks a segment's movements by movement_numbers, else by FK", () => {
    const m = normalizeMovements(rawMovements);
    expect(movementsForSegment(m, { id: 9, movement_numbers: [2] }).map((x) => x.number)).toEqual([
      2,
    ]);
    expect(movementsForSegment(m, { id: 5 })).toHaveLength(2);
    expect(movementsForSegment(m, { id: 6, movement_numbers: [] })).toHaveLength(0);
  });

  it("describes turns and steps in Spanish", () => {
    expect(turnLabel(90)).toBe("Giro 90° a la izquierda");
    expect(turnLabel(-90)).toBe("Giro 90° a la derecha");
    expect(turnLabel(180)).toMatch(/180°/);
    expect(turnLabel(-180)).toMatch(/180°/);
    expect(turnLabel(0)).toBe("Sin giro");
    expect(turnArrow(90)).toBe("↰");
    expect(turnArrow(-90)).toBe("↱");
    expect(turnArrow(null)).toBe("↑");
    expect(stepLabel("backward")).toBe("Retrocede");
    expect(stepLabel(null)).toBe("—");
    expect(stepLabel("weird")).toBe("weird");
  });

  it("builds a PATCH body with only the changed fields", () => {
    const [m] = normalizeMovements(rawMovements);
    const draft = toMovementDraft(m);
    expect(movementPatch(m, draft)).toEqual({});
    expect(movementPatch(m, { ...draft, turn_deg: -90, kihap: false, name: " Nuevo " })).toEqual({
      turn_deg: -90,
      kihap: false,
      name: "Nuevo",
    });
  });
});

describe("sequence results", () => {
  it("normalises movement_results and detects legacy attempts", () => {
    const results = normalizeMovementResults([
      {
        number: 2,
        name: "B",
        matched: false,
        time_s: null,
        score: null,
        turn: null,
        step: null,
        issues: ["Falta"],
      },
      {
        number: 1,
        name: "A",
        matched: true,
        time_s: 1.5,
        score: 80,
        turn: { expected: 90, measured: 85, passed: true },
        step: { expected: "forward", measured: "in_place", passed: false },
      },
    ]);
    expect(results.map((r) => r.number)).toEqual([1, 2]);
    expect(results[0].turn).toEqual({ expected: 90, measured: 85, passed: true });
    expect(results[0].issues).toEqual([]);
    expect(results[1].issues).toEqual(["Falta"]);
    expect(hasSequenceResults({ movement_results: undefined })).toBe(false);
    expect(hasSequenceResults({ movement_results: [{ number: 1 }] })).toBe(true);
  });

  it("normalises the sequence summary and segment results", () => {
    expect(normalizeSequenceSummary(null)).toBeNull();
    expect(normalizeSequenceSummary({ detected_movements: 3 })).toBeNull();
    expect(
      normalizeSequenceSummary({
        expected_movements: 6,
        detected_movements: 5,
        matched_in_order: 5,
        missing: [4],
        extra: 0,
        order_ok: true,
      }),
    ).toEqual({
      expected_movements: 6,
      detected_movements: 5,
      matched_in_order: 5,
      missing: [4],
      extra: 0,
      order_ok: true,
    });
    expect(
      normalizeSegmentResults([
        { segment: 3, segment_name: "Inicio", score: 75, matched: 5, expected: 6 },
        { segment: { id: 4, name: "Final" }, score: null },
      ]),
    ).toEqual([
      { segment: 3, segment_name: "Inicio", score: 75, matched: 5, expected: 6 },
      { segment: 4, segment_name: "Final", score: null, matched: null, expected: null },
    ]);
  });

  it("formats clip times and labels the new element scores", () => {
    expect(formatClipTime(65.4)).toBe("1:05");
    expect(formatClipTime(null)).toBe("—");
    expect(elementLabel("sequence")).toBe("Orden y número de movimientos");
    expect(elementLabel("direction")).toBe("Giros y desplazamientos");
    expect(elementLabel("stance")).toBe("Posiciones");
  });
});

describe("reference video", () => {
  it("resolves the endpoint path against the same-origin API", () => {
    expect(
      referenceVideoSrc({
        id: 3,
        has_reference_video: true,
        reference_video_url: "/api/v1/poomsae/3/reference-video/",
      }),
    ).toBe("/api/v1/poomsae/3/reference-video/");
    expect(referenceVideoSrc({ id: 3, has_reference_video: true, reference_video_url: null })).toBe(
      "/api/v1/poomsae/3/reference-video/",
    );
    expect(
      referenceVideoSrc({
        id: 3,
        has_reference_video: true,
        reference_video_url: "https://cdn.example/v.mp4",
      }),
    ).toBe("https://cdn.example/v.mp4");
    expect(
      referenceVideoSrc({ id: 3, has_reference_video: false, reference_video_url: "/x" }),
    ).toBeNull();
  });

  it("prefers the club upload over YouTube", () => {
    const base = {
      id: 3,
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      video_embed_url: null,
      video_source: "youtube" as const,
    };
    expect(resolveVideo(base).kind).toBe("youtube");
    expect(
      resolveVideo({
        ...base,
        has_reference_video: true,
        reference_video_url: "/api/v1/poomsae/3/reference-video/",
      }),
    ).toEqual({ kind: "file", src: "/api/v1/poomsae/3/reference-video/" });
  });

  it("validates video files by type and size", () => {
    const ok = new File(["x"], "forma.mp4", { type: "video/mp4" });
    expect(validateVideoFile(ok, 10)).toBeNull();
    const big = new File(["x".repeat(20)], "forma.webm", { type: "video/webm" });
    expect(validateVideoFile(big, 10)).toMatch(/máximo/);
    const bad = new File(["x"], "foto.png", { type: "image/png" });
    expect(validateVideoFile(bad, 10)).toMatch(/Formato/);
    const mov = new File(["x"], "clip.MOV", { type: "" });
    expect(validateVideoFile(mov, 10)).toBeNull();
  });
});
