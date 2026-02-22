import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    try {
      // Serve static assets
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
          mapRequestToAsset: mapRequestToAsset,
        }
      );
    } catch (e) {
      // For SPA routing: if file not found, return index.html
      try {
        return await getAssetFromKV(
          {
            request: new Request(`${url.origin}/index.html`, request),
            waitUntil(promise) {
              return ctx.waitUntil(promise);
            },
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST || '{}',
          }
        );
      } catch (error) {
        return new Response(`Error: ${error.message}`, { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  },
};
