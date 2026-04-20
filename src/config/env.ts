// __API_URL__ is replaced at build time by esbuild (or wrangler vars in cloud).
// __API_PREFIX__ is the versioned API path segment (e.g., "api/v1" or empty in tests).
// __MOCK_AUTH__ makes initAuth() short-circuit to skip real auth calls.
// __API_BASE_URL__ lets you set the full base URL (protocol+host+port) in one var.
declare const __API_URL__: string | undefined;
declare const __API_PREFIX__: string | undefined;
declare const __MOCK_AUTH__: string | undefined;
declare const __API_BASE_URL__: string | undefined;

export const config = {
  /** Full base URL for the API server (without trailing slash). Falls back to localhost in dev. */
  apiUrl:
    typeof __API_BASE_URL__ !== "undefined"
      ? __API_BASE_URL__
      : typeof __API_URL__ !== "undefined"
        ? __API_URL__
        : "http://localhost:8000",

  /**
   * Versioned API path segment appended to apiUrl.
   * Examples:
   *   - "api/v1"  (standard)
   *   - ""        (no prefix — useful for test environments or custom backends)
   *   - "api/v2"  (future migration)
   *
   * All HTTP calls prepend: `${config.apiUrl}/${config.apiPrefix}/`
   * So with apiUrl="https://api.example.com" and apiPrefix="api/v1",
   * the login endpoint becomes: https://api.example.com/api/v1/auth/login/
   */
  apiPrefix: typeof __API_PREFIX__ !== "undefined" ? __API_PREFIX__ : "api/v1",

  /** When true, initAuth() short-circuits and marks every session as authenticated. */
  mockAuth:
    typeof __MOCK_AUTH__ !== "undefined" ? __MOCK_AUTH__ === "true" : false,
} as const;

/**
 * Build a full endpoint URL from a relative path.
 * Prepends apiPrefix automatically.
 *
 * @example
 * endpoint("/auth/login/")  → "http://localhost:8000/api/v1/auth/login/"
 * endpoint("athletes/")      → "http://localhost:8000/api/v1/athletes/"
 */
export function endpoint(path: string): string {
  // Strip leading slashes from path to avoid double slashes
  const cleanPath = path.replace(/^\/+/, "");
  return `${config.apiUrl}/${config.apiPrefix}/${cleanPath}`;
}
