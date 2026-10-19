import { AxiosError, type AxiosRequestConfig } from "axios";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  config: { apiUrl: "http://test", apiPrefix: "api/v1", mockAuth: false },
}));
vi.mock("@/features/auth/store/authStore", () => {
  const state = { clearSession: vi.fn(), setAuthenticated: vi.fn(), isAuthenticated: false };
  return { useAuthStore: { getState: () => state } };
});

import { FeedbackContext, type FeedbackContextType } from "@/feedback/FeedbackContext";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useAuthStore } from "@/features/auth/store/authStore";
import { axiosInstance, http } from "@/lib/http";
import {
  NETWORK_ERROR_MESSAGE,
  normalizeHttpError,
  onHttpError,
  type HttpErrorEvent,
} from "@/lib/httpErrors";
import { ApiError } from "@/types/api";

const authState = useAuthStore.getState() as unknown as {
  isAuthenticated: boolean;
  clearSession: ReturnType<typeof vi.fn>;
};

type Outcome =
  | { status: number; data?: unknown; headers?: Record<string, string> }
  | { network: true }
  | { timeout: true };

function setAdapter(handler: (config: AxiosRequestConfig) => Outcome) {
  // @ts-expect-error - a function adapter is valid at runtime.
  axiosInstance.defaults.adapter = async (config: AxiosRequestConfig) => {
    const outcome = handler(config);
    if ("network" in outcome) {
      throw new AxiosError("Network Error", "ERR_NETWORK", config as never, {});
    }
    if ("timeout" in outcome) {
      throw new AxiosError("timeout of 10000ms exceeded", "ECONNABORTED", config as never, {});
    }
    const { status, data = {}, headers = {} } = outcome;
    const response = { data, status, statusText: "", headers, config, request: {} };
    if (status >= 400) {
      throw new AxiosError(
        "Request failed",
        String(status),
        config as never,
        {},
        response as never,
      );
    }
    return response;
  };
}

let events: HttpErrorEvent[];
let unsubscribe: () => void;

beforeEach(() => {
  events = [];
  unsubscribe = onHttpError((e) => events.push(e));
  authState.isAuthenticated = false;
  authState.clearSession.mockReset();
});

afterEach(() => unsubscribe());

describe("normalizeHttpError", () => {
  it("maps a request without response to a status-0 network ApiError", () => {
    const err = normalizeHttpError(new AxiosError("Network Error", "ERR_NETWORK", {} as never));
    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect(e.status).toBe(0);
    expect(e.isNetworkError).toBe(true);
    expect(e.code).toBe("network_error");
    expect(e.userMessage).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("maps axios timeouts to code=timeout", () => {
    const e = normalizeHttpError(
      new AxiosError("timeout", "ECONNABORTED", {} as never),
    ) as ApiError;
    expect(e.code).toBe("timeout");
    expect(e.userMessage).toMatch(/tardó demasiado/);
  });

  it("keeps the backend envelope and Retry-After", () => {
    const response = {
      status: 429,
      data: { error: { code: "throttled", message: "Too many" } },
      headers: { "retry-after": "7" },
    };
    const e = normalizeHttpError(
      new AxiosError("x", "429", {} as never, {}, response as never),
    ) as ApiError;
    expect(e.status).toBe(429);
    expect(e.retryAfter).toBe(7);
    expect(e.code).toBe("throttled");
  });

  it("uses short text bodies (e.g. an HTML-less 502 from the edge) as the detail", () => {
    const response = {
      status: 503,
      data: "BACKEND_HOST / ORIGIN_SECRET is not configured",
      headers: {},
    };
    const e = normalizeHttpError(
      new AxiosError("x", "503", {} as never, {}, response as never),
    ) as ApiError;
    expect(e.body.detail).toContain("not configured");
  });

  it("passes non-axios errors and existing ApiErrors through", () => {
    const plain = new Error("boom");
    expect(normalizeHttpError(plain)).toBe(plain);
    const api = new ApiError(400, { detail: "x" });
    expect(normalizeHttpError(api)).toBe(api);
  });
});

describe("global HTTP error notifications", () => {
  it("publishes network failures once and marks the error as notified", async () => {
    setAdapter(() => ({ network: true }));
    const err = await http.get("/athletes/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).notified).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "network", title: "Sin conexión", status: 0 });
  });

  it.each([
    [500, "server"],
    [503, "server"],
    [403, "forbidden"],
    [429, "throttled"],
  ] as const)("publishes HTTP %i as %s", async (status, kind) => {
    setAdapter(() => ({ status, data: { detail: "nope" } }));
    await http.post("/x/").catch(() => undefined);
    expect(events.map((e) => e.kind)).toEqual([kind]);
  });

  it("leaves validation errors (400/404/409) to the caller", async () => {
    for (const status of [400, 404, 409]) {
      setAdapter(() => ({ status, data: { error: { code: "validation_error", message: "bad" } } }));
      const err = (await http.post("/x/").catch((e: unknown) => e)) as ApiError;
      expect(err.status).toBe(status);
      expect(err.notified).toBe(false);
    }
    expect(events).toHaveLength(0);
  });

  it("respects { silent: true }", async () => {
    setAdapter(() => ({ status: 500 }));
    await http.get("/x/", { silent: true }).catch(() => undefined);
    expect(events).toHaveLength(0);
  });

  it("announces an expired session once, only if the user was signed in", async () => {
    authState.isAuthenticated = true;
    authState.clearSession.mockImplementation(() => {
      authState.isAuthenticated = false;
    });
    setAdapter(() => ({ status: 401, data: { detail: "expired" } }));

    await Promise.all([
      http.get("/a/").catch(() => undefined),
      http.get("/b/").catch(() => undefined),
    ]);
    expect(events.filter((e) => e.kind === "session_expired")).toHaveLength(1);
  });

  it("does not announce 401s for anonymous users (e.g. the startup /auth/me/ probe)", async () => {
    setAdapter(() => ({ status: 401 }));
    await http.get("/auth/me/").catch(() => undefined);
    expect(events).toHaveLength(0);
  });
});

describe("useApiErrorHandler", () => {
  function setup() {
    const showToast = vi.fn();
    const ctx = { showToast } as unknown as FeedbackContextType;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FeedbackContext.Provider value={ctx}>{children}</FeedbackContext.Provider>
    );
    const { result } = renderHook(() => useApiErrorHandler(), { wrapper });
    return { showToast, handleError: result.current.handleError };
  }

  it("does not toast an error the global handler already showed", () => {
    const { showToast, handleError } = setup();
    const err = new ApiError(500, { detail: "x" });
    err.notified = true;
    handleError(err);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("toasts caller-level API errors with their user message", () => {
    const { showToast, handleError } = setup();
    handleError(
      new ApiError(400, { error: { code: "validation_error", message: "Campo requerido" } }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", variant: "warning" }),
    );
  });

  it("toasts unexpected non-API errors", () => {
    const { showToast, handleError } = setup();
    handleError(new Error("boom"));
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "boom", variant: "error" }),
    );
  });
});
