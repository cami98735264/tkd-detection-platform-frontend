import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { config } from "@/config/env";
import { ApiError, type ApiErrorBody } from "@/types/api";
import { useAuthStore } from "@/features/auth/store/authStore";

// ---------------------------------------------------------------------------
// Axios instance
// JWT is stored in an httpOnly cookie — the browser attaches it automatically.
// withCredentials: true is the only requirement on the client side.
// baseURL includes the versioned prefix so all calls are versioned automatically.
// timeout caps worst-case hangs so a slow backend can't lock the UI indefinitely.
// ---------------------------------------------------------------------------

export const axiosInstance = axios.create({
  baseURL: `${config.apiUrl}/${config.apiPrefix}/`,
  withCredentials: true, // sends the httpOnly JWT cookie on every request
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------------------------------------
// Token refresh — single-flight
// A refresh can be triggered two ways: reactively (a protected endpoint 401s)
// or proactively (the request interceptor sees the access token is about to
// lapse). Both funnel through refreshTokens() so at most one /auth/refresh/ is
// ever in flight; concurrent callers share the same promise.
// ---------------------------------------------------------------------------

let refreshPromise: Promise<void> | null = null;

function refreshTokens(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      // The refresh endpoint reads the refresh_token cookie. `_retry` marks it
      // so the response interceptor never tries to refresh a failed refresh.
      .post(`/auth/refresh/`, null, { _retry: true } as AxiosRequestConfig & {
        _retry: boolean;
      })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Auth endpoints manage their own 401s (not logged in, bad creds, expired
// refresh) and must never trigger a refresh — that would loop.
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(`/auth/login`) ||
    url.includes(`/auth/me`) ||
    url.includes(`/auth/refresh`)
  );
}

// ---------------------------------------------------------------------------
// Proactive refresh — request interceptor
// The httpOnly access_token cookie lapses after ACCESS_TOKEN_LIFETIME. On a
// protected endpoint that surfaces as a 401 we recover from below, but on an
// AllowAny endpoint (e.g. /support/contact/) the backend just treats the
// request as anonymous — no 401, no recovery. To keep those working we read a
// non-httpOnly companion cookie (`access_token_expires_at`, epoch seconds) the
// backend sets alongside the token and refresh BEFORE sending once the token is
// expired or within the skew window. The companion cookie shares the token's
// max_age, so its absence means the token is already gone.
// ---------------------------------------------------------------------------

const PROACTIVE_REFRESH_SKEW_MS = 30_000;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function accessTokenNeedsRefresh(): boolean {
  const raw = readCookie("access_token_expires_at");
  if (!raw) return true; // companion cookie gone ⇒ access token already expired
  const expiresAtMs = Number(raw) * 1000;
  if (!Number.isFinite(expiresAtMs)) return true;
  return Date.now() >= expiresAtMs - PROACTIVE_REFRESH_SKEW_MS;
}

axiosInstance.interceptors.request.use(async (cfg) => {
  const url = cfg.url ?? "";
  const alreadyRetried = (cfg as AxiosRequestConfig & { _retry?: boolean })._retry;

  // Skip endpoints that manage their own auth, the refresh call itself, and any
  // request that just got a fresh token via the reactive path.
  if (isAuthEndpoint(url) || alreadyRetried) return cfg;

  // Only a believed-active session has anything to refresh. A genuine anonymous
  // user (isAuthenticated false) skips this entirely, so public endpoints stay
  // a single round-trip.
  if (!useAuthStore.getState().isAuthenticated) return cfg;

  if (accessTokenNeedsRefresh()) {
    try {
      await refreshTokens();
    } catch {
      // Refresh token is also expired. Let the request proceed: protected
      // endpoints will 401 and the reactive handler below clears the session.
    }
  }
  return cfg;
});

// ---------------------------------------------------------------------------
// Response interceptor — normalise errors into ApiError, handle token refresh
// ---------------------------------------------------------------------------

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const status = error.response?.status ?? 0;
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // --- 401 handling with refresh ---
    // Skip refresh for auth endpoints — these 401s are expected (not logged in, bad creds)
    const url = originalRequest.url ?? "";

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint(url)) {
      originalRequest._retry = true;

      try {
        await refreshTokens();
        // Retry the original request with the new cookies
        return axiosInstance(originalRequest);
      } catch {
        // Refresh failed — session is truly expired.
        // Only clear session; React route guards handle the redirect.
        // Do NOT call window.location.replace here — it causes infinite
        // reload loops when already on /login.
        useAuthStore.getState().clearSession();
        return Promise.reject(
          new ApiError(401, { detail: "Sesión expirada. Por favor ingresá de nuevo." }),
        );
      }
    }

    // --- Non-401 errors or already-retried 401s ---
    const errorBody: ApiErrorBody =
      (error.response?.data as ApiErrorBody) ?? { detail: error.message };

    // Surface the Retry-After header (seconds) on throttled responses (§2).
    const retryAfterRaw = error.response?.headers?.["retry-after"];
    const retryAfter = retryAfterRaw != null ? Number(retryAfterRaw) : undefined;

    return Promise.reject(new ApiError(status, errorBody, retryAfter));
  },
);

// ---------------------------------------------------------------------------
// In-flight GET deduplication
// Multiple components mounting at once (e.g. several useEffects on the
// dashboard) frequently issue the *same* GET concurrently. We share a single
// in-flight promise so the backend is hit once. Mutations are never deduped.
// Callers receive the same resolved object — treat the result as immutable.
// ---------------------------------------------------------------------------

const inflightGets = new Map<string, Promise<unknown>>();

function dedupKey(endpoint: string, cfg?: AxiosRequestConfig): string {
  const params = cfg?.params;
  return params ? `${endpoint}?${JSON.stringify(params)}` : endpoint;
}

// ---------------------------------------------------------------------------
// Public HTTP client
// Thin wrappers that unwrap `response.data` so callsites stay identical.
// ---------------------------------------------------------------------------

export const http = {
  get: <T>(endpoint: string, cfg?: Parameters<typeof axiosInstance.get>[1]) => {
    const key = dedupKey(endpoint, cfg as AxiosRequestConfig | undefined);
    const existing = inflightGets.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = axiosInstance
      .get<T>(endpoint, cfg)
      .then((r: AxiosResponse<T>) => r.data)
      .finally(() => {
        inflightGets.delete(key);
      });
    inflightGets.set(key, promise);
    return promise;
  },

  post: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.post>[2]) =>
    axiosInstance.post<T>(endpoint, body, cfg).then((r) => r.data),

  put: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.put>[2]) =>
    axiosInstance.put<T>(endpoint, body, cfg).then((r) => r.data),

  patch: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.patch>[2]) =>
    axiosInstance.patch<T>(endpoint, body, cfg).then((r) => r.data),

  delete: <T>(endpoint: string, cfg?: Parameters<typeof axiosInstance.delete>[1]) =>
    axiosInstance.delete<T>(endpoint, cfg).then((r) => r.data),
};
