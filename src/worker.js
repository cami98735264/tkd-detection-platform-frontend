import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      // Check if static content is available
      if (!env.__STATIC_CONTENT) {
        return new Response('Static content not configured', { status: 500 });
      }

      // Try to serve static assets from the dist folder
      return await getAssetFromKV(
        {
          request,
          waitUntil(promise) {
            return ctx.waitUntil(promise);
          },
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST || '{}',
        }
      );
    } catch (e) {
      // If asset not found, serve index.html for SPA routing
      if (e.status === 404 || e.status === 405) {
        try {
          const url = new URL(request.url);
          const indexRequest = new Request(`${url.origin}/index.html`, request);
          
          return await getAssetFromKV(
            {
              request: indexRequest,
              waitUntil(promise) {
                return ctx.waitUntil(promise);
              },
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST || '{}',
            }
          );
        } catch (e) {
          return new Response('Not found', { status: 404 });
        }
      }
      return new Response(`Internal Error: ${e.message}`, { status: 500 });
    }
  },
};
