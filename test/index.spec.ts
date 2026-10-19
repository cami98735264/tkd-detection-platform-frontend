// Worker tests: run inside workerd (see vitest.config.mts). They exercise the
// real entry (src/index.ts) — proxying, secret headers, the SPA shell and the
// security headers — with the backend replaced by a fetch spy.
import { createExecutionContext, env, SELF, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "../functions/_middleware";
import worker from "../src";
import { backendUrl, isProxiedPath, proxyToBackend } from "../src/edge/proxy";
import { CONTENT_SECURITY_POLICY, renderHeadersFile } from "../src/edge/securityHeaders";

const ORIGIN = "https://tkd.example";

async function callWorker(input: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const request = new Request(input, init) as Request<unknown, IncomingRequestCfProperties>;
  const response = await worker.fetch(request, env);
  await waitOnExecutionContext(ctx);
  return response;
}

/** Replace the backend: `make` builds a fresh Response per call (Workers bind
 *  bodies to the request that created them). */
function mockBackend(make: () => Response = () => new Response('{"ok":true}', { status: 200 })) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => make());
}

function expectSecurityHeaders(res: Response) {
  expect(res.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
  expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  expect(res.headers.get("Permissions-Policy")).toContain("camera=(self)");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reverse proxy", () => {
  it.each(["/api/v1/auth/me/", "/ws/realtime/", "/media/fotos/a.png"])(
    "forwards %s to https://BACKEND_HOST with the same path and query",
    async (path) => {
      const spy = mockBackend();
      const res = await callWorker(`${ORIGIN}${path}?page=2`);

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
      const upstream = spy.mock.calls[0][0] as Request;
      expect(upstream.url).toBe(`https://${env.BACKEND_HOST}${path}?page=2`);
    },
  );

  it("sends the origin secret and X-Forwarded-Host, keeping cookies, method and body", async () => {
    const spy = mockBackend();
    await callWorker(`${ORIGIN}/api/v1/auth/login/`, {
      method: "POST",
      headers: { Cookie: "refresh_token=abc", "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.c" }),
    });

    const upstream = spy.mock.calls[0][0] as Request;
    expect(upstream.method).toBe("POST");
    expect(upstream.headers.get("X-Origin-Auth")).toBe(env.ORIGIN_SECRET);
    expect(upstream.headers.get("X-Forwarded-Host")).toBe("tkd.example");
    expect(upstream.headers.get("Cookie")).toBe("refresh_token=abc");
    expect(await upstream.json()).toEqual({ email: "a@b.c" });
  });

  it("returns the upstream response untouched (status, body and Set-Cookie)", async () => {
    mockBackend(
      () =>
        new Response("denied", {
          status: 403,
          headers: { "Set-Cookie": "access_token=x; HttpOnly" },
        }),
    );
    const res = await callWorker(`${ORIGIN}/api/v1/reports/`);
    expect(res.status).toBe(403);
    expect(res.headers.get("Set-Cookie")).toContain("access_token=x");
    expect(res.headers.get("Content-Security-Policy")).toBeNull();
    expect(await res.text()).toBe("denied");
  });

  it("is reached first for proxied paths even on browser navigations (run_worker_first)", async () => {
    const spy = mockBackend(() => new Response("pdf-bytes", { status: 200 }));
    const res = await SELF.fetch(`${ORIGIN}/media/certificados/x.pdf`, {
      headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    expect(await res.text()).toBe("pdf-bytes");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("answers 503 without calling the backend when the secrets are missing", async () => {
    const fetcher = vi.fn();
    const res = await proxyToBackend(new Request(`${ORIGIN}/api/v1/x/`), {}, fetcher);
    expect(res.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("only proxies the three backend prefixes", () => {
    expect(isProxiedPath("/api/v1/x/")).toBe(true);
    expect(isProxiedPath("/ws/realtime/")).toBe(true);
    expect(isProxiedPath("/media/x")).toBe(true);
    expect(isProxiedPath("/apidocs")).toBe(false);
    expect(isProxiedPath("/dashboard/media")).toBe(false);
    expect(backendUrl("http://localhost:8787/api/x?y=1", "backend.test").href).toBe(
      "https://backend.test/api/x?y=1",
    );
  });
});

describe("SPA shell and static assets", () => {
  it.each(["/", "/dashboard", "/dashboard/asistencia", "/login"])(
    "serves public/index.html for %s with security headers",
    async (path) => {
      const spy = mockBackend();
      const res = await callWorker(`${ORIGIN}${path}`, {
        headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/html");
      const html = await res.text();
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('src="/client.js"');
      expect(html).toContain("<title>Warriors TKD</title>");
      expectSecurityHeaders(res);
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it("serves the same shell through the full asset pipeline (integration)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/dashboard/reportes`, {
      headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root"></div>');
  });

  it("serves committed static files from the assets binding", async () => {
    const res = await callWorker(`${ORIGIN}/theme-init.js`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("prefers-color-scheme");
    expectSecurityHeaders(res);
  });
});

describe("Pages Function (functions/_middleware.ts)", () => {
  const pagesEnv = { BACKEND_HOST: "backend.test", ORIGIN_SECRET: "s3cret" };

  it("proxies backend prefixes with the same shared logic", async () => {
    const spy = mockBackend();
    const next = vi.fn();
    await onRequest({ request: new Request(`${ORIGIN}/api/v1/x/`), next, env: pagesEnv });
    const upstream = spy.mock.calls[0][0] as Request;
    expect(upstream.url).toBe("https://backend.test/api/v1/x/");
    expect(upstream.headers.get("X-Origin-Auth")).toBe("s3cret");
    expect(next).not.toHaveBeenCalled();
  });

  it("falls through to static assets and adds the security headers", async () => {
    const next = vi.fn(async () => new Response("<html></html>", { status: 200 }));
    const res = await onRequest({
      request: new Request(`${ORIGIN}/dashboard`),
      next,
      env: pagesEnv,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expectSecurityHeaders(res);
  });
});

describe("security headers", () => {
  it("CSP allows only first-party code, wasm compilation and no framing", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/cdn\.jsdelivr|googleapis/);
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
  });

  it("renders the same headers into the static _headers file", () => {
    const file = renderHeadersFile();
    expect(file.startsWith("# Generated")).toBe(true);
    expect(file).toContain(`  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(file).toContain("/vendor/*\n  Cache-Control: public, max-age=31536000, immutable");
  });
});
