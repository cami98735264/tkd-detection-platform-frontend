import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

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
	__API_PREFIX__: JSON.stringify(process.env.API_PREFIX ?? vars.API_PREFIX ?? 'api/v1'),
	__MOCK_AUTH__: JSON.stringify(process.env.MOCK_AUTH ?? vars.MOCK_AUTH ?? 'true'),
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
