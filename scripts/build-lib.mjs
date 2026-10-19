// Shared build logic for build.mjs (production) and watch.mjs (dev).
import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);

/** Load KEY=VALUE pairs from an optional local .env without overriding real env vars. */
export function loadLocalEnv(path = "./.env") {
  try {
    const envFile = readFileSync(path, "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (process.env[key] === undefined) {
        process.env[key] = valueParts.join("=").trim();
      }
    }
  } catch {
    // .env is optional; wrangler defaults and CI env vars still work.
  }
}

/** Remove line and block comments outside of string literals, then trailing commas. */
export function stripJsonc(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i++;
      } else if (ch === '"') {
        inString = false;
      }
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else {
      out += ch;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/** Parse wrangler.jsonc and return its `vars`. */
export function readWranglerVars(path = "./wrangler.jsonc") {
  return JSON.parse(stripJsonc(readFileSync(path, "utf8"))).vars ?? {};
}

/** Exact version of the MediaPipe runtime we bundle/self-host. */
function mediapipeDir() {
  // The package's "exports" hide package.json; resolve the main entry instead.
  return dirname(require.resolve("@mediapipe/tasks-vision"));
}

export function mediapipeVersion() {
  return JSON.parse(readFileSync(join(mediapipeDir(), "package.json"), "utf8")).version;
}

/**
 * Build-time constants. Environment variables win over wrangler.jsonc `vars`.
 * MOCK_AUTH defaults to "false": a missing variable must never ship the mock
 * login to production.
 */
export function resolveDefines() {
  const vars = readWranglerVars();
  const pick = (name, fallback) => process.env[name] ?? vars[name] ?? fallback;
  return {
    __API_URL__: JSON.stringify(pick("API_URL", "http://localhost:8000")),
    __API_BASE_URL__: JSON.stringify(pick("API_BASE_URL", "")),
    __API_PREFIX__: JSON.stringify(pick("API_PREFIX", "api/v1")),
    __MOCK_AUTH__: JSON.stringify(pick("MOCK_AUTH", "false")),
    __WS_URL__: JSON.stringify(pick("WS_URL", "")),
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion()),
  };
}

/** True when the build was explicitly configured for the dev-only mock backend. */
export function mockAuthEnabled(defines) {
  return defines.__MOCK_AUTH__ === JSON.stringify("true");
}

/**
 * Unless MOCK_AUTH=true, resolve the dev-only mock backend to its null stub so
 * fake credentials / TOTP secrets can never reach a production bundle.
 */
export function mockBackendPlugin(defines) {
  return {
    name: "mock-backend",
    setup(build) {
      if (mockAuthEnabled(defines)) return;
      build.onResolve({ filter: /auth\/mocks\/mockBackend$/ }, () => ({
        path: resolve("src/features/auth/mocks/mockBackend.disabled.ts"),
      }));
    },
  };
}

/** Strings that only exist in the mock backend; their presence = a leak. */
export const MOCK_LEAK_MARKERS = ["JBSWY3DPEHPK3PXP", "admin@warriors.com", "Admin Mock"];

/** Fail the build if a non-mock bundle contains mock credentials/secrets. */
export function assertNoMockLeak(defines, files) {
  if (mockAuthEnabled(defines)) return;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const hit = MOCK_LEAK_MARKERS.find((marker) => text.includes(marker));
    if (hit) throw new Error(`Mock auth data ("${hit}") leaked into ${file}`);
  }
}

/** esbuild options for the browser bundle. */
export function clientOptions(defines, { minify }) {
  return {
    plugins: [mockBackendPlugin(defines)],
    entryPoints: ["src/client.tsx"],
    bundle: true,
    outfile: "public/client.js",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "react",
    minify,
    sourcemap: true,
    platform: "browser",
    alias: { "@": "./src" },
    define: defines,
  };
}

/** esbuild options for the Worker bundle (dist/index.js, see wrangler.jsonc main). */
export function workerOptions(defines) {
  return {
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/index.js",
    format: "esm",
    minify: false,
    sourcemap: true,
    platform: "neutral",
    conditions: ["worker", "browser"],
    alias: { "@": "./src" },
    define: defines,
  };
}

/**
 * Self-host the MediaPipe WASM runtime: copy it from the exact-pinned
 * @mediapipe/tasks-vision package into public/vendor/mediapipe/<version>/wasm.
 * Same-origin files need no CDN in the CSP and cannot be swapped upstream
 * (stronger than SRI, which MediaPipe's dynamic loader doesn't support).
 */
export function copyMediapipeWasm() {
  const version = mediapipeVersion();
  const srcDir = join(mediapipeDir(), "wasm");
  const outDir = join("public", "vendor", "mediapipe", version, "wasm");
  mkdirSync(outDir, { recursive: true });
  // FilesetResolver picks the SIMD build or the no-SIMD fallback at runtime.
  for (const file of [
    "vision_wasm_internal.js",
    "vision_wasm_internal.wasm",
    "vision_wasm_nosimd_internal.js",
    "vision_wasm_nosimd_internal.wasm",
  ]) {
    copyFileSync(join(srcDir, file), join(outDir, file));
  }
  return outDir;
}

/** Write public/_headers from src/edge/securityHeaders.ts (single source of truth). */
export async function writeHeadersFile() {
  const result = await esbuild.build({
    entryPoints: ["src/edge/securityHeaders.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
  });
  const code = result.outputFiles[0].text;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  writeFileSync("public/_headers", mod.renderHeadersFile());
}

/** Generated static files that live next to the committed ones in public/. */
export async function prepareStaticAssets() {
  copyMediapipeWasm();
  await writeHeadersFile();
}
