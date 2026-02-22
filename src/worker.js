import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      // Try to serve static assets from the dist folder
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      // If asset not found, serve index.html for SPA routing
      if (e.status === 404) {
        try {
          return await getAssetFromKV(
            {
              request: new Request(`${new URL(request.url).origin}/index.html`, request),
              waitUntil: ctx.waitUntil.bind(ctx),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
            }
          );
        } catch (e) {
          return new Response('Not found', { status: 404 });
        }
      }
      return new Response('Internal Error', { status: 500 });
    }
  },
};
