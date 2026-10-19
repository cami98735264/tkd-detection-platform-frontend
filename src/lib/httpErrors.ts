// Centralized HTTP error normalization + global notification.
//
// Every failed request leaves src/lib/http.ts as an `ApiError` (see
// normalizeHttpError). Errors the user can't fix from the current form —
// offline/timeout, 5xx, 403, 429 and an expired session — are also published
// to the app-wide feedback system (FeedbackProvider shows them as toasts) and
// flagged `notified`, so useApiErrorHandler doesn't toast them a second time.
// Validation errors (400/404/409…) stay with the caller, which knows how to
// show them next to the fields.
import axios from "axios";

import { ApiError, type ApiErrorBody } from "@/types/api";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Don't publish this request's failures to the global toast (caller handles them). */
    silent?: boolean;
  }
}

export type HttpErrorKind =
  "network" | "timeout" | "server" | "forbidden" | "throttled" | "session_expired";

export interface HttpErrorEvent {
  kind: HttpErrorKind;
  title: string;
  message: string;
  status: number;
  error: ApiError;
}

const TITLES: Record<HttpErrorKind, string> = {
  network: "Sin conexión",
  timeout: "Tiempo de espera agotado",
  server: "Error del servidor",
  forbidden: "Acceso denegado",
  throttled: "Demasiadas solicitudes",
  session_expired: "Sesión expirada",
};

export const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const TIMEOUT_ERROR_MESSAGE = "El servidor tardó demasiado en responder. Intentá de nuevo.";
export const SESSION_EXPIRED_MESSAGE = "Sesión expirada. Por favor ingresá de nuevo.";

/**
 * Turn any axios failure into an ApiError with a usable Spanish message.
 * Requests without a response (offline, DNS, CORS, timeout) become status 0
 * with a stable `error.code` ("network_error" / "timeout").
 */
export function normalizeHttpError(error: unknown): ApiError | unknown {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return error;
  if (axios.isCancel(error)) return error;

  const response = error.response;
  if (!response) {
    const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    return new ApiError(0, {
      detail: timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
      error: {
        code: timedOut ? "timeout" : "network_error",
        message: timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
      },
    });
  }

  const data = response.data;
  const body: ApiErrorBody =
    data && typeof data === "object" && !(data instanceof Blob)
      ? (data as ApiErrorBody)
      : { detail: typeof data === "string" && data.length < 300 ? data : error.message };

  const retryAfterRaw = response.headers?.["retry-after"];
  const retryAfter = retryAfterRaw != null ? Number(retryAfterRaw) : undefined;
  return new ApiError(response.status, body, retryAfter);
}

/** Which global notification (if any) an error deserves. */
export function classifyHttpError(error: ApiError): HttpErrorKind | null {
  if (error.status === 0) return error.code === "timeout" ? "timeout" : "network";
  if (error.isThrottled) return "throttled";
  if (error.isServerError) return "server";
  if (error.isForbidden) return "forbidden";
  return null;
}

function messageFor(kind: HttpErrorKind, error: ApiError): string {
  switch (kind) {
    case "server":
      return "Ocurrió un error inesperado. Intentá de nuevo en unos minutos.";
    case "throttled":
      return error.retryAfter
        ? `Esperá ${error.retryAfter} s antes de intentar de nuevo.`
        : "Esperá un momento antes de intentar de nuevo.";
    case "forbidden":
      return error.userMessage || "No tenés permisos para realizar esta acción.";
    default:
      return error.userMessage;
  }
}

type Listener = (event: HttpErrorEvent) => void;
const listeners = new Set<Listener>();

/** Subscribe to global HTTP errors. Returns the unsubscribe function. */
export function onHttpError(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Publish `error` (marking it notified) when it falls in a global category. */
export function publishHttpError(error: ApiError, forcedKind?: HttpErrorKind): void {
  const kind = forcedKind ?? classifyHttpError(error);
  if (!kind || listeners.size === 0) return;
  error.notified = true;
  const event: HttpErrorEvent = {
    kind,
    title: TITLES[kind],
    message: messageFor(kind, error),
    status: error.status,
    error,
  };
  for (const listener of listeners) listener(event);
}
