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
  [field: string]: unknown;
}

function translateErrorMessage(message: string): string {
  if (message.includes("may not be blank") || message.includes("blank")) {
    return "Este campo no puede estar vacío";
  }
  if (message.includes("field is required")) return "Este campo es obligatorio";
  if (message.includes("Invalid")) return message.replace("Invalid ", "Inválido/a ");
  return message;
}

export function formatApiErrorValue(value: unknown): string {
  if (typeof value === "string") return translateErrorMessage(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (Array.isArray(value)) {
    return value.map(formatApiErrorValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.detail === "string") return translateErrorMessage(record.detail);
    if (typeof record.message === "string") return translateErrorMessage(record.message);
    if (typeof record.error === "string") return translateErrorMessage(record.error);
    if (typeof record.error !== "undefined") return formatApiErrorValue(record.error);
    if (typeof record.code === "string" && Object.keys(record).length === 1) return record.code;
    if (typeof record.string === "string") return translateErrorMessage(record.string);

    const parts = Object.entries(record)
      .map(([key, nestedValue]) => {
        const message = formatApiErrorValue(nestedValue);
        return message ? `${key}: ${message}` : "";
      })
      .filter(Boolean);

    return parts.join(" · ");
  }

  return translateErrorMessage(String(value));
}

export function formatApiErrorBody(body: ApiErrorBody): string {
  if (typeof body.detail === "string" && body.detail) return translateErrorMessage(body.detail);

  const standardizedError = body.error;
  if (typeof standardizedError === "string") return translateErrorMessage(standardizedError);
  if (typeof standardizedError !== "undefined") return formatApiErrorValue(standardizedError);

  if (Array.isArray(body.errors)) {
    const messages = body.errors
      .map((item) => {
        if (typeof item === "string") return translateErrorMessage(item);
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const athleteId = record.athlete_id;
          const message = formatApiErrorValue(record.error ?? record.message ?? record.detail ?? item);
          if (athleteId !== undefined && message) {
            return `Atleta ${String(athleteId)}: ${message}`;
          }
          return message;
        }
        return formatApiErrorValue(item);
      })
      .filter(Boolean);

    if (messages.length > 0) return messages.join(" · ");
  }

  // Fallback: join validation-style fields while ignoring transport metadata.
  return Object.entries(body)
    .filter(([field]) => field !== "detail" && field !== "error" && field !== "errors")
    .map(([field, value]) => `${field}: ${formatApiErrorValue(value)}`)
    .filter((entry) => !entry.endsWith(": "))
    .join(" · ");
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

  get userMessage(): string {
    return formatApiErrorBody(this.body);
  }
}
