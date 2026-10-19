import { AxiosError, type AxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  config: { apiUrl: "", apiPrefix: "api/v1", mockAuth: false },
}));
vi.mock("@/features/auth/store/authStore", () => {
  const state = { clearSession: vi.fn(), setAuthenticated: vi.fn(), isAuthenticated: false };
  return { useAuthStore: { getState: () => state } };
});

import {
  downloadFile,
  fetchFile,
  filenameFromDisposition,
  resolveFileRequest,
} from "@/lib/download";
import { axiosInstance } from "@/lib/http";
import { ApiError } from "@/types/api";

let seen: AxiosRequestConfig[];

function serve(
  reply: (cfg: AxiosRequestConfig) => {
    status: number;
    data: unknown;
    headers?: Record<string, string>;
  },
) {
  // @ts-expect-error - function adapter
  axiosInstance.defaults.adapter = async (cfg: AxiosRequestConfig) => {
    seen.push(cfg);
    const { status, data, headers = {} } = reply(cfg);
    const response = { status, data, headers, config: cfg, statusText: "", request: {} };
    if (status >= 400)
      throw new AxiosError("Request failed", String(status), cfg as never, {}, response as never);
    return response;
  };
}

beforeEach(() => {
  seen = [];
});
afterEach(() => vi.restoreAllMocks());

describe("filenameFromDisposition", () => {
  it.each([
    ['attachment; filename="reporte.csv"', "reporte.csv"],
    ["attachment; filename=plain.csv", "plain.csv"],
    ["attachment; filename*=UTF-8''asistencia%20octubre.csv", "asistencia octubre.csv"],
    [undefined, null],
  ])("%s -> %s", (header, expected) => {
    expect(filenameFromDisposition(header)).toBe(expected);
  });
});

describe("resolveFileRequest", () => {
  it("keeps absolute URLs, maps root paths to the API origin, leaves relative paths on the API base", () => {
    expect(resolveFileRequest("https://x.test/a.pdf")).toEqual({ url: "https://x.test/a.pdf" });
    expect(resolveFileRequest("/api/v1/enrollments/3/certificate/")).toEqual({
      url: "/api/v1/enrollments/3/certificate/",
      baseURL: "",
    });
    expect(resolveFileRequest("reports/1/download/")).toEqual({ url: "reports/1/download/" });
  });
});

describe("fetchFile / downloadFile", () => {
  it("requests a blob with credentials and uses the server filename", async () => {
    serve(() => ({
      status: 200,
      data: new Blob(["a,b\n1,2\n"], { type: "text/csv" }),
      headers: { "content-disposition": 'attachment; filename="r-1.csv"' },
    }));
    const file = await fetchFile("reports/1/download/", "fallback.csv");

    expect(seen[0].responseType).toBe("blob");
    expect(seen[0].withCredentials).toBe(true);
    expect(seen[0].url).toBe("reports/1/download/");
    expect(file.filename).toBe("r-1.csv");
    expect(file.blob.size).toBe(8);
  });

  it("decodes a JSON error envelope delivered as a Blob", async () => {
    serve(() => ({
      status: 404,
      data: new Blob([JSON.stringify({ detail: "El reporte aún no está listo." })], {
        type: "application/json",
      }),
    }));
    const err = await fetchFile("reports/9/download/", "x.csv").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).userMessage).toBe("El reporte aún no está listo.");
  });

  it("saves through an object URL and a temporary link", async () => {
    serve(() => ({ status: 200, data: new Blob(["x"]) }));
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadFile("/api/v1/enrollments/2/certificate/", "certificado.pdf");

    expect(seen[0].baseURL).toBe("");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("certificado.pdf");
  });
});
