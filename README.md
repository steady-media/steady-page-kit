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
                        ├─ storage: data/ on a Node host · Cloudflare KV · Upstash Redis
                        └─ secrets: KIT_ADMIN_CODE, FULLTEXT_FEED_URL (optional)
```

## Set up in three steps

1. **Copy this template** — "Use this template" on GitHub, or download the zip.
2. **Open the folder in your AI coding tool** — Claude Code, Cursor, Codex,
   Gemini CLI, Amp, … they all find their instructions in this repo.
3. **Say: "Set up my page."** The agent asks for your Steady publication, fills in
   the config, verifies everything and deploys to the host you choose
   (Railway, Render, Fly.io, your own server, Uberspace, Vercel or Cloudflare).

You need: a Steady publication, an AI coding tool, Node ≥ 22.18 (24 LTS
recommended) and an account at the host you pick. No terminal knowledge required —
the agent does the work and proves it with a health check (`npm run doctor`).

## What you get

- **Live content** from your Steady feed, full-text posts via the authenticated
  feed, with the official Steady paywall for member-only sections
- **Real Steady login & checkout** on your own domain (`/memberships`)
- **Design panel** (✦ button): curated looks, 50+ fonts, color schemes, dark mode,
  layouts — publish globally with your admin code, revert anytime
- **Search, reactions (claps), SEO** (sitemap, canonical, Open Graph), RSS proxy
- **German or English** UI (`language` in `kit.config.js`)
- **One codebase, every host**: TypeScript without a build step on the Node path —
  the source runs directly (Node ≥ 22.18); Cloudflare and Vercel bundle at deploy
  time themselves. Zero runtime dependencies.

## Hosting

Fastest path — one click, then fill in your Steady slug + a few values:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/5UjB3l?referralCode=-TGvVk&utm_medium=integration&utm_source=template&utm_campaign=generic)

The kit runs on any Node host with a disk, on Vercel (serverless) and on
Cloudflare Pages. The **OS/TLS/disk** column says who keeps the machine patched,
the certificates fresh and the data persistent — the platform, or you.

| Host | OS/TLS/disk | Cost | Note |
|---|---|---|---|
| **Railway** — recommended | Platform; you attach a volume once | ~5 €/month | Managed PaaS; **one-click via the Railway template** (asks only for your slug + a few values) or end-to-end via CLI — see [docs/agent/deploy/railway.md](docs/agent/deploy/railway.md) |
| Render | Platform; persistent disk add-on | ~7 $/month | Disks are not on the free tier |
| Fly.io | Platform; volume | a few €/month | Pay as you go; keep it at 1 machine |
| Hetzner / any Docker VPS | **You**: OS patches, TLS, backups | from ~4 €/month | For everyone who runs their own server |
| Uberspace | Host patches OS + TLS; you run the app | from 5 €/month | Disk is persistent by default |
| Vercel | Platform; no disk — storage via Upstash Redis | Pro plan | Hobby tier forbids commercial use; Upstash free tier caps the logo upload at ~700 KB |
| Cloudflare Pages | Platform; KV included | $0 | Still fully supported, no longer our default recommendation — existing installs keep running unchanged |

Step-by-step recipes for every host: [`docs/agent/deploy/`](docs/agent/deploy/).

## Manual setup (without an AI tool)

Requirements: Node ≥ 22.18 (24 LTS recommended).

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
Updates & v1→v2 migration: [docs/agent/UPDATE.md](docs/agent/UPDATE.md) ·
Version history: [CHANGELOG.md](CHANGELOG.md)

License: [MIT](LICENSE). Not an official Steady product — a community kit.
