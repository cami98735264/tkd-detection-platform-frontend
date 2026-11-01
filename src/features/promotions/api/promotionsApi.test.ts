import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/http", () => ({ http: h }));

import { promotionFormData, promotionsApi } from "./promotionsApi";

beforeEach(() => {
  for (const fn of Object.values(h)) fn.mockReset().mockResolvedValue({});
});

describe("promotionsApi", () => {
  it("filters exams by athlete and result", async () => {
    await promotionsApi.listExams({ athleteId: 3, result: "approved" });
    expect(h.get).toHaveBeenCalledWith("/promotion-exams/?athlete_id=3&result=approved");
    await promotionsApi.listExams();
    expect(h.get).toHaveBeenLastCalledWith("/promotion-exams/");
  });

  it("finalizes and authorizes with the contract bodies", async () => {
    await promotionsApi.finalizeExam(7);
    expect(h.post).toHaveBeenCalledWith("/promotion-exams/7/finalize/", {});
    await promotionsApi.authorize(4, false);
    expect(h.post).toHaveBeenCalledWith("/belt-promotions/4/authorize/", { authorized: false });
  });

  it("registers promotions as JSON, or multipart when a scan is attached", async () => {
    await promotionsApi.createPromotion({ athlete: 1, to_belt: 2, promotion_date: "2026-10-01" });
    expect(h.post).toHaveBeenCalledWith("/belt-promotions/", {
      athlete: 1,
      from_belt: null,
      to_belt: 2,
      promotion_date: "2026-10-01",
      notes: "",
    });

    const file = new File(["x"], "d.pdf", { type: "application/pdf" });
    await promotionsApi.createPromotion({
      athlete: 1,
      from_belt: 1,
      to_belt: 2,
      promotion_date: "2026-10-01",
      diploma_file: file,
    });
    const [url, body, cfg] = h.post.mock.calls.at(-1)!;
    expect(url).toBe("/belt-promotions/");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("diploma_file")).toBe(file);
    expect((body as FormData).get("from_belt")).toBe("1");
    expect(cfg).toEqual({ headers: { "Content-Type": "multipart/form-data" } });
  });

  it("uploads scans under the `file` field", async () => {
    const file = new File(["x"], "d.png", { type: "image/png" });
    await promotionsApi.uploadScan(9, file);
    const [url, body] = h.post.mock.calls.at(-1)!;
    expect(url).toBe("/belt-promotions/9/upload/");
    expect((body as FormData).get("file")).toBe(file);
  });

  it("normalises permission lists (array or paginated)", async () => {
    h.get.mockResolvedValueOnce([{ athlete: 3, can_register: true }]);
    expect(await promotionsApi.myPermissions()).toEqual([{ athlete: 3, can_register: true }]);
    h.get.mockResolvedValueOnce({ count: 1, results: [{ id: 1 }] });
    expect(await promotionsApi.listPermissions(3)).toEqual([{ id: 1 }]);
    expect(h.get).toHaveBeenLastCalledWith("/diploma-permissions/?athlete_id=3&page_size=100");
  });

  it("falls back to the documented download paths", () => {
    expect(promotionsApi.diplomaUrl({ id: 5, diploma_url: null })).toBe(
      "/api/v1/belt-promotions/5/diploma/",
    );
    expect(promotionsApi.scanUrl({ id: 5, file_url: "/x/" })).toBe("/x/");
  });

  it("sorts belts by grade", async () => {
    h.get.mockResolvedValueOnce({
      results: [
        { id: 2, nombre: "B", grado: 2 },
        { id: 1, nombre: "A", grado: 1 },
      ],
    });
    expect((await promotionsApi.belts()).map((b) => b.id)).toEqual([1, 2]);
  });

  it("builds the multipart body without empty optionals", () => {
    const fd = promotionFormData({ athlete: 1, to_belt: 2, promotion_date: "2026-01-01" });
    expect(fd.has("from_belt")).toBe(false);
    expect(fd.has("notes")).toBe(false);
  });
});
