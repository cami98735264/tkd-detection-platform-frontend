import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), axiosPatch: vi.fn() }));
vi.mock("@/lib/http", () => ({
  http: { get: h.get, post: h.post, patch: h.patch },
  axiosInstance: { patch: h.axiosPatch },
}));

import { attemptFormData, poomsaeApi } from "./poomsaeApi";

beforeEach(() => {
  h.get.mockReset().mockResolvedValue({});
  h.post.mockReset().mockResolvedValue({ id: 1, status: "processing" });
  h.patch.mockReset().mockResolvedValue({});
  h.axiosPatch.mockReset().mockResolvedValue({ data: { id: 3, has_reference_video: true } });
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

  it("uploads a full run-through with the poomsae id, the file name and a long timeout", async () => {
    const file = new File(["v"], "taegeuk.mov", { type: "video/quicktime" });
    await poomsaeApi.createAttempt({ mode: "full", poomsae: 3, segment: 9, recording: file });
    const [, body, cfg] = h.post.mock.calls[0];
    const fd = body as FormData;
    expect(fd.get("mode")).toBe("full");
    expect(fd.get("poomsae")).toBe("3");
    expect(fd.has("segment")).toBe(false);
    expect((fd.get("recording") as File).name).toBe("taegeuk.mov");
    expect(cfg.timeout).toBe(600000);
  });

  it("filters attempts by mode, poomsae and status", async () => {
    await poomsaeApi.listAttempts({ mode: "full", poomsae: 3, status: "completed", page: 2 });
    expect(h.get).toHaveBeenCalledWith(
      "/poomsae/attempts/?poomsae=3&mode=full&status=completed&page=2",
    );
  });

  it("reads and edits the movement script", async () => {
    h.get.mockResolvedValueOnce([
      { id: 1, number: 2 },
      { id: 2, number: 1 },
    ]);
    const m = await poomsaeApi.movements(3);
    expect(h.get).toHaveBeenCalledWith("/poomsae/3/movements/");
    expect(m.map((x) => x.number)).toEqual([1, 2]);
    h.patch.mockResolvedValueOnce({ id: 1, number: 2, turn_deg: -90 });
    const saved = await poomsaeApi.updateMovement(1, { turn_deg: -90 });
    expect(h.patch).toHaveBeenCalledWith("/poomsae/movements/1/", { turn_deg: -90 });
    expect(saved?.turn_deg).toBe(-90);
  });

  it("uploads and removes the club reference video", async () => {
    const file = new File(["v"], "ref.mp4", { type: "video/mp4" });
    expect(await poomsaeApi.uploadReferenceVideo(3, file)).toMatchObject({ id: 3 });
    const [url, body, cfg] = h.axiosPatch.mock.calls[0];
    expect(url).toBe("/poomsae/3/");
    expect(((body as FormData).get("reference_video") as File).name).toBe("ref.mp4");
    expect(cfg).toMatchObject({ headers: { "Content-Type": "multipart/form-data" } });
    expect(cfg.timeout).toBeGreaterThanOrEqual(120000);
    await poomsaeApi.removeReferenceVideo(3);
    expect(h.patch).toHaveBeenCalledWith("/poomsae/3/", { remove_reference_video: true });
    await poomsaeApi.updatePoomsae(3, { video_credit: "Kukkiwon" });
    expect(h.patch).toHaveBeenLastCalledWith("/poomsae/3/", { video_credit: "Kukkiwon" });
  });

  it("calls the calibration endpoints", async () => {
    h.get.mockResolvedValueOnce({ technique: 4, attempts: 2, criteria: [] });
    expect((await poomsaeApi.techniqueStats(4, "2026-10-01")).attempts).toBe(2);
    expect(h.get).toHaveBeenLastCalledWith("/poomsae/techniques/4/stats/?since=2026-10-01");
    h.post.mockResolvedValueOnce({ proposed: [], applied: false });
    await poomsaeApi.calibrate(4, { attempt_ids: [1, 2], tolerance: "strict", apply: false });
    expect(h.post).toHaveBeenLastCalledWith("/poomsae/techniques/4/calibrate/", {
      attempt_ids: [1, 2],
      tolerance: "strict",
      apply: false,
    });
    h.get.mockResolvedValueOnce([{ id: 5, created_at: "2026-10-01" }]);
    expect(await poomsaeApi.calibrations(4)).toHaveLength(1);
    expect(h.get).toHaveBeenLastCalledWith("/poomsae/techniques/4/calibrations/");
    await poomsaeApi.revertCalibration(4, 5);
    expect(h.post).toHaveBeenLastCalledWith("/poomsae/techniques/4/calibrations/5/revert/");
  });
});
