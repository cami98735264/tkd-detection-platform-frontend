import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Separate, node/jsdom-based project for unit tests of framework-agnostic and
// React code (realtime client, notification store, bootstrap). The Cloudflare
// Workers project (vitest.config.mts) is left untouched for worker tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./test-unit/setup.ts"],
    restoreMocks: true,
  },
});
