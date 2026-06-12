# Changelog

All notable changes to steady-page-kit. How to update an installation:
[docs/agent/UPDATE.md](docs/agent/UPDATE.md).

## 2.0.0 — 2026-06-11

TypeScript in-place port. Same file tree (`.js` → `.ts`), same routes, same KV
keys, same cookies and panel protocol, same `kit.config.js` — and still **zero
runtime dependencies**, with no build step on the Node path. Parity with v1 is
proven by a golden-master diff of every route
(`node scripts/golden-master.ts v1-final`).

### Behavior change (the only one)

- **The feed fetch times out after 10 s** (`AbortSignal.timeout`). Previously a
  hanging Steady feed could block rendering indefinitely; the timeout makes the
  existing stale-cache fallback actually reachable.

- Footer mit zentriertem Logo + konfigurierbaren Links (Drawer-Sektion Footer, kitchrome.foot, additiv)

### Added

- **Vercel support**: catch-all entry (`api/index.ts` + `vercel.json`); storage
  via the new **Upstash/Redis-REST adapter** (`server/kv-redis-rest.ts`). The
  `KVAdapter` interface now has three backends — filesystem, Cloudflare KV,
  redis-rest — selected via environment (`UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` before the fs fallback; Cloudflare via binding).
- `server/routes.ts`: one route table that the Node AND Vercel entries dispatch
  through (Cloudflare keeps folder routing).
- **Timing-safe admin gate** behind an authorizer seam (`functions/_lib/auth.ts`);
  `npm run doctor` warns about admin codes shorter than 12 characters.
  v2.1 plans "Login with Steady" as a drop-in replacement of that seam.
- **Secret scrubbing** (`functions/_lib/scrub.ts`): the central error logger
  redacts `FULLTEXT_FEED_URL` and its token from message, stack and cause.
- **Guards as tests**: `npm run bump-assets` + asset-hash test (replaces manual
  `ASSET_VERSION` bumping), routes-consistency test (`functions/` ↔ `ROUTES`
  table), protocol-constants test (KV keys, cookie/localStorage enums, `data-*`
  attributes, `/rubrik/`, `x-kit-admin`).
- **Golden-master harness** (`scripts/golden-master.ts`) — the parity proof
  against any v1 git ref.

### Changed

- **Hosting recommendation reordered — Node-first.** **Railway** is the new
  default recipe (managed PaaS, ~5 €/month, persistent volume, agent-deployable
  via CLI); Hetzner/Docker-VPS and Uberspace are full recipes for self-managed
  servers; **Vercel** is new (serverless + Upstash). **Cloudflare Pages stays
  fully supported** ($0) but is no longer the default recommendation — existing
  installations keep running unchanged, in place.
- **Node baseline ≥ 22.18** (24 LTS recommended). `server/node.js` is now a
  plain-JS bootstrap that checks the version before loading TypeScript.
- `npm run check` is a real typecheck now (strict tsc, two configs); browser
  assets stay JS with JSDoc (`checkJs`).

### Migration

- v1 installations: follow **[docs/agent/UPDATE.md](docs/agent/UPDATE.md),
  Section B** (replace migration). Publisher files, brand assets and code patches
  survive; Cloudflare installations keep their Pages project and KV binding.
