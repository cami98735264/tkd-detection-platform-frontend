// Production build: browser bundle -> public/, Worker bundle -> dist/, plus the
// generated static files (self-hosted MediaPipe runtime, _headers).
// Configuration and shared logic: scripts/build-lib.mjs.
import * as esbuild from "esbuild";

import {
  clientOptions,
  loadLocalEnv,
  prepareStaticAssets,
  resolveDefines,
  workerOptions,
} from "./scripts/build-lib.mjs";

loadLocalEnv();
const defines = resolveDefines();

await prepareStaticAssets();
console.log("✓ Static assets prepared (MediaPipe runtime, _headers)");

await esbuild.build(clientOptions(defines, { minify: true }));
console.log("✓ Client bundle built successfully");

await esbuild.build(workerOptions(defines));
console.log("✓ Server bundle built successfully");
