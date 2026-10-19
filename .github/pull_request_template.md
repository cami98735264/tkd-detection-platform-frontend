## What and why

<!-- What does this change and why? Link the Trello card / audit ID (e.g. D12/R18). -->

## How it was tested

- [ ] `npm run lint` and `npm run format:check`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage` (unit) — new/updated tests for the change
- [ ] `npm run test:worker` (edge proxy / headers), if `src/edge`, `src/index.ts`, `functions/` or `wrangler.jsonc` changed
- [ ] `npm run build`
- [ ] Manual check in the browser (roles affected: administrator / sportsman / parent)

## Risk and rollout

- [ ] No secrets, hostnames, IPs or credentials added (this repo is public)
- [ ] API contract changes are reflected in `docs/api-contract-notes.md` and coordinated with the backend
- [ ] Security headers / CSP still allow what the change needs (`src/edge/securityHeaders.ts`)
- [ ] Merging deploys to production via Cloudflare's Git integration — CI must be green

## Screenshots

<!-- UI changes: before/after. -->
