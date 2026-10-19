import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Worker tests: run inside the real Workers runtime (workerd via Miniflare).
// Unit tests of React/framework-agnostic code live in src/**/*.test.ts(x) and
// run in the jsdom project (vitest.unit.config.mts).
export default defineConfig({
  plugins: [
    cloudflareTest({
      // Test the TypeScript entry directly so the worker tests do not depend
      // on a prior `npm run build` (wrangler.jsonc points at dist/).
      main: "./src/index.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // Test-only values; the real ones are Cloudflare secrets.
        bindings: {
          BACKEND_HOST: "backend.test",
          ORIGIN_SECRET: "test-origin-secret",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
});
