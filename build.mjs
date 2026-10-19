// Production build: browser bundle -> public/, Worker bundle -> dist/, plus the
// generated static files (self-hosted MediaPipe runtime, _headers).
// Configuration and shared logic: scripts/build-lib.mjs.
import * as esbuild from "esbuild";

import {
  assertNoMockLeak,
  reportBundleSizes,
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

const client = await esbuild.build(clientOptions(defines, { minify: true }));
const jsOutputs = Object.keys(client.metafile.outputs).filter((f) => f.endsWith(".js"));
assertNoMockLeak(defines, jsOutputs);
reportBundleSizes(client.metafile);
console.log("✓ Client bundle built successfully");

await esbuild.build(workerOptions(defines));
console.log("✓ Server bundle built successfully");
