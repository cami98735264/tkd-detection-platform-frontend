// Dev watcher used by `npm run dev` (with the Tailwind watcher and wrangler dev).
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

const clientContext = await esbuild.context(clientOptions(defines, { minify: false }));
const serverContext = await esbuild.context(workerOptions(defines));

await clientContext.watch();
await serverContext.watch();

console.log("👀 Watching for changes...");
