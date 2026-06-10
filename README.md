# steady-page-kit

**[Deutsch → README.de.md](README.de.md)**

Your own website for your [Steady](https://steadyhq.com) publication — set up by the
AI coding tool of your choice, hosted wherever you want.

Your Steady RSS feed is the CMS: posts, categories, images and teasers appear on
your page automatically. The official Steady widget handles login, paywall and
checkout. A built-in design panel lets you restyle everything — fonts, colors,
layout, logo — and publish the result for all visitors with one click.

```
Steady (CMS) ──RSS──▶ kit (SSR, 10-min cache) ──HTML──▶ visitors
                        │
                        ├─ storage: Cloudflare KV  or  data/ on any Node host
                        └─ secrets: KIT_ADMIN_CODE, FULLTEXT_FEED_URL (optional)
```

## Set up in three steps

1. **Copy this template** — "Use this template" on GitHub, or download the zip.
2. **Open the folder in your AI coding tool** — Claude Code, Cursor, Codex,
   Gemini CLI, Amp, … they all find their instructions in this repo.
3. **Say: "Set up my page."** The agent asks for your Steady publication, fills in
   the config, verifies everything and deploys to the host you choose
   (Cloudflare, Render, Railway, Fly.io, Docker/your own server, Uberspace).

You need: a Steady publication, an AI coding tool, and an account at the host you
pick. No terminal knowledge required — the agent does the work and proves it with
a health check (`npm run doctor`).

## What you get

- **Live content** from your Steady feed, full-text posts via the authenticated
  feed, with the official Steady paywall for member-only sections
- **Real Steady login & checkout** on your own domain (`/memberships`)
- **Design panel** (✦ button): curated looks, 50+ fonts, color schemes, dark mode,
  layouts — publish globally with your admin code, revert anytime
- **Search, reactions (claps), SEO** (sitemap, canonical, Open Graph), RSS proxy
- **German or English** UI (`language` in `kit.config.js`)
- **Two runtimes, one codebase**: Cloudflare Pages (KV) or plain Node 20+ anywhere
  (filesystem storage) — zero runtime dependencies

## Manual setup (without an AI tool)

1. Fill in [`kit.config.js`](kit.config.js) — the comments explain every field.
2. Copy `.env.example` → `.env` and set `KIT_ADMIN_CODE` (plus the optional
   full-text feed URL from your Steady backend).
3. `npm install && npm run dev` → http://localhost:8788, check with `npm run doctor`.
4. Deploy: recipes in [`docs/agent/deploy/`](docs/agent/deploy/) (they work for
   humans too). In your Steady backend, point the checkout URL to
   `https://your-domain/memberships`.

## For developers & agents

Architecture, commands and hard rules: [AGENTS.md](AGENTS.md).
Setup runbook: [docs/agent/SETUP.md](docs/agent/SETUP.md) ·
Updates: [docs/agent/UPDATE.md](docs/agent/UPDATE.md)

License: [MIT](LICENSE). Not an official Steady product — a community kit.
