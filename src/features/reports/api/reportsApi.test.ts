import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ downloadFile: vi.fn(), get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/download", () => ({ downloadFile: h.downloadFile }));
vi.mock("@/lib/http", () => ({ http: { get: h.get, post: h.post, delete: vi.fn() } }));

import { isReportInProgress, reportDownloadPath, reportsApi } from "./reportsApi";

beforeEach(() => vi.clearAllMocks());

describe("reportsApi", () => {
  it("generates through POST /reports/generate/", async () => {
    await reportsApi.generate({ title: "T", report_type: "attendance" });
    expect(h.post).toHaveBeenCalledWith("/reports/generate/", {
      title: "T",
      report_type: "attendance",
    });
  });

  it("lists with an optional status filter", async () => {
    await reportsApi.list(2, "processing");
    expect(h.get).toHaveBeenCalledWith("/reports/?page=2&status=processing");
  });

  it("downloads from the payload's download_url when present", async () => {
    await reportsApi.download({
      id: 3,
      title: "Asistencia octubre",
      download_url: "/api/v1/reports/3/download/",
    });
    expect(h.downloadFile).toHaveBeenCalledWith(
      "/api/v1/reports/3/download/",
      "Asistencia_octubre.csv",
    );
  });

  it("falls back to the contract endpoint when download_url is missing", async () => {
    await reportsApi.download({ id: 4, title: "  " });
    expect(h.downloadFile).toHaveBeenCalledWith(reportDownloadPath(4), "reporte-4.csv");
    expect(reportDownloadPath(4)).toBe("reports/4/download/");
  });

  it("treats pending and processing as in progress", () => {
    expect(isReportInProgress({ status: "pending" })).toBe(true);
    expect(isReportInProgress({ status: "processing" })).toBe(true);
    expect(isReportInProgress({ status: "completed" })).toBe(false);
    expect(isReportInProgress({ status: "failed" })).toBe(false);
  });
});
