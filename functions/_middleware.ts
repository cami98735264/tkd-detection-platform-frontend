// Cloudflare Pages Function — runs on EVERY request to this Pages project.
//
// It reverse-proxies the REST API, the realtime WebSocket, and uploaded media
// to the Django backend so the browser only ever talks to THIS origin
// (tkd-detection-platform-frontend.pages.dev). Keeping everything same-origin
// makes the JWT auth cookie FIRST-PARTY, so browsers that block third-party
// cookies (Brave Shields, Safari ITP, Chrome's 3p-cookie phase-out) still
// attach it to both `/api/*` calls and the `/ws/realtime/` handshake.
//
// Anything that is not a proxied prefix falls through to `next()`, which serves
// the static SPA assets (index.html, client.js, etc.) exactly as before.
//
// NOTE: src/index.ts contains the equivalent proxy for the *Workers* deploy
// path (`wrangler deploy`). Pages ignores src/index.ts and uses THIS file.

// Origin of the Django backend (e.g. "167-233-18-72.sslip.io"). Supplied at
// runtime via the BACKEND_HOST env var/secret on the Pages project — NOT
// hardcoded, so the origin host isn't committed to source. (This Function runs
// on the edge, so the value never reaches the browser regardless.)
//
// sslip.io is wildcard DNS that resolves a hostname-encoded IP back to that IP
// (167-233-18-72.sslip.io -> 167.233.18.72) in ~0.17s. The Hetzner IP is
// STATIC, so dynamic DNS is unnecessary — and DuckDNS's nameservers were
// resolving in 3-20s on cache miss, stalling the edge fetch this proxy makes.

// Minimal shape of the Pages Function context we use (avoids needing the
// @cloudflare/workers-types ambient PagesFunction type at compile time).
interface ProxyContext {
  request: Request;
  next: () => Promise<Response>;
  env: { BACKEND_HOST?: string };
}

export const onRequest = async (context: ProxyContext): Promise<Response> => {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/ws/") ||
    url.pathname.startsWith("/media/")
  ) {
    if (!env.BACKEND_HOST) {
      return new Response("BACKEND_HOST is not configured", { status: 503 });
    }
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = env.BACKEND_HOST;
    target.port = "";
    // Forward the request untouched (method, Cookie header, WebSocket Upgrade,
    // body). Returning the upstream Response as-is preserves the 101 upgrade
    // and every Set-Cookie (login sets access_token + refresh_token).
    return fetch(new Request(target, request));
  }

  // Not a proxied path — serve the static SPA asset.
  return next();
};
