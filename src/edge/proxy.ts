// Same-origin reverse proxy to the Django backend, shared by the Workers entry
// (src/index.ts) and the Pages Function (functions/_middleware.ts) so the two
// deploy paths can no longer drift apart.
//
// Why it exists: the browser only ever talks to THIS origin, which keeps the
// JWT auth cookie FIRST-PARTY. Browsers that block third-party cookies (Brave
// Shields, Safari ITP, Chrome's 3p-cookie phase-out) would otherwise strip it
// from `/api/*` calls and the `/ws/realtime/` handshake.

/** Path prefixes forwarded to the backend. Everything else is the SPA. */
export const PROXIED_PREFIXES = ["/api/", "/ws/", "/media/"] as const;

/**
 * Runtime configuration. Both values are Cloudflare SECRETS (never committed):
 * - BACKEND_HOST: origin host of the Django backend (no scheme, no path).
 * - ORIGIN_SECRET: shared secret sent as `X-Origin-Auth`; the backend's nginx
 *   drops every request without it, so the origin only answers this proxy.
 */
export interface ProxyEnv {
  BACKEND_HOST?: string;
  ORIGIN_SECRET?: string;
}

export function isProxiedPath(pathname: string): boolean {
  return PROXIED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Rewrite the public URL onto the backend origin (always HTTPS, default port). */
export function backendUrl(requestUrl: string | URL, backendHost: string): URL {
  const target = new URL(requestUrl);
  target.protocol = "https:";
  target.hostname = backendHost;
  target.port = "";
  return target;
}

/**
 * Forward `request` to the backend otherwise untouched (method, Cookie header,
 * WebSocket Upgrade, body). The upstream Response is returned as-is, which
 * preserves the 101 upgrade and every Set-Cookie the login sets.
 *
 * `X-Forwarded-Host` carries this origin's host so Django builds absolute URLs
 * (pagination links, file URLs) on the frontend host, never the backend's.
 */
export async function proxyToBackend(
  request: Request,
  env: ProxyEnv,
  fetcher: (input: Request) => Promise<Response> = (input) => fetch(input),
): Promise<Response> {
  if (!env.BACKEND_HOST || !env.ORIGIN_SECRET) {
    return new Response("BACKEND_HOST / ORIGIN_SECRET is not configured", { status: 503 });
  }
  const publicUrl = new URL(request.url);
  const upstream = new Request(backendUrl(publicUrl, env.BACKEND_HOST), request);
  upstream.headers.set("X-Forwarded-Host", publicUrl.host);
  upstream.headers.set("X-Origin-Auth", env.ORIGIN_SECRET);
  return fetcher(upstream);
}
