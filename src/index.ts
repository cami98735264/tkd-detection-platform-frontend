/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { renderApp } from './server';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		
		// API routes - handle these in the worker
		if (url.pathname.startsWith('/api/')) {
			switch (url.pathname) {
				case '/api/message':
					return new Response(JSON.stringify({ message: 'Hello from TKD API!' }), {
						headers: { 'Content-Type': 'application/json' }
					});
				case '/api/random':
					return new Response(JSON.stringify({ uuid: crypto.randomUUID() }), {
						headers: { 'Content-Type': 'application/json' }
					});
				default:
					return new Response(JSON.stringify({ error: 'Not Found' }), { 
						status: 404,
						headers: { 'Content-Type': 'application/json' }
					});
			}
		}
		
		// Serve static files (js, css, images, etc.) from assets
		const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);
		if (hasFileExtension && env.ASSETS) {
			return env.ASSETS.fetch(request);
		}
		
		// If static file requested but ASSETS not available, return 404
		if (hasFileExtension) {
			return new Response('Not Found', { status: 404 });
		}
		
		// SSR for all other routes (HTML pages)
		const html = renderApp(url.pathname);
		return new Response(html, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' }
		});
	},
} satisfies ExportedHandler<Env>;
