// ---------------------------------------------------------------------------
// Standard API response shape (Cristian requirement)
// Backend responses are assumed to include `.message`
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
  code?: string;
}

// ---------------------------------------------------------------------------
// Generic DRF response shapes
// ---------------------------------------------------------------------------

/** Standard Django REST Framework paginated response */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** DRF error body — `detail` for single message, field keys for validation */
export interface ApiErrorBody {
  detail?: string;
  code?: string;
  [field: string]: string | string[] | undefined;
}

// ---------------------------------------------------------------------------
// ApiError — thrown by the HTTP client for every non-2xx response
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /** HTTP status code (400, 401, 403, 404, 500, …) */
  readonly status: number;

  /** Parsed JSON body from Django */
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.detail ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** True for 4xx — caller mistake / validation error */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /** True for 5xx — server-side failure */
  get isServerError() {
    return this.status >= 500;
  }

  /** True when the session expired or token is invalid */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** True when the user lacks permission */
  get isForbidden() {
    return this.status === 403;
  }

  /**
   * Returns a human-readable message extracted from the DRF error body.
   */
  get userMessage(): string {
    if (this.body.detail) return this.body.detail;

    return Object.entries(this.body)
      .map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join(", ") : String(msgs ?? "");
        return `${field}: ${text}`;
      })
      .join(" · ");
  }
}

// ---------------------------------------------------------------------------
// Dynamic message key support (Cristian requirement)
// Allows choosing which property contains the user message
// ---------------------------------------------------------------------------

import { AxiosRequestConfig } from "axios";

/**
 * Allows specifying which property of the API response
 * contains the descriptive message to display in the UI.
 */
export interface ApiRequestConfig<
  TResponse = unknown,
  K extends keyof TResponse = keyof TResponse
> extends AxiosRequestConfig {
  /**
   * Property name inside the API response that contains the message
   * Example:
   *  message
   *  response
   *  detail
   */
  messageKey?: K;
}