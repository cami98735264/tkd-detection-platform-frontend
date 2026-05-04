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
// Token refresh queue — when a 401 happens we attempt a single refresh, queue
// all concurrent 401 requests, then replay or reject them once the refresh
// resolves.
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
}

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
    const isAuthEndpoint =
      url.includes(`/auth/login`) ||
      url.includes(`/auth/me`) ||
      url.includes(`/auth/refresh`);

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosInstance(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh — the refresh endpoint reads the refresh_token cookie
        await axiosInstance.post(`/auth/refresh/`, null, {
          // Prevent infinite loop: if refresh itself 401s, don't retry
          _retry: true,
        } as AxiosRequestConfig & { _retry: boolean });

        processQueue(null);
        // Retry the original request with the new cookies
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — session is truly expired.
        // Only clear session; React route guards handle the redirect.
        // Do NOT call window.location.replace here — it causes infinite
        // reload loops when already on /login.
        useAuthStore.getState().clearSession();
        return Promise.reject(
          new ApiError(401, { detail: "Sesión expirada. Por favor ingresá de nuevo." }),
        );
      } finally {
        isRefreshing = false;
      }
    }

    // --- Non-401 errors or already-retried 401s ---
    const errorBody: ApiErrorBody =
      (error.response?.data as ApiErrorBody) ?? { detail: error.message };

    return Promise.reject(new ApiError(status, errorBody));
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
