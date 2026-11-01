import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  axiosPost: vi.fn(),
}));
vi.mock("@/lib/download", () => ({ downloadFile: h.downloadFile }));
vi.mock("@/lib/http", () => ({
  http: { get: h.get, post: h.post, delete: h.del },
  axiosInstance: { post: h.axiosPost },
}));

import { athleteDocumentsApi, documentDownloadPath, fileSlug } from "./athleteDocumentsApi";

beforeEach(() => {
  vi.clearAllMocks();
  h.get.mockResolvedValue([]);
});

describe("athleteDocumentsApi", () => {
  it("lists an athlete's documents, optionally by type", async () => {
    h.get.mockResolvedValueOnce([{ id: 1 }]);
    await expect(athleteDocumentsApi.list(3)).resolves.toEqual([{ id: 1 }]);
    expect(h.get).toHaveBeenCalledWith("/athletes/3/documents/");
    await athleteDocumentsApi.list(3, "sports_insurance");
    expect(h.get).toHaveBeenLastCalledWith("/athletes/3/documents/?doc_type=sports_insurance");
  });

  it("accepts a paginated answer from an unpaginated endpoint", async () => {
    h.get.mockResolvedValueOnce({ count: 1, results: [{ id: 2 }] });
    await expect(athleteDocumentsApi.list(3)).resolves.toEqual([{ id: 2 }]);
    h.get.mockResolvedValueOnce({ unexpected: true });
    await expect(athleteDocumentsApi.certificates(3)).resolves.toEqual([]);
  });

  it("normalizes the checklist", async () => {
    h.get.mockResolvedValueOnce({
      athlete: 3,
      items: [{ doc_type: "medical_certificate" }],
      complete: false,
    });
    const res = await athleteDocumentsApi.checklist(3);
    expect(h.get).toHaveBeenCalledWith("/athletes/3/documents/checklist/");
    expect(res.items).toHaveLength(1);
    h.get.mockResolvedValueOnce({});
    await expect(athleteDocumentsApi.checklist(4)).resolves.toEqual({
      athlete: 4,
      items: [],
      complete: false,
    });
  });

  it("uploads multipart with only the filled optional fields", async () => {
    h.axiosPost.mockResolvedValue({ data: { id: 9 } });
    const file = new File(["%PDF"], "poliza.pdf", { type: "application/pdf" });
    const doc = await athleteDocumentsApi.upload(3, {
      doc_type: "sports_insurance",
      file,
      insurer: " SURA ",
      policy_number: "",
      valid_from: "2026-01-01",
    });
    expect(doc).toEqual({ id: 9 });
    const [url, form, cfg] = h.axiosPost.mock.calls[0];
    expect(url).toBe("/athletes/3/documents/");
    expect(cfg.headers["Content-Type"]).toBe("multipart/form-data");
    expect((form as FormData).get("doc_type")).toBe("sports_insurance");
    expect((form as FormData).get("file")).toBe(file);
    expect((form as FormData).get("insurer")).toBe("SURA");
    expect((form as FormData).get("valid_from")).toBe("2026-01-01");
    expect((form as FormData).has("policy_number")).toBe(false);
  });

  it("reviews, gets and deletes through the document endpoints", async () => {
    await athleteDocumentsApi.review(12, { status: "approved", review_notes: "ok" });
    expect(h.post).toHaveBeenCalledWith("/athlete-documents/12/review/", {
      status: "approved",
      review_notes: "ok",
    });
    await athleteDocumentsApi.get(12);
    expect(h.get).toHaveBeenCalledWith("/athlete-documents/12/");
    await athleteDocumentsApi.remove(12);
    expect(h.del).toHaveBeenCalledWith("/athlete-documents/12/");
  });

  it("downloads documents through authenticated URLs", async () => {
    await athleteDocumentsApi.download({
      id: 12,
      athlete: 3,
      doc_type: "other",
      status: "pending",
      download_url: "/api/v1/athlete-documents/12/download/",
      original_filename: "poliza.pdf",
    });
    expect(h.downloadFile).toHaveBeenCalledWith(
      "/api/v1/athlete-documents/12/download/",
      "poliza.pdf",
    );
    expect(documentDownloadPath({ id: 5, download_url: null })).toBe(
      "athlete-documents/5/download/",
    );
  });

  it("downloads the waiver template, CV and enrollment certificates", async () => {
    await athleteDocumentsApi.downloadWaiverTemplate(3);
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "athlete-documents/waiver-template/?athlete_id=3",
      "carta-exoneracion-responsabilidad.pdf",
    );
    await athleteDocumentsApi.downloadWaiverTemplate();
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "athlete-documents/waiver-template/",
      "carta-exoneracion-responsabilidad.pdf",
    );
    await athleteDocumentsApi.downloadResume(3, "Ana Gómez");
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "athletes/3/resume/",
      "hoja-de-vida-ana-gomez.pdf",
    );
    await athleteDocumentsApi.downloadConstancia(3, "Ana Gómez");
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "athletes/3/constancia/",
      "constancia-ana-gomez.pdf",
    );
    await athleteDocumentsApi.downloadConstancia(4);
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "athletes/4/constancia/",
      "constancia-deportista.pdf",
    );
    await athleteDocumentsApi.certificates(3);
    expect(h.get).toHaveBeenLastCalledWith("/athletes/3/certificates/");
    await athleteDocumentsApi.downloadCertificate({
      enrollment_id: 5,
      download_url: "/api/v1/enrollments/5/enrollment-certificate/",
    });
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "/api/v1/enrollments/5/enrollment-certificate/",
      "constancia-inscripcion-5.pdf",
    );
    await athleteDocumentsApi.downloadCertificate({ enrollment_id: 6, download_url: "" });
    expect(h.downloadFile).toHaveBeenLastCalledWith(
      "enrollments/6/enrollment-certificate/",
      "constancia-inscripcion-6.pdf",
    );
  });

  it("slugs names for filenames", () => {
    expect(fileSlug("  José Pérez Ñ ")).toBe("jose-perez-n");
    expect(fileSlug(undefined)).toBe("deportista");
  });
});
