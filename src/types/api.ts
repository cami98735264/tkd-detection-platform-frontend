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

/**
 * Standardized API error envelope (see `apps/common/exceptions.py`):
 *
 *     {
 *       success: false,
 *       data: null,
 *       error: {
 *         code: "validation_error",
 *         message: "<first human-readable message>",
 *         fields?: { field: [messages] },
 *         field_codes?: { field: [codes] }
 *       }
 *     }
 *
 * The legacy DRF shape (`{"detail": "..."}` or `{field: [...]}`) is also
 * tolerated by the formatter for any older endpoints.
 */
export interface StandardApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  field_codes?: Record<string, string[]>;
}

export interface ApiErrorBody {
  success?: boolean;
  data?: unknown;
  error?: StandardApiError | string;
  detail?: string;
  [field: string]: unknown;
}

function translateErrorMessage(message: string): string {
  const msg = message.toLowerCase();

  // Blank / required
  if (msg.includes("may not be blank") || msg.includes("blank") || msg.includes("this field is required")) {
    return "Este campo no puede estar vacío";
  }
  if (msg.includes("field is required")) return "Este campo es obligatorio";

  // Authentication / credentials
  if (msg.includes("invalid") && (msg.includes("email") || msg.includes("password") || msg.includes("credential"))) {
    return "Correo electrónico o contraseña inválidos";
  }
  if (msg.includes("invalid email or password")) return "Correo electrónico o contraseña inválidos";
  if (msg.includes("incorrect password")) return "Contraseña incorrecta";
  if (msg.includes("wrong password")) return "Contraseña incorrecta";
  if (msg.includes("invalid token") || msg.includes("token invalid")) return "Token inválido";
  if (msg.includes("expired token") || msg.includes("token expired")) return "El token ha expirado";
  if (msg.includes("session expired") || msg.includes("sesión expirada")) return "Sesión expirada. Por favor ingresá de nuevo.";

  // Authorization / permissions
  if (msg.includes("unauthorized") || msg.includes("not authorized")) return "No autorizado";
  if (msg.includes("forbidden") || msg.includes("permission denied")) return "No tenés permisos para realizar esta acción";
  if (msg.includes("access denied")) return "Acceso denegado";

  // Resource states
  if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("404")) {
    return "Recurso no encontrado";
  }
  if (msg.includes("already exists") || msg.includes("already exist")) return "Ya existe";
  if (msg.includes("duplicate") || msg.includes("unique constraint")) return "Ya existe un registro con estos datos";
  if (msg.includes("conflict")) return "Conflicto con datos existentes";
  if (msg.includes("in use") || msg.includes("cannot be deleted") || msg.includes("is being used")) {
    return "No se puede eliminar porque está en uso";
  }

  // Validation
  if (msg.includes("invalid") && msg.includes("format")) return "Formato inválido";
  if (msg.includes("invalid email")) return "Correo electrónico inválido";
  if (msg.includes("invalid url")) return "URL inválida";
  if (msg.includes("too short")) return "Es demasiado corto";
  if (msg.includes("too long")) return "Es demasiado largo";
  if (msg.includes("minimum") && msg.includes("character")) return "No alcanza la cantidad mínima de caracteres";
  if (msg.includes("maximum") && msg.includes("character")) return "Supera la cantidad máxima de caracteres";

  // Network / server
  if (msg.includes("timeout") || msg.includes("timed out")) return "Tiempo de espera agotado";
  if (msg.includes("connection refused") || msg.includes("connection error")) return "Error de conexión";
  if (msg.includes("network error") || msg.includes("network")) return "Error de red";
  if (msg.includes("server error") || msg.includes("internal error")) return "Error del servidor";
  if (msg.includes("service unavailable") || msg.includes("unavailable")) return "Servicio no disponible";
  if (msg.includes("too many requests") || msg.includes("rate limit")) return "Demasiadas solicitudes. Intentá más tarde.";
  if (msg.includes("rate_limit")) return "Demasiadas solicitudes. Intentá más tarde.";

  // Generic fallback for "Invalid ..." without specific match
  if (msg.includes("invalid")) {
    return message.replace(/invalid/gi, "Inválido/a");
  }

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

  /**
   * Per-field error messages from validation responses (`{field: [msg, ...]}`),
   * or `null` when the response wasn't field-shaped.
   */
  get fields(): Record<string, string[]> | null {
    const error = this.body.error;
    if (error && typeof error === "object" && error.fields) return error.fields;
    return null;
  }

  /**
   * Programmatic error codes for fields that carry one (e.g. `user_exists`).
   * Use this for stable detection instead of substring-matching `userMessage`.
   */
  get fieldCodes(): Record<string, string[]> | null {
    const error = this.body.error;
    if (error && typeof error === "object" && error.field_codes) return error.field_codes;
    return null;
  }

  /** Convenience: does any error on `field` carry the given `code`? */
  hasFieldCode(field: string, code: string): boolean {
    return !!this.fieldCodes?.[field]?.includes(code);
  }
}
