// Cloudflare Pages Function — runs on EVERY request to the Pages project.
// Pages ignores src/index.ts; both entries share src/edge/* so the proxy and
// the security headers are defined exactly once.
//
// Proxied prefixes (/api, /ws, /media) go to the backend; anything else falls
// through to `next()`, which serves the static SPA (public/index.html for
// client routes via Pages' SPA fallback).

import { isProxiedPath, proxyToBackend, type ProxyEnv } from "../src/edge/proxy";
import { withSecurityHeaders } from "../src/edge/securityHeaders";

// Minimal shape of the Pages Function context we use (avoids needing the
// ambient PagesFunction type at compile time).
export interface ProxyContext {
  request: Request;
  next: () => Promise<Response>;
  env: ProxyEnv;
}

export const onRequest = async (context: ProxyContext): Promise<Response> => {
  const { request, next, env } = context;
  if (isProxiedPath(new URL(request.url).pathname)) {
    return proxyToBackend(request, env);
  }
  return withSecurityHeaders(await next());
};
