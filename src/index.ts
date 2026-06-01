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

// Origin of the Django backend (e.g. "167-233-18-72.sslip.io"). Supplied at
// runtime via the BACKEND_HOST env var/secret — NOT hardcoded, so the origin
// host isn't committed to source. Set it with `wrangler secret put BACKEND_HOST`
// (and in .dev.vars for local `wrangler dev`). This bundle runs on the edge, not
// in the browser, so the value is never shipped to clients either way.
// Keep the env-var name in sync with functions/_middleware.ts.

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Reverse-proxy the REST API and the realtime WebSocket to the backend so
		// the browser only ever talks to THIS origin. That keeps the JWT auth
		// cookie FIRST-PARTY, so browsers that block third-party cookies (Brave
		// Shields, Safari ITP, Chrome's 3p-cookie phase-out) still attach it to
		// both `/api/*` calls and the `/ws/realtime/` handshake.
		if (
			url.pathname.startsWith('/api/') ||
			url.pathname.startsWith('/ws/') ||
			url.pathname.startsWith('/media/')
		) {
			if (!env.BACKEND_HOST) {
				return new Response('BACKEND_HOST is not configured', { status: 503 });
			}
			const target = new URL(request.url);
			target.protocol = 'https:';
			target.hostname = env.BACKEND_HOST;
			target.port = '';
			// Forward the request untouched (method, Cookie header, WebSocket
			// Upgrade, body). Returning the upstream Response as-is preserves the
			// 101 upgrade and every Set-Cookie (login sets access + refresh).
			return fetch(new Request(target, request));
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
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				// The shell embeds nothing user-specific — auth lives in the API
				// behind a JWT cookie — so the document itself is cacheable, but
				// we want clients to revalidate on every navigation so deploys
				// roll out immediately. Hashed JS/CSS bundles are served by
				// env.ASSETS, which already sets long-lived caching.
				'Cache-Control': 'public, max-age=0, must-revalidate',
			},
		});
	},
} satisfies ExportedHandler<Env>;
