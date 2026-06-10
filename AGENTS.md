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
- `functions/` — Cloudflare-Pages-style handlers, pure `(context) → Response`.
  They run unchanged on **two runtimes**:
  - **Cloudflare Pages**: folder routing, KV via the `KIT_KV` binding (wrangler.toml).
  - **Node anywhere** (Render, Railway, Fly, Docker, VPS, Uberspace): `server/node.js`
    replays the same handlers behind `node:http`; `server/fs-kv.js` emulates KV on
    disk (`data/`, override with `KIT_DATA_DIR`).
- `functions/_lib/` — config derivation (`config.js`), i18n (`i18n.js`), feed
  fetch/parse (`feed.js`), settings/cookie precedence (`settings.js`), renderers
  (`render.js`, `page.js`, `panel.js`).
- `public/assets/` — client JS (`kit-theme.js` catalogs + setters, `kit-panel.js`
  panel logic) and CSS design tokens (`kit.css`).
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
| `npm run check` | Syntax check of every JS file |
| `npm test` | Unit + server tests (`node --test`) |
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
4. **Bump `ASSET_VERSION`** in `functions/_lib/config.js` whenever you edit
   `public/assets/kit.css` or `public/assets/kit-*.js` (cache buster).
5. **New routes** must be added in BOTH places: as a file under `functions/` (Cloudflare
   folder routing) and in the `ROUTES` table of `server/node.js`.
6. **The paywall cut** depends on `memberHeading` matching the heading text the
   publisher uses in the Steady editor — treat it as data, see `prepareFullText()`.

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
- **Login:** the real `<steady-login-button>` web component; an inline snippet shows
  a fallback link after 3 s if the widget doesn't render (ad blockers).
- **Claps** are eventually consistent (KV) — an applause signal, not a metric.
