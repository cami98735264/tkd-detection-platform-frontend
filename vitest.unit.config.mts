import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// jsdom project for unit tests of framework-agnostic and React code. Worker
// (edge) code is tested in the Workers runtime instead (vitest.config.mts).
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
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        // Runs in workerd and is covered by the worker tests (test/), which
        // the v8 provider cannot instrument.
        "src/index.ts",
        "src/edge/**",
      ],
      // Regression floor for CI (audit KPI: >= 30 % lines in cycle 1; measured 47 %).
      thresholds: { lines: 40 },
    },
  },
});
