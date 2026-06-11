# steady-page-kit — agent guide

A portable landing page for [Steady](https://steadyhq.com) publications. The Steady
RSS feed is the CMS; the official Steady widget handles login, paywall and checkout;
a built-in customizer panel lets the publisher restyle everything and publish the
result for all visitors.

**If the user asks to set up this site** (e.g. "Set up my page" / „Richte meine Seite
ein"), follow the runbook in **[docs/agent/SETUP.md](docs/agent/SETUP.md)** step by step.
For deployment use the matching recipe in **docs/agent/deploy/**. For updating an
existing installation to a newer kit version, use **[docs/agent/UPDATE.md](docs/agent/UPDATE.md)**.

Always talk to the user in **their** language. Code, comments and commits stay in the
repository's existing style.

## What runs where

- `kit.config.js` — **the publisher's file**: identity, language (de/en), Steady slug +
  publication id, tuning. The only file a publisher must edit. No secrets in here.
- `functions/` — Cloudflare-Pages-style handlers in TypeScript, pure
  `(context) → Response`. They run unchanged on **three runtimes**:
  - **Node anywhere** (Railway, Render, Fly, Docker/VPS, Uberspace): `server/node.js`
    is a plain-JS bootstrap (checks Node ≥ 22.18, loads `.env`) that starts
    `server/node.ts` — the TypeScript source runs directly, no build step.
  - **Cloudflare Pages**: folder routing under `functions/`, KV via the `KIT_KV`
    binding (wrangler.toml); wrangler bundles the `.ts` files at deploy time.
  - **Vercel**: `api/index.ts` → `server/vercel.ts`, one catch-all function;
    Vercel bundles at deploy time.
- `server/routes.ts` — THE route table. The Node and Vercel entries dispatch through
  it; Cloudflare uses folder routing instead. `test/routes-consistency.test.js`
  keeps table and folder structure in lockstep.
- `functions/_lib/` — config derivation (`config.ts`), i18n (`i18n.ts`), feed
  fetch/parse (`feed.ts`), settings/cookie precedence (`settings.ts`), renderers
  (`render.ts`, `page.ts`, `panel.ts`), shared types incl. `KVAdapter` (`types.ts`),
  admin auth (`auth.ts` — the authorizer seam; the planned v2.1 "Login with Steady"
  replaces only this function), secret redaction (`scrub.ts` — its `logError()` is
  the only permitted `console.error` site for request errors).
- Storage — one `KVAdapter` interface, three backends, selected via environment:
  **Cloudflare KV** when the `KIT_KV` binding exists; **Upstash/Redis-REST**
  (`server/kv-redis-rest.ts`) when `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` are set (Vercel); otherwise **filesystem**
  (`server/fs-kv.ts`) — `data/` on disk hosts, override with `KIT_DATA_DIR`.
- `public/assets/` — client JS (`kit-theme.js` catalogs + setters, `kit-panel.js`
  panel logic) and CSS design tokens (`kit.css`). Stays plain JS with JSDoc —
  browsers don't strip types; checked via `tsconfig.browser.json` (`checkJs`).
- `scripts/doctor.js` — health check. **Run `npm run doctor` after any setup or
  config change; exit 0 = ready.**
- Secrets: `.env` (Node) / `.dev.vars` (Cloudflare local) / host env or
  `wrangler pages secret put` (production). `KIT_ADMIN_CODE` gates global writes;
  `FULLTEXT_FEED_URL` (optional) is the authenticated full-text feed.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (Node, watch mode, port 8788) — no wrangler needed |
| `npm start` | Same server without watch (production Node hosts run this) |
| `npm run dev:cf` | Local dev via wrangler/Cloudflare emulation (restart after kit.config.js edits) |
| `npm run deploy:cf` | Deploy to Cloudflare Pages (project name from wrangler.toml) |
| `npm run check` | Typecheck (tsc, both configs: server/functions strict + browser assets via JSDoc) |
| `npm test` | Unit + server tests (`node --test`) |
| `npm run bump-assets` | Bump `ASSET_VERSION` + hash fixture after editing `public/assets/` |
| `npm run doctor` | Config/network health check (`--offline` skips network) |

## Hard rules

1. **Never commit secrets.** `.env`, `.dev.vars` and `data/` are gitignored — keep it
   that way. Never print `FULLTEXT_FEED_URL` (it embeds an auth token), not even in
   logs or error messages.
2. **Schema stability.** These are protocol, not text — never translate or rename:
   cookie/KV/localStorage enum values (`klein/gross`, `liste/rubrik`, `links/zentriert`,
   rails `neueste/meist/themen`, `schmal/standard/breit`, `kompakt/komfortabel/grosszuegig`,
   `eckig/rund`, `farbe/duotone/graustufen`), `data-v`/`data-fn`/`data-kind` attributes,
   localStorage keys (`kitFontHead`, `kitColors`, …), KV keys (`config`, `config:prev`,
   `logo:data`, `logo:meta`, `react:<guid>`), the `/rubrik/` URL prefix, and the
   `x-kit-admin` header. UI **labels** live in `functions/_lib/i18n.js` (de + en —
   always add both; `npm test` enforces key parity).
3. **Both runtimes stay green.** After changes run `npm run check && npm test`.
   If you touched routing, also boot `npm run dev` and curl `/`.
4. **Asset versioning is automated.** After any edit to `public/assets/kit.css` or
   `public/assets/kit-*.js`, run `npm run bump-assets` —
   `test/asset-version.test.js` fails until you do.
5. **New routes** need a file under `functions/` (Cloudflare folder routing) AND an
   entry in the `ROUTES` table of `server/routes.ts` —
   `test/routes-consistency.test.js` enforces that both stay in sync.
6. **The paywall cut** depends on `memberHeading` matching the heading text the
   publisher uses in the Steady editor — treat it as data, see `prepareFullText()`.
7. **Only erasable TypeScript** — no `enum`, no `namespace`, no parameter
   properties; the tsconfig (`erasableSyntaxOnly`) enforces it. Node baseline is
   ≥ 22.18 (type stripping). Browser assets stay JS with JSDoc (`checkJs`).

## Good to know

- **Full text join:** the public feed carries teasers only. `posts/[id].js` joins the
  authenticated full-text feed **by normalized title** (`normTitle`) — the GUIDs of
  the two feeds differ! The full-text feed only contains the ~6 newest posts; older
  posts render as teaser + "read on Steady" link. That is expected behavior.
- **Paywall:** the actual paywall (plans, pricing, copy) is configured in the
  **Steady backend**, not here. The kit only inserts `<div id="steady_paywall">`
  before the member heading; Steady's widget gates everything below it client-side
  (content stays in the HTML — that's how Steady's official JS paywall works).
- **Adding a panel control:** token in `kit.css` → setter in `kit-theme.js` →
  control markup in `_lib/panel.js` (data-fn/data-kind/data-v) + labels in `i18n.js`
  (de + en). The generic segment logic in `kit-panel.js` picks it up automatically.
- **Caching:** HTML 5 min (`no-store` with personal cookies), feed 10 min
  (in-memory everywhere + edge cache on Cloudflare — intentionally doubled, don't
  "fix"), logo 10 min (`?v=<ts>` busting), global config 60 s, static assets 7 days.
- **Feed timeout:** the feed fetch aborts after 10 s (`AbortSignal.timeout`) — the
  one deliberate v2 behavior change. It makes the stale-cache fallback reachable
  when Steady hangs instead of blocking the render indefinitely.
- **Golden master:** `node scripts/golden-master.ts v1-final` boots the given v1
  git ref and the working tree against a fixture feed and diffs every route —
  the parity tool of the v2 port (exit 0 = identical, report in `.gm-report/`).
- **Never log secrets:** route request errors through `logError()` from
  `_lib/scrub.ts` — it redacts `FULLTEXT_FEED_URL` and its token from message,
  stack and cause. Don't add bare `console.error` calls on the request path.
- **Login:** the real `<steady-login-button>` web component; an inline snippet shows
  a fallback link after 3 s if the widget doesn't render (ad blockers).
- **Claps** are eventually consistent (KV) — an applause signal, not a metric.
