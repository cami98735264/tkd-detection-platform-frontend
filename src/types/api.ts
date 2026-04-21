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
   * Handles both standard DRF error format (detail) and the app's standardized
   * error format ({ error: { code, message } }).
   * Joins field-level validation errors into a single string when `detail`
   * is absent.
   */
  get userMessage(): string {
    // Handle standard DRF error: { detail: "message" }
    if (this.body.detail) return this.body.detail;

    // Translate DRF error codes to Spanish
    const translate = (msg: string): string => {
      if (msg.includes("may not be blank") || msg.includes("blank")) return "Este campo no puede estar vacío";
      if (msg.includes("field is required")) return "Este campo es obligatorio";
      if (msg.includes("Invalid")) return msg.replace("Invalid ", "Inválido/a ");
      return msg;
    };

    // Parse Python dictrepr strings like "{'email': [ErrorDetail(...)]}"
    const parseDictrepr = (s: string): string => {
      const dictMatch = s.match(/^\{.*\}$/);
      if (!dictMatch) return translate(s);
      const fieldMatches = s.matchAll(/'([^']+)':\s*\[([^\]]+)\]/g);
      const parts: string[] = [];
      for (const m of fieldMatches) {
        const field = m[1];
        const val = m[2];
        const text = val.includes("ErrorDetail") ? "Este campo no puede estar vacío" : translate(val.replace(/'/g, ""));
        parts.push(`${field}: ${text}`);
      }
      return parts.length ? parts.join(" · ") : translate(s);
    };

    // Handle standardized app error: { error: { code: "...", message: "..." } }
    if (this.body.error && typeof this.body.error === "object") {
      const err = this.body.error as { code?: string; message?: string };
      if (err.message) return parseDictrepr(err.message);
      if (err.code) return err.code;
    }

    // Normalize a single error value (string, ErrorDetail object, or nested array)
    const normalize = (val: unknown): string => {
      if (typeof val === "string") return translate(val);
      if (Array.isArray(val)) return (val as unknown[]).map(normalize).filter(Boolean).join(", ");
      if (val && typeof val === "object" && "string" in val) {
        return translate(String((val as { string: string }).string));
      }
      return translate(String(val));
    };

    // Fallback: join field-level validation errors
    return Object.entries(this.body)
      .map(([field, msgs]) => `${field}: ${normalize(msgs)}`)
      .join(" · ");
  }
}
