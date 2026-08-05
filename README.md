# Warriors TKD — Frontend

React SPA for the Taekwondo academy management platform, deployed to **Cloudflare** and
backed by the Django API in [`tkd-backend`](../tkd-backend). Covers athlete/parent/admin
dashboards, programs and enrollments, attendance, belt evaluations, meetings, inventory,
reporting, and the **kick technical-evaluation** flow (video upload plus MediaPipe-scored
results and history).

Built with esbuild directly — no Vite, no Next.js. The edge worker serves a static HTML
shell, hydrates React on the client, and **reverse-proxies the API and WebSocket to the
backend** so the whole app lives on one origin.

---

## Table of contents

- [Why the edge proxy exists](#why-the-edge-proxy-exists)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Routing and access control](#routing-and-access-control)
- [Data layer and realtime](#data-layer-and-realtime)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Why the edge proxy exists

This is the single most important thing to understand about the project.

The browser **never** talks to the Django backend directly. Every request to `/api/*`,
`/ws/*` and `/media/*` hits this Cloudflare deployment, which forwards it to
`BACKEND_HOST` and returns the upstream response untouched — preserving the WebSocket
`101` upgrade and every `Set-Cookie`.

The reason is the auth cookie. The backend issues JWTs as cookies; if the SPA and the API
were on different origins, that cookie would be **third-party**, and Brave Shields, Safari
ITP and Chrome's third-party-cookie phase-out would strip it from both `/api/*` calls and
the `/ws/realtime/` handshake. Keeping one origin keeps the cookie first-party.

Consequences worth remembering:

- `API_URL` in `wrangler.jsonc` is **deliberately empty** — the client uses same-origin
  relative URLs. Setting it to a full backend URL reintroduces the cross-origin problem.
- `BACKEND_HOST` is a **runtime secret**, never committed, so the origin host stays out of
  source. Without it the proxy returns `503 BACKEND_HOST is not configured`.
- **The proxy is implemented twice**, and both copies must be kept in sync:

  | File | Used by |
  | --- | --- |
  | `src/index.ts` | `wrangler deploy` (Workers) |
  | `functions/_middleware.ts` | Cloudflare **Pages** — Pages ignores `src/index.ts` entirely |

## Requirements

- Node.js (a current LTS; `@types/node` targets Node 25)
- A Cloudflare account for deploying; `wrangler` is a dev dependency

## Getting started

```bash
npm install
cp .dev.vars.example .dev.vars     # then set BACKEND_HOST
npm run dev                        # http://localhost:8787
```

`npm run dev` runs three processes concurrently: the esbuild watcher, the Tailwind/PostCSS
watcher, and `wrangler dev`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | esbuild watch + Tailwind watch + `wrangler dev --port 8787` |
| `npm run build` | Build `public/styles.css`, then both bundles via `build.mjs` |
| `npm run build:css` | PostCSS/Tailwind production build only |
| `npm run deploy` | `npm run build && wrangler deploy` |
| `npm start` | `wrangler dev` alone (no watchers) |
| `npm test` | Vitest against the Workers pool (`vitest.config.mts`) |
| `npm run test:unit` | jsdom component/unit tests (`vitest.unit.config.mts`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run cf-typegen` | Regenerate binding types — run after editing `wrangler.jsonc` |

### The build

`build.mjs` emits two bundles with esbuild:

| Entry | Output | Platform |
| --- | --- | --- |
| `src/client.tsx` | `public/client.js` (minified, sourcemapped) | browser |
| `src/index.ts` | `dist/index.js` | neutral / worker conditions |

`src/server.tsx` is **not** React SSR — `renderApp()` returns a fixed HTML shell that loads
`/styles.css` and `/client.js`. All rendering happens on the client; the shell is
user-agnostic, so it stays cacheable while hashed assets are served by `env.ASSETS`.

## Configuration

Build-time constants are injected by esbuild as `__API_URL__`, `__API_PREFIX__`,
`__MOCK_AUTH__`, `__API_BASE_URL__` and `__WS_URL__`, resolved in `src/config/env.ts`.
`build.mjs` reads defaults from the `vars` block in `wrangler.jsonc` (stripping its
comments first), and **environment variables take priority**, so CI can override them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_URL` | `""` | Base URL for the API. Empty = same-origin via the proxy |
| `API_PREFIX` | `api/v1` | Version segment appended to the base URL |
| `MOCK_AUTH` | `false` | When `true`, `initAuth()` short-circuits and every session counts as authenticated |
| `WS_URL` | `""` | Overrides the realtime WebSocket origin; empty = derived from the API URL |
| `API_BASE_URL` | — | Overrides `API_URL` entirely (protocol + host + port) |
| `BACKEND_HOST` | — | **Runtime secret.** Proxy target. `wrangler secret put BACKEND_HOST`, or `.dev.vars` locally |

Requests are composed as `${apiUrl}/${apiPrefix}/…` — e.g. `/api/v1/auth/login/`.

Real secrets belong in the Cloudflare dashboard (Pages project → Settings → Variables and
Secrets), never in `wrangler.jsonc`.

## Project structure

Feature-first: each feature owns its API calls, components, hooks, pages and store.

```text
tkd-frontend/
├── src/
│   ├── client.tsx           # browser entry — hydrates into #root
│   ├── index.ts             # Workers entry: proxy + assets + HTML shell
│   ├── server.tsx           # the static HTML shell (not SSR)
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx    # feedback, auth bootstrap, realtime, notifications
│   │   └── router.tsx       # every route in one place
│   ├── features/            # athletes, programs, enrollments, attendance,
│   │                        # evaluations, technical-evaluation, kick-history,
│   │                        # meetings, inventory, reports, users, parent,
│   │                        # notifications, realtime, auth, dashboard, …
│   ├── components/
│   │   ├── ui/              # shadcn-style primitives over Radix
│   │   └── common/
│   ├── feedback/            # app-wide toast/feedback system + FeedbackLab
│   ├── config/              # env.ts (build-time constants), permissions.ts
│   ├── lib/                 # http client, date utils, animation + view hooks
│   ├── validations/         # form schemas
│   └── types/
├── functions/_middleware.ts # Pages proxy (mirror of src/index.ts)
├── build.mjs / watch.mjs    # esbuild build and watch
├── wrangler.jsonc           # Worker/Pages config + build-time vars
├── test/                    # Workers-pool tests
└── test-unit/               # jsdom setup + WebSocket mock
```

Imports use the `@/` alias for `src/` (aliased in `build.mjs` and `tsconfig.json`).

## Routing and access control

All routes live in `src/app/router.tsx` (React Router 7), wrapped by three guards:

- **`GuestRoute`** — login, forgot/reset password, accept invitation (redirects if signed in)
- **`ProtectedRoute`** — everything behind the dashboard layout
- **`RoleRoute`** — role-scoped pages, so administrators, parents and athletes get their
  own variants (e.g. `EvaluationsPage` vs `SportsmanEvaluationsPage` vs
  `ParentEvaluationsPage`)

`/verify-email` and `/confirm-email-change` are deliberately **auth-agnostic**: those links
arrive by email and must work whether or not the recipient is signed in.

`Providers` blocks rendering until `authApi.me()` resolves — `status === "initializing"`
renders nothing, which prevents a flash-redirect to `/login` on reload.

## Data layer and realtime

- **HTTP** — `src/lib/http.ts` (axios) with credentials, so the first-party JWT cookie
  rides along.
- **State** — Zustand stores per feature (`features/auth/store`, …).
- **Forms** — React Hook Form and Formik are both present, with Zod and Yup resolvers.
  Prefer whichever the surrounding feature already uses instead of mixing within a screen.
- **Realtime** — `features/realtime` opens `/ws/realtime/` through the same-origin proxy;
  `NotificationsBootstrap` feeds the notification bell. `test-unit/mockWebSocket.ts` stubs
  the socket in unit tests.
- **UI** — Tailwind CSS 4 (via PostCSS) with Radix primitives, `class-variance-authority`,
  `lucide-react` icons and `sonner` toasts. FullCalendar drives scheduling views; `jspdf` +
  `jspdf-autotable` generate client-side PDFs; `qrcode.react` and `input-otp` support the
  2FA enrolment flow.

`@mediapipe/tasks-vision` is a dependency here as well as in the backend — the browser side
of the technical-evaluation feature.

## Testing

```bash
npm test           # Workers runtime tests (@cloudflare/vitest-pool-workers)
npm run test:unit  # jsdom + Testing Library
npm run typecheck
```

Two configs on purpose: worker-level behaviour (the proxy, routing, asset handling) must
run in the real Workers runtime, while component tests need a DOM.

## Deployment

```bash
npm run deploy     # build + wrangler deploy
```

Worker name: `tkd-detection-platform-frontend`, with `nodejs_compat` and
`global_fetch_strictly_public` compatibility flags, static assets served from `./public`,
and observability enabled.

For the **Pages** deployment path, remember that Cloudflare Pages runs
`functions/_middleware.ts` and ignores `src/index.ts` — a proxy change applied to only one
of the two files will appear to work locally and fail in production, or vice versa.

Set `BACKEND_HOST` as an encrypted secret on the deployed project before the first request:
without it every `/api/*` and `/ws/*` call returns `503`.

## Related documentation

- `docs/2fa-contract.md`, `docs/email-contract.md` — client-side contracts mirroring the
  backend's `docs/` (`tkd-backend/docs/two-factor.md`, `email-contract.md`)
- `AGENTS.md` — Cloudflare Workers notes and commands for AI coding agents
