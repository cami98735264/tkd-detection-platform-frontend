import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, type AxiosRequestConfig } from "axios";

vi.mock("@/config/env", () => ({
  config: { apiUrl: "http://test", apiPrefix: "api/v1", mockAuth: false },
}));
vi.mock("@/features/auth/store/authStore", () => {
  const state = { clearSession: vi.fn(), setAuthenticated: vi.fn(), isAuthenticated: false };
  return { useAuthStore: { getState: () => state } };
});

import { http, axiosInstance } from "@/lib/http";
import { ApiError } from "@/types/api";
import { useAuthStore } from "@/features/auth/store/authStore";

const authState = useAuthStore.getState() as ReturnType<typeof useAuthStore.getState> & {
  isAuthenticated: boolean;
};
const clearSession = vi.mocked(authState.clearSession);

/** Clear every cookie so jsdom's document.cookie starts empty between tests. */
function clearCookies() {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
}

type Reply = { status: number; data?: unknown; headers?: Record<string, string> };

/** Install a fake adapter so the REAL interceptor logic runs without a network. */
function setAdapter(handler: (config: AxiosRequestConfig) => Reply) {
  // @ts-expect-error - axios adapter typing is loose; a function adapter is valid.
  axiosInstance.defaults.adapter = async (config: AxiosRequestConfig) => {
    const { status, data = {}, headers = {} } = handler(config);
    const response = { data, status, statusText: "", headers, config, request: {} };
    if (status >= 400) {
      throw new AxiosError("Request failed", String(status), config as never, {}, response as never);
    }
    return response;
  };
}

beforeEach(() => {
  clearSession.mockReset();
  authState.isAuthenticated = false;
  clearCookies();
});

describe("http 401 refresh (contract §0/§7 note 7)", () => {
  it("refreshes once and retries; concurrent 401s share a single refresh", async () => {
    const seen: Record<string, number> = {};
    let refreshCount = 0;
    setAdapter((config) => {
      const url = config.url ?? "";
      if (url === "/auth/refresh/") {
        refreshCount += 1;
        return { status: 200, data: {} };
      }
      seen[url] = (seen[url] ?? 0) + 1;
      return seen[url] === 1 ? { status: 401, data: { detail: "x" } } : { status: 200, data: { ok: url } };
    });

    const [a, b] = await Promise.all([http.get("/p1"), http.get("/p2")]);
    expect(a).toEqual({ ok: "/p1" });
    expect(b).toEqual({ ok: "/p2" });
    expect(refreshCount).toBe(1); // single-flight
  });

  it("clears the session and rejects with the Spanish message when refresh fails", async () => {
    setAdapter((config) => ({ status: 401, data: { detail: config.url } }));

    await expect(http.get("/protected")).rejects.toMatchObject({
      status: 401,
      body: { detail: "Sesión expirada. Por favor ingresá de nuevo." },
    });
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("never refreshes for auth endpoints (login/me/refresh are exempt)", async () => {
    let refreshCount = 0;
    setAdapter((config) => {
      if ((config.url ?? "").includes("/auth/refresh")) {
        refreshCount += 1;
        return { status: 200, data: {} };
      }
      return { status: 401, data: { detail: "nope" } };
    });

    await expect(http.get("/auth/me/")).rejects.toBeInstanceOf(ApiError);
    expect(refreshCount).toBe(0);
  });
});

describe("http error normalisation (contract §2)", () => {
  it("populates ApiError.retryAfter from the Retry-After header on 429", async () => {
    setAdapter(() => ({
      status: 429,
      data: { success: false, data: null, error: { code: "throttled", message: "Too many" } },
      headers: { "retry-after": "42" },
    }));

    try {
      await http.post("/auth/password/reset/");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(429);
      expect(e.isThrottled).toBe(true);
      expect(e.retryAfter).toBe(42);
    }
  });
});

describe("http proactive refresh (lapsed access token on AllowAny endpoints)", () => {
  const nowSec = () => Math.floor(Date.now() / 1000);

  it("refreshes BEFORE the request when the access token has lapsed (no 401 needed)", async () => {
    authState.isAuthenticated = true;
    // Companion cookie absent ⇒ access token already gone. A real AllowAny
    // endpoint would NOT 401 here, so only a proactive refresh recovers it.
    let refreshCount = 0;
    const order: string[] = [];
    setAdapter((config) => {
      const url = config.url ?? "";
      order.push(url);
      if (url === "/auth/refresh/") {
        refreshCount += 1;
        // Refresh mints a fresh companion cookie, as the backend would.
        document.cookie = `access_token_expires_at=${nowSec() + 900}; path=/`;
        return { status: 200, data: {} };
      }
      return { status: 200, data: { ok: url } };
    });

    const res = await http.post("/support/contact/", { subject: "s", message: "m" });
    expect(res).toEqual({ ok: "/support/contact/" });
    expect(refreshCount).toBe(1);
    // Refresh happened first, then the original request.
    expect(order).toEqual(["/auth/refresh/", "/support/contact/"]);
  });

  it("refreshes when the companion cookie is within the skew window", async () => {
    authState.isAuthenticated = true;
    document.cookie = `access_token_expires_at=${nowSec() + 5}; path=/`; // expires in 5s (< 30s skew)
    let refreshCount = 0;
    setAdapter((config) => {
      if ((config.url ?? "") === "/auth/refresh/") {
        refreshCount += 1;
        document.cookie = `access_token_expires_at=${nowSec() + 900}; path=/`;
        return { status: 200, data: {} };
      }
      return { status: 200, data: { ok: true } };
    });

    await http.get("/notifications/");
    expect(refreshCount).toBe(1);
  });

  it("does NOT refresh when the token is comfortably valid", async () => {
    authState.isAuthenticated = true;
    document.cookie = `access_token_expires_at=${nowSec() + 600}; path=/`; // 10 min left
    let refreshCount = 0;
    setAdapter((config) => {
      if ((config.url ?? "") === "/auth/refresh/") refreshCount += 1;
      return { status: 200, data: { ok: true } };
    });

    await http.get("/notifications/");
    expect(refreshCount).toBe(0);
  });

  it("does NOT refresh for a genuinely anonymous user (nothing to refresh)", async () => {
    authState.isAuthenticated = false; // never logged in
    let refreshCount = 0;
    setAdapter((config) => {
      if ((config.url ?? "") === "/auth/refresh/") refreshCount += 1;
      return { status: 200, data: { ok: true } };
    });

    // Anonymous contact-form submit with an explicit email — single round-trip.
    await http.post("/support/contact/", { email: "a@b.com", subject: "s", message: "m" });
    expect(refreshCount).toBe(0);
  });
});
