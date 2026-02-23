import * as esbuild from 'esbuild';

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
});

console.log('✓ Server bundle built successfully');
