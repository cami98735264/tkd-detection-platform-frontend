import axios from "axios";
import { config } from "@/config/env";
import { ApiError, ApiErrorBody } from "@/types/api";
import { useAuthStore } from "@/features/auth/store/authStore";
import { emitHttpEvent } from "@/lib/httpEventBus";

// ---------------------------------------------------------------------------
// Axios instance
// JWT is stored in an httpOnly cookie — the browser attaches it automatically.
// withCredentials: true is the only requirement on the client side.
// ---------------------------------------------------------------------------

export const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------------------------------------
// Response interceptor — normalise errors into ApiError
// + Emit centralized HTTP events for UI feedback system
// ---------------------------------------------------------------------------

axiosInstance.interceptors.response.use(
  (response) => {
    // ------------------------------------------------
    // Emit success event
    // ------------------------------------------------

    emitHttpEvent({
      type: "success",
      status: response.status,
      message: response.data?.message || "Operación exitosa",
      code: response.data?.code,
      metadata: response.config.url,
    });

    return response;
  },

  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status ?? 0;

    const errorBody: ApiErrorBody =
      (error.response?.data as ApiErrorBody) ?? { detail: error.message };

    // ------------------------------------------------
    // Emit centralized HTTP event
    // ------------------------------------------------

    emitHttpEvent({
      type:
        status >= 500
          ? "error"
          : status === 401
          ? "error"
          : status >= 400
          ? "warning"
          : "error",
      status,
      message: errorBody.detail || "Error inesperado",
      code: errorBody.code,
      metadata: error.config?.url,
    });

    // ------------------------------------------------
    // Existing authentication handling (UNCHANGED)
    // ------------------------------------------------

    if (status === 401) {
      // Session expired or cookie was cleared
      useAuthStore.getState().clearSession();

      window.location.replace("/login");

      return Promise.reject(
        new ApiError(401, {
          detail: "Sesión expirada. Por favor ingresá de nuevo.",
        }),
      );
    }

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

  post: <T>(
    endpoint: string,
    body?: unknown,
    cfg?: Parameters<typeof axiosInstance.post>[2],
  ) => axiosInstance.post<T>(endpoint, body, cfg).then((r) => r.data),

  put: <T>(
    endpoint: string,
    body?: unknown,
    cfg?: Parameters<typeof axiosInstance.put>[2],
  ) => axiosInstance.put<T>(endpoint, body, cfg).then((r) => r.data),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    cfg?: Parameters<typeof axiosInstance.patch>[2],
  ) => axiosInstance.patch<T>(endpoint, body, cfg).then((r) => r.data),

  delete: <T>(endpoint: string, cfg?: Parameters<typeof axiosInstance.delete>[1]) =>
    axiosInstance.delete<T>(endpoint, cfg).then((r) => r.data),
};