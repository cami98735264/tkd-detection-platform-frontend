import axios from "axios";
import { config } from "@/config/env";
import { ApiError, ApiErrorBody } from "@/types/api";
import { useAuthStore } from "@/features/auth/store/authStore";

// ---------------------------------------------------------------------------
// Axios instance
// JWT is stored in an httpOnly cookie — the browser attaches it automatically.
// withCredentials: true is the only requirement on the client side.
// ---------------------------------------------------------------------------

export const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true, // sends the httpOnly JWT cookie on every request
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------------------------------------
// Response interceptor — normalise errors into ApiError
// ---------------------------------------------------------------------------

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status ?? 0;

    if (status === 401) {
      // Session expired or cookie was cleared — clean up client hint and redirect.
      useAuthStore.getState().clearSession();
      window.location.replace("/login");
      return Promise.reject(
        new ApiError(401, { detail: "Sesión expirada. Por favor ingresá de nuevo." }),
      );
    }

    const errorBody: ApiErrorBody =
      (error.response?.data as ApiErrorBody) ?? { detail: error.message };

    return Promise.reject(new ApiError(status, errorBody));
  },
);

// ---------------------------------------------------------------------------
// Public HTTP client
// Thin wrappers that unwrap `response.data` so callsites stay identical.
// ---------------------------------------------------------------------------

export const http = {
  get: <T>(endpoint: string, cfg?: Parameters<typeof axiosInstance.get>[1]) =>
    axiosInstance.get<T>(endpoint, cfg).then((r) => r.data),

  post: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.post>[2]) =>
    axiosInstance.post<T>(endpoint, body, cfg).then((r) => r.data),

  put: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.put>[2]) =>
    axiosInstance.put<T>(endpoint, body, cfg).then((r) => r.data),

  patch: <T>(endpoint: string, body?: unknown, cfg?: Parameters<typeof axiosInstance.patch>[2]) =>
    axiosInstance.patch<T>(endpoint, body, cfg).then((r) => r.data),

  delete: <T>(endpoint: string, cfg?: Parameters<typeof axiosInstance.delete>[1]) =>
    axiosInstance.delete<T>(endpoint, cfg).then((r) => r.data),
};
