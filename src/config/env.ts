// __API_URL__ and __MOCK_AUTH__ are replaced at build time by esbuild.
declare const __API_URL__: string | undefined;
// Set MOCK_AUTH=true (env var) to skip the real /api/auth/me/ check and
// treat every session as authenticated. Useful for frontend-only development.
declare const __MOCK_AUTH__: string | undefined;

export const config = {
  apiUrl:
    typeof __API_URL__ !== "undefined" ? __API_URL__ : "http://localhost:8000",
  /** When true, initAuth() short-circuits and marks the user as authenticated. */
  mockAuth:
    typeof __MOCK_AUTH__ !== "undefined" ? __MOCK_AUTH__ === "true" : false,
} as const;
