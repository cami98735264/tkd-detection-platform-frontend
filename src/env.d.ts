// Hand-maintained augmentation of the Worker `Env`.
//
// BACKEND_HOST and ORIGIN_SECRET are Cloudflare SECRETS (`wrangler secret put`
// for the Worker, the Pages project's encrypted variables for the Pages
// Function, `.dev.vars` locally). They are intentionally NOT in wrangler.jsonc
// `vars`, so `wrangler types` does not generate them into
// worker-configuration.d.ts — this file keeps them typed across regenerations.
// Both the global `Env` and `Cloudflare.Env` are augmented because generated
// type files have used either one depending on the wrangler version.
interface EdgeSecrets {
  /** Origin host of the Django backend (no scheme). */
  BACKEND_HOST: string;
  /** Shared secret sent as X-Origin-Auth; the backend drops requests without it. */
  ORIGIN_SECRET: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging requires an interface
interface Env extends EdgeSecrets {}

declare namespace Cloudflare {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging requires an interface
  interface Env extends EdgeSecrets {}
}
