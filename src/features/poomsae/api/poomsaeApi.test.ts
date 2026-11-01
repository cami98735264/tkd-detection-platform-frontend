import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/http", () => ({ http: h }));

import { attemptFormData, poomsaeApi } from "./poomsaeApi";

beforeEach(() => {
  h.get.mockReset().mockResolvedValue({});
  h.post.mockReset().mockResolvedValue({ id: 1, status: "processing" });
});

describe("poomsaeApi", () => {
  it("lists poomsae and techniques (unpaginated)", async () => {
    h.get.mockResolvedValueOnce([{ id: 1 }]);
    expect(await poomsaeApi.list()).toEqual([{ id: 1 }]);
    h.get.mockResolvedValueOnce([{ id: 2, element: "kick" }]);
    expect(await poomsaeApi.techniques("kick")).toHaveLength(1);
    expect(h.get).toHaveBeenLastCalledWith("/poomsae/techniques/?element=kick");
  });

  it("loads a detail for a chosen athlete", async () => {
    await poomsaeApi.get(3, 9);
    expect(h.get).toHaveBeenCalledWith("/poomsae/3/?athlete_id=9");
  });

  it("uploads a segment recording as multipart with a long timeout", async () => {
    const blob = new Blob(["v"], { type: "video/webm" });
    await poomsaeApi.createAttempt({ mode: "segment", segment: 4, athlete: 2, recording: blob });
    const [url, body, cfg] = h.post.mock.calls[0];
    expect(url).toBe("/poomsae/attempts/");
    const fd = body as FormData;
    expect(fd.get("mode")).toBe("segment");
    expect(fd.get("segment")).toBe("4");
    expect(fd.get("athlete")).toBe("2");
    expect((fd.get("recording") as File).name).toBe("intento.webm");
    expect(fd.has("landmarks")).toBe(false);
    expect(cfg).toMatchObject({
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
  });

  it("falls back to landmarks JSON for technique mode", () => {
    const fd = attemptFormData({
      mode: "technique",
      technique: 7,
      segment: 99,
      landmarks: [{ t: 0, landmarks: [{ x: 0.1, y: 0.2, z: 0 }] }],
    });
    expect(fd.get("technique")).toBe("7");
    expect(fd.has("segment")).toBe(false);
    expect(fd.has("athlete")).toBe(false);
    expect(JSON.parse(fd.get("landmarks") as string)[0].landmarks[0].x).toBe(0.1);
  });

  it("names mp4 recordings accordingly", () => {
    const fd = attemptFormData({
      mode: "segment",
      segment: 1,
      recording: new Blob(["v"], { type: "video/mp4" }),
    });
    expect((fd.get("recording") as File).name).toBe("intento.mp4");
  });

  it("filters attempts", async () => {
    await poomsaeApi.listAttempts({ athleteId: 2, segment: 5 });
    expect(h.get).toHaveBeenCalledWith("/poomsae/attempts/?athlete_id=2&segment=5");
    await poomsaeApi.getAttempt(8);
    expect(h.get).toHaveBeenLastCalledWith("/poomsae/attempts/8/");
  });
});
