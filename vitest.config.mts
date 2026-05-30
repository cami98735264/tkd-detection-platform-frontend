import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		// Scope the Workers pool to the worker tests under test/. Unit tests live
		// in src/**/*.test.ts(x) and run in the jsdom project (vitest.unit.config.mts).
		include: ["test/**/*.{test,spec}.{ts,tsx}"],
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});
