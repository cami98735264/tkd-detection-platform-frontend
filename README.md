# Warriors TKD — Frontend

React SPA for the Taekwondo academy management platform, deployed to **Cloudflare** and
backed by the Django API in
[`tkd-detection-platform-backend`](https://github.com/cami98735264/tkd-detection-platform-backend).
Covers athlete/parent/admin dashboards, programs and enrollments, attendance, belt
evaluations, meetings, inventory, CSV reports, and the **kick technical-evaluation** flow
(video upload plus MediaPipe-scored results and history).

Built with esbuild directly — no Vite, no Next.js. Cloudflare serves the static SPA
(`public/`), the edge code **reverse-proxies the API, WebSocket and media to the backend**
so the whole app lives on one origin, and adds the security headers.

---

## Table of contents

- [Why the edge proxy exists](#why-the-edge-proxy-exists)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Security headers and MediaPipe](#security-headers-and-mediapipe)
- [Project structure](#project-structure)
- [Routing and access control](#routing-and-access-control)
- [Data layer, errors and realtime](#data-layer-errors-and-realtime)
- [Testing and coverage](#testing-and-coverage)
- [Continuous integration](#continuous-integration)
- [Deployment](#deployment)
- [Related documentation](#related-documentation)

---

## Why the edge proxy exists

The browser **never** talks to the Django backend directly. Every request to `/api/*`,
`/ws/*` and `/media/*` hits this Cloudflare deployment, which forwards it to
`https://${BACKEND_HOST}` and returns the upstream response untouched — preserving the
WebSocket `101` upgrade and every `Set-Cookie`. The proxy adds two headers:
`X-Origin-Auth: ${ORIGIN_SECRET}` (the backend's nginx drops requests without it) and
`X-Forwarded-Host` (so Django builds absolute URLs on the frontend host).

The reason is the auth cookie. The backend issues JWTs **only** as httpOnly cookies; if
the SPA and the API were on different origins, that cookie would be **third-party**, and
Brave Shields, Safari ITP and Chrome's third-party-cookie phase-out would strip it from
both `/api/*` calls and the `/ws/realtime/` handshake. One origin keeps it first-party.

Consequences worth remembering:

- `API_URL` in `wrangler.jsonc` is **deliberately empty** — the client uses same-origin
  relative URLs. Setting it to a full backend URL reintroduces the cross-origin problem
  (and would need a CSP change).
- `BACKEND_HOST` and `ORIGIN_SECRET` are **runtime secrets**, never committed. Without them
  the proxy answers `503 BACKEND_HOST / ORIGIN_SECRET is not configured`.
- The proxy lives **once**, in `src/edge/proxy.ts`, and is used by both deploy paths:

  | File | Used by |
  | --- | --- |
  | `src/index.ts` | Cloudflare **Workers** (`wrangler deploy`, Workers Builds) |
  | `functions/_middleware.ts` | Cloudflare **Pages** (Pages ignores `src/index.ts`) |

## Requirements

- Node.js **22 LTS** (`.nvmrc`; `package.json` `engines` requires `>=22`)
- A Cloudflare account for deploying; `wrangler` is a dev dependency

## Getting started

```bash
nvm use                            # Node 22
npm ci
cp .dev.vars.example .dev.vars     # then set BACKEND_HOST and ORIGIN_SECRET
npm run dev                        # http://localhost:8787
```

`npm run dev` runs three processes concurrently: the esbuild watcher, the Tailwind/PostCSS
watcher, and `wrangler dev`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | esbuild watch + Tailwind watch + `wrangler dev --port 8787` |
| `npm run build` | `public/styles.css`, the generated static files, the client and Worker bundles |
| `npm run build:css` | PostCSS/Tailwind production build only |
| `npm run deploy` | `npm run build && wrangler deploy` (manual deploy) |
| `npm start` | `wrangler dev` alone (no watchers) |
| `npm run lint` | ESLint (flat config, `--max-warnings=0`) |
| `npm run format` / `format:check` | Prettier write / check |
| `npm run typecheck` | `tsc` for the app and for the worker tests |
| `npm test` | unit tests, then worker tests |
| `npm run test:unit` | jsdom component/unit tests (`vitest.unit.config.mts`) |
| `npm run test:coverage` | unit tests with v8 coverage (`coverage/`, 40 % line floor) |
| `npm run test:worker` | edge tests inside workerd (`vitest.config.mts`) |
| `npm run cf-typegen` | Regenerate binding types — run after editing `wrangler.jsonc` |

### The build

`build.mjs` (production) and `watch.mjs` (dev) share `scripts/build-lib.mjs`:

| Step | Output |
| --- | --- |
| Copy the MediaPipe WASM runtime from `node_modules` | `public/vendor/mediapipe/<version>/wasm/` |
| Render the security headers | `public/_headers` |
| `src/client.tsx`, ESM with **code splitting** | `public/client.js` + `public/js/chunks/*-[hash].js` |
| `src/index.ts` | `dist/index.js` (Worker) |

All of these are generated (gitignored). Every page is a lazily loaded chunk, so
FullCalendar, jsPDF and MediaPipe are not part of the initial JS (≈ 580 KiB, ≈ 195 KiB
gzip; the build prints the sizes). The build **fails** if mock-auth credentials appear in
any emitted chunk.

`public/index.html` is the **only** HTML shell: Cloudflare's assets layer serves it for `/`
and, via `not_found_handling: "single-page-application"`, for every client-side route.

## Configuration

Build-time constants are injected by esbuild as `__API_URL__`, `__API_PREFIX__`,
`__MOCK_AUTH__`, `__API_BASE_URL__`, `__WS_URL__` (and `__MEDIAPIPE_VERSION__`), resolved
in `src/config/env.ts`. Defaults come from the `vars` block of `wrangler.jsonc`;
**environment variables take priority** (an optional local `.env` is also read).

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_URL` | `""` | Base URL for the API. Empty = same origin via the proxy |
| `API_PREFIX` | `api/v1` | Version segment appended to the base URL |
| `MOCK_AUTH` | `false` | **Dev only.** `true` swaps in a fake auth/2FA backend (`src/features/auth/mocks/`). When unset or anything but `true`, the mock module is replaced by a null stub at build time, so no mock credentials or TOTP secret are bundled |
| `WS_URL` | `""` | Overrides the realtime WebSocket origin; empty = same origin |
| `API_BASE_URL` | — | Overrides `API_URL` entirely (protocol + host + port) |
| `BACKEND_HOST` | — | **Runtime secret.** Proxy target host. `wrangler secret put BACKEND_HOST`, or `.dev.vars` locally |
| `ORIGIN_SECRET` | — | **Runtime secret.** Sent as `X-Origin-Auth`; must match the backend's nginx. `wrangler secret put ORIGIN_SECRET` |

Requests are composed as `${apiUrl}/${apiPrefix}/…` — e.g. `/api/v1/auth/login/`. Real
secrets belong in the Cloudflare dashboard (Worker/Pages → Settings → Variables and
Secrets), never in `wrangler.jsonc` — this repository is public.

## Security headers and MediaPipe

`src/edge/securityHeaders.ts` is the single source of truth. The Worker / Pages Function
apply the headers to what they serve, and the build writes the same rules to
`public/_headers` for files the assets layer serves without invoking the Worker. Proxied
backend responses are passed through untouched.

| Header | Value (summary) |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` (no inline scripts — the theme bootstrap is `public/theme-init.js`); `style-src 'self' 'unsafe-inline'` (Radix/sonner/FullCalendar); `img-src 'self' data: blob:`; `connect-src 'self'`; `media-src 'self' blob:`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self)`, microphone/geolocation/payment/usb disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |

MediaPipe is **self-hosted** instead of loaded from jsDelivr/Google Storage: the WASM
runtime is copied at build time from the exact-pinned `@mediapipe/tasks-vision` (0.10.35),
and the pose model (`public/models/pose_landmarker_lite/float16/1/`, Apache-2.0, sha256
`59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`) is committed. Same-origin
files keep the CSP `'self'`-only and cannot change upstream — stronger than SRI, which
MediaPipe's own loader does not support. To upgrade, bump the package, replace the model if
needed and re-test the technical evaluation in a browser (Dependabot skips this package).

If you ever point `API_URL`/`WS_URL` at another origin, add it to `connect-src`.

## Project structure

Feature-first: each feature owns its API calls, components, hooks, pages and store.

```text
tkd-frontend/
├── src/
│   ├── client.tsx           # browser entry — renders into #root
│   ├── index.ts             # Workers entry: proxy + assets + headers
│   ├── edge/                # proxy.ts, securityHeaders.ts (shared by Worker and Pages)
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx    # feedback, auth bootstrap, realtime, notifications
│   │   ├── router.tsx       # auth routes + guarded dashboard layout
│   │   └── routes.tsx       # dashboard route table (lazy pages + role guards)
│   ├── features/            # athletes, programs, enrollments, attendance,
│   │                        # evaluations, technical-evaluation, kick-history,
│   │                        # meetings, inventory, reports, users, parent,
│   │                        # notifications, realtime, auth, dashboard, …
│   ├── components/
│   │   ├── ui/              # shadcn-style primitives over Radix
│   │   └── common/
│   ├── feedback/            # app-wide toast/modal/confirm system
│   ├── config/              # env.ts (build-time constants), permissions.ts
│   ├── lib/                 # http client + error layer, downloads, utils
│   ├── validations/         # form schemas
│   └── types/
├── functions/_middleware.ts # Pages entry (uses src/edge/*)
├── public/                  # index.html, theme-init.js, fonts, images, models
├── scripts/build-lib.mjs    # shared build logic
├── build.mjs / watch.mjs    # esbuild build and watch
├── wrangler.jsonc           # Worker config + build-time vars
├── test/                    # worker tests (workerd)
├── test-unit/               # jsdom setup + WebSocket mock
└── docs/                    # API contracts (see below)
```

Imports use the `@/` alias for `src/` (aliased in `scripts/build-lib.mjs`, `tsconfig.json`
and the Vitest config).

## Routing and access control

Routes live in `src/app/router.tsx` and `src/app/routes.tsx` (React Router 7):

- **`GuestRoute`** — login, forgot/reset password, accept invitation (redirects if signed in)
- **`ProtectedRoute`** — everything behind the dashboard layout
- **`RoleRoute`** — **every** dashboard page. Module pages take their roles from the
  permissions matrix in `src/config/permissions.ts` (`rolesFor(module, action)`), so the
  matrix and the router cannot drift; role-specific variants (e.g. `SportsmanEvaluationsPage`
  vs `ParentEvaluationsPage`) list roles explicitly. Tests assert that every route is
  guarded and that the navigation only links each role to routes it may open.

`/verify-email` and `/confirm-email-change` are deliberately **auth-agnostic**: those links
arrive by email and must work whether or not the recipient is signed in.

`Providers` blocks rendering until `authApi.me()` resolves — `status === "initializing"`
renders nothing, which prevents a flash-redirect to `/login` on reload. The UI guards are
convenience only; the backend enforces every permission.

## Data layer, errors and realtime

- **HTTP** — `src/lib/http.ts` (axios, `withCredentials`) with single-flight token refresh
  (reactive on `401`, proactive from the `access_token_expires_at` cookie). Tokens are never
  read from response bodies or stored by the SPA.
- **Errors** — `src/lib/httpErrors.ts` normalizes every failure into an `ApiError`
  (status `0` + `network_error`/`timeout` when there is no response). Offline/timeout,
  `5xx`, `403`, `429` and an expired session are shown **once** as a global toast;
  validation errors stay with the form. Pass `{ silent: true }` to opt a request out.
- **Downloads** — `src/lib/download.ts` fetches protected files (report CSVs, medical
  certificates) as Blobs through axios so the cookies are sent; never a raw `<a href>`.
- **State** — Zustand stores per feature (`features/auth/store`, …).
- **Forms** — Formik + Yup.
- **Realtime** — `features/realtime` opens `/ws/realtime/` through the same-origin proxy;
  pages fall back to polling when the socket is closed (reports, technical evaluation).
- **UI** — Tailwind CSS 4 with Radix primitives, `lucide-react` and `sonner`. FullCalendar
  for schedules; `jspdf` builds the dashboard PDF in the browser (the backend export
  endpoint returns JSON); `qrcode.react`/`input-otp` for 2FA.

## Testing and coverage

```bash
npm run test:unit      # jsdom + Testing Library
npm run test:coverage  # same, with v8 coverage
npm run test:worker    # edge code inside workerd (@cloudflare/vitest-plugin)
npm run typecheck
```

Two configs on purpose: the edge (proxy, secret headers, SPA shell, security headers) must
run in the real Workers runtime, while component tests need a DOM. Coverage scope is
`src/**` minus tests, type declarations and the workerd-only edge code. Line coverage went
from 11.7 % to 47 % in the PHVA cycle; CI enforces a 40 % floor.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: `npm ci`, lint, Prettier
check, typecheck, unit tests with coverage (uploaded as an artifact), worker tests, a
production build (`MOCK_AUTH=false`) and `npm audit --omit=dev --audit-level=high`.
Dependabot (`.github/dependabot.yml`) opens weekly npm and GitHub Actions updates; use the
PR template checklist. Make the `CI` check **required** in the branch protection of
`master`: merging deploys to production (see below).

## Deployment

The production deployment is the **Worker** `tkd-detection-platform-frontend`
(`wrangler.jsonc`: `main: dist/index.js`, `nodejs_compat` + `global_fetch_strictly_public`,
static assets from `./public` with the `ASSETS` binding and SPA fallback, observability on).
The repository is connected to **Cloudflare Workers Builds (Git integration)** — the
`cloudflare-workers-and-pages[bot]` commit that set the worker name comes from it — so a
push to the production branch (`master`) builds and deploys automatically; confirm the
build/deploy commands in the dashboard (Worker → Settings → Build) run `npm run build`
first. A manual deploy is also possible:

```bash
npm run deploy     # build + wrangler deploy
```

Before the first request, set the runtime secrets on the deployed Worker (or Pages
project): `wrangler secret put BACKEND_HOST` and `wrangler secret put ORIGIN_SECRET`.
Without them every `/api/*`, `/ws/*` and `/media/*` call returns `503`.

The **Pages** path (`functions/_middleware.ts`) shares the proxy and header code, so it
needs no separate maintenance; `public/_headers` covers its static files.

## Related documentation

- `docs/api-contract-notes.md` — what the frontend assumes from the backend after the PHVA
  fixes (cookie-only auth, attendance confirmation, CSV reports, private certificates)
- `docs/2fa-contract.md`, `docs/email-contract.md` — client-side contracts mirroring the
  backend's `docs/`
- `AGENTS.md` — Cloudflare Workers notes and commands for AI coding agents
