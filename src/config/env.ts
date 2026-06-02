// __API_URL__ is replaced at build time by esbuild (or wrangler vars in cloud).
// __API_PREFIX__ is the versioned API path segment (e.g., "api/v1" or empty in tests).
// __MOCK_AUTH__ makes initAuth() short-circuit to skip real auth calls.
// __API_BASE_URL__ lets you set the full base URL (protocol+host+port) in one var.
// __WS_URL__ overrides the realtime WebSocket origin; empty ⇒ derive it from apiUrl.
declare const __API_URL__: string | undefined;
declare const __API_PREFIX__: string | undefined;
declare const __MOCK_AUTH__: string | undefined;
declare const __API_BASE_URL__: string | undefined;
declare const __WS_URL__: string | undefined;

/** Resolved REST base URL — reused below to derive the WebSocket origin. */
const resolvedApiUrl =
  typeof __API_BASE_URL__ !== "undefined" && __API_BASE_URL__
    ? __API_BASE_URL__
    : typeof __API_URL__ !== "undefined"
      ? __API_URL__
      : "http://localhost:8000";

export const config = {
  /** Full base URL for the API server (without trailing slash). Falls back to localhost in dev. */
  apiUrl: resolvedApiUrl,

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

  /**
   * WebSocket origin for the realtime channel (`{wsUrl}/ws/realtime/`).
   * Resolution order:
   *   1. WS_URL env var, if set (explicit override).
   *   2. Derived from apiUrl by swapping the scheme (http→ws, https→wss) —
   *      used when apiUrl is an absolute cross-origin backend URL.
   *   3. apiUrl is empty ⇒ SAME-ORIGIN mode: the SPA's Cloudflare Worker
   *      reverse-proxies `/ws/` to the backend, so we connect back to our own
   *      origin (derived from window.location at runtime). This keeps the auth
   *      cookie first-party. Empty string during SSR (no window) — the client
   *      is the only consumer of the socket.
   */
  wsUrl:
    typeof __WS_URL__ !== "undefined" && __WS_URL__
      ? __WS_URL__
      : resolvedApiUrl
        ? resolvedApiUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://")
        : typeof window !== "undefined"
          ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
          : "",
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
