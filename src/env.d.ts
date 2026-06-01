// Hand-maintained augmentation of the Worker `Env`.
//
// BACKEND_HOST is provided at runtime as a Cloudflare secret/var (set via
// `wrangler secret put BACKEND_HOST` for the Worker, and the Pages project's
// environment variables for the Pages Function). It is intentionally NOT in
// wrangler.jsonc `vars`, so `wrangler types` does not regenerate it into
// worker-configuration.d.ts — this file keeps it typed across regenerations.
declare namespace Cloudflare {
  interface Env {
    BACKEND_HOST: string;
  }
}

