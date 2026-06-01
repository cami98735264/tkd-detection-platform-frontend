import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

function loadLocalEnv() {
	try {
		const envFile = readFileSync('./.env', 'utf8');
		for (const line of envFile.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
			const [key, ...valueParts] = trimmed.split('=');
			if (process.env[key] === undefined) {
				process.env[key] = valueParts.join('=').trim();
			}
		}
	} catch {
		// .env is optional; wrangler defaults and CI env vars still work.
	}
}

loadLocalEnv();

// Read build-time defaults from wrangler.jsonc.
// CI env vars take priority — set API_URL and MOCK_AUTH there for production.
const wrangler = JSON.parse(
	readFileSync('./wrangler.jsonc', 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')    // strip /* block comments */
		.replace(/(?<![:/])\/\/.*/g, '')      // strip // line comments, preserve ://
);
const vars = wrangler.vars ?? {};

const defines = {
	__API_URL__: JSON.stringify(process.env.API_URL ?? vars.API_URL ?? 'http://localhost:8000'),
	__API_BASE_URL__: JSON.stringify(process.env.API_BASE_URL ?? vars.API_BASE_URL ?? ''),
	__API_PREFIX__: JSON.stringify(process.env.API_PREFIX ?? vars.API_PREFIX ?? 'api/v1'),
	__MOCK_AUTH__: JSON.stringify(process.env.MOCK_AUTH ?? vars.MOCK_AUTH ?? 'true'),
	__WS_URL__: JSON.stringify(process.env.WS_URL ?? vars.WS_URL ?? ''),
};

// Build client bundle for browser
await esbuild.build({
	entryPoints: ['src/client.tsx'],
	bundle: true,
	outfile: 'public/client.js',
	format: 'esm',
	jsx: 'automatic',
	jsxImportSource: 'react',
	minify: true,
	sourcemap: true,
	platform: 'browser',
	alias: { '@': './src' },
	define: defines,
});

console.log('✓ Client bundle built successfully');

// Build server bundle for Cloudflare Worker
await esbuild.build({
	entryPoints: ['src/index.ts'],
	bundle: true,
	outfile: 'dist/index.js',
	format: 'esm',
	jsx: 'automatic',
	jsxImportSource: 'react',
	minify: false,
	sourcemap: true,
	platform: 'neutral',
	conditions: ['worker', 'browser'],
	external: ['__STATIC_CONTENT_MANIFEST'],
	alias: { '@': './src' },
	define: defines,
});

console.log('✓ Server bundle built successfully');
