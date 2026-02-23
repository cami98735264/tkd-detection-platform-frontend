import * as esbuild from 'esbuild';

// Build client bundle for browser with watch mode
const clientContext = await esbuild.context({
	entryPoints: ['src/client.tsx'],
	bundle: true,
	outfile: 'public/client.js',
	format: 'esm',
	jsx: 'automatic',
	jsxImportSource: 'react',
	minify: false,
	sourcemap: true,
	platform: 'browser',
	alias: { '@': './src' },
});

// Build server bundle for Cloudflare Worker with watch mode
const serverContext = await esbuild.context({
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

await clientContext.watch();
await serverContext.watch();

console.log('👀 Watching for changes...');
