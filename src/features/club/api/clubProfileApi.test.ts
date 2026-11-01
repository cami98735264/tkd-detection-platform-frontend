import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  axiosPatch: vi.fn(),
  fetchFile: vi.fn(),
}));
vi.mock("@/lib/http", () => ({
  http: { get: h.get, patch: h.patch },
  axiosInstance: { patch: h.axiosPatch },
}));
vi.mock("@/lib/download", () => ({ fetchFile: h.fetchFile }));

import { clubProfileApi } from "./clubProfileApi";

const body = {
  name: "Club Deportivo Warriors TKD Espinal",
  legal_rep_name: "Jonathan De La Rosa Moreno",
  include_signature: true,
  has_signature: true,
  signature_url: "/api/v1/club-profile/signature/",
  default_training_days: ["martes", "jueves", "sábado"],
  default_session_hours: "2.0",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clubProfileApi", () => {
  it("gets and normalizes the profile", async () => {
    h.get.mockResolvedValueOnce(body);
    const profile = await clubProfileApi.get();
    expect(h.get).toHaveBeenCalledWith("/club-profile/");
    expect(profile.name).toBe(body.name);
    expect(profile.short_name).toBe("");
    expect(profile.has_signature).toBe(true);
    // A paginated/empty body never crashes the page.
    h.get.mockResolvedValueOnce({ count: 0, results: [] });
    await expect(clubProfileApi.get()).resolves.toMatchObject({
      name: "",
      has_signature: false,
      include_signature: true,
      default_training_days: [],
    });
  });

  it("patches JSON fields and removes the signature", async () => {
    h.patch.mockResolvedValue({ ...body, has_signature: false, signature_url: null });
    await clubProfileApi.update({ city: "Espinal, Tolima" });
    expect(h.patch).toHaveBeenCalledWith("/club-profile/", { city: "Espinal, Tolima" });
    const removed = await clubProfileApi.removeSignature();
    expect(h.patch).toHaveBeenLastCalledWith("/club-profile/", { remove_signature: true });
    expect(removed.has_signature).toBe(false);
  });

  it("uploads the signature as multipart", async () => {
    h.axiosPatch.mockResolvedValueOnce({ data: body });
    const file = new File(["png"], "firma.png", { type: "image/png" });
    const profile = await clubProfileApi.uploadSignature(file);
    const [url, form, cfg] = h.axiosPatch.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ];
    expect(url).toBe("/club-profile/");
    expect(form.get("signature")).toBe(file);
    expect(cfg.headers["Content-Type"]).toBe("multipart/form-data");
    expect(profile.has_signature).toBe(true);
  });

  it("fetches the signature through the authenticated endpoint", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    h.fetchFile.mockResolvedValue({ blob, filename: "firma.png" });
    await expect(clubProfileApi.fetchSignature()).resolves.toBe(blob);
    expect(h.fetchFile).toHaveBeenCalledWith("club-profile/signature/", "firma.png");
    await clubProfileApi.fetchSignature("/api/v1/club-profile/signature/");
    expect(h.fetchFile).toHaveBeenLastCalledWith("/api/v1/club-profile/signature/", "firma.png");
  });
});
