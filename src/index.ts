// Cloudflare Workers entry (`wrangler deploy`; the Pages deploy path uses
// functions/_middleware.ts with the same shared modules).
//
// Responsibilities:
//   1. Reverse-proxy /api/*, /ws/* and /media/* to the Django backend (see
//      src/edge/proxy.ts). wrangler.jsonc routes those prefixes to this Worker
//      first via `assets.run_worker_first`.
//   2. Everything else is the static SPA served from ./public through the
//      ASSETS binding. `assets.not_found_handling: "single-page-application"`
//      returns public/index.html — the ONE HTML shell — for client routes.
//   3. Add the security headers (src/edge/securityHeaders.ts) to what it serves.
//
// BACKEND_HOST and ORIGIN_SECRET are Cloudflare secrets (`wrangler secret put`,
// or .dev.vars locally); they are never committed and never reach the browser.

import { isProxiedPath, proxyToBackend } from "./edge/proxy";
import { withSecurityHeaders } from "./edge/securityHeaders";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (isProxiedPath(url.pathname)) {
      return proxyToBackend(request, env);
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
