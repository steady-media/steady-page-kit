# SETUP runbook (for coding agents)

You are setting up a **steady-page-kit** site for a Steady publisher. Follow these
steps **in order**. Talk to the user in their language; this document is English so
every agent reads it reliably. Do not skip verification steps — `npm run doctor`
exit 0 is the success signal.

Outcome: a configured `kit.config.js`, secrets in place, the site verified locally,
deployed to the host the user chose, and a final checklist delivered to the user.

## 0 — Preflight

1. **Node version first**: `node -v` → must be **≥ 22.18** (24 LTS recommended —
   the server refuses to start below 22.18). If missing/too old, help the user
   install Node 24 LTS (nodejs.org or `brew install node@24`) before continuing.
2. `npm install` — installs the dev dependencies (typescript, wrangler). There are
   no runtime dependencies; production hosts need nothing beyond Node.
3. `npm run check && npm test` → must pass on a fresh clone. If not, stop and report.

## 1 — Interview the user

Ask (in the user's language, conversationally — not as a form):

1. **Steady publication**: "What's your Steady page URL or slug?" — accept anything:
   `sebastian`, `https://steady.page/sebastian`, `steadyhq.com/de/xyz/about`.
   The kit normalizes it, but extract the slug yourself for the discovery step.
2. **Site name**: offer the channel title you'll discover in step 2 as the default.
3. **Language**: `de` or `en` (UI language of the page).
4. **Hosting**: where should the site live? Present in this order, one sentence each:
   - **Railway (recommended)** — the platform runs the machine (OS, TLS, uptime),
     ~5 €/month, and the agent can deploy everything via CLI.
   - **Render / Fly.io** — also managed Node hosting; persistent disk/volume add-on.
   - **Docker / own server (e.g. Hetzner) / Uberspace** — for users who manage
     their server themselves (OS patches, TLS, backups are on them).
   - **Vercel** — serverless; needs an Upstash Redis database for storage, and the
     Hobby plan forbids commercial use (publisher pages → Pro plan).
   - **Cloudflare Pages** — $0, if budget matters more than independence; still
     fully supported, just no longer the default recommendation.
   Match the recipe in `docs/agent/deploy/`.
5. **Admin code**: the password for publishing settings/logo globally. Offer to
   generate one: `openssl rand -base64 24` — use at least 16 random characters
   (`npm run doctor` warns below 12). Tell the user to store it in their
   password manager.
6. **Full-text feed (optional but recommended for paywalled posts)**: In the Steady
   backend the publisher finds the authenticated RSS URL under
   **Settings → RSS feed** (the URL contains an auth token). Without it the site
   shows teasers + a "read on Steady" link instead of full text. The user can add
   it later — don't block setup on it.
7. **Custom domain** (optional): note it for `siteOrigin` and the host's domain setup.

## 2 — Auto-discovery (do this yourself, don't ask the user)

With `<slug>` from the interview:

1. **Verify the feed**: `curl -sS -A "SteadyPageKit-Setup" "https://steady.page/<slug>/rss" | head -c 2000`
   - Expect HTTP 200 and `<rss`. Extract `<title>` (channel title → default site name)
     and `<description>`.
   - If it fails: the slug is wrong — show the user what you tried, ask again.
2. **Find the publication id (UUID)**:
   `curl -sS -A "SteadyPageKit-Setup" "https://steady.page/<slug>" | grep -o 'widget_loader/[0-9a-f-]\{36\}' | head -1`
   - The UUID after `widget_loader/` is `steady.publicationId`.
   - **Fallback** if the regex finds nothing (Steady markup may change): ask the user
     to open their own steady.page site in a browser, view page source, search for
     `widget_loader` and paste the line. Without the id the site still works, but
     login/paywall/checkout are disabled — say so.
3. **Member heading** (paywall marker): ask the user what heading starts the
   members-only part in their Steady posts (default: „Mitglieder-Bereich" for de,
   "Members only" for en). It must match the heading text in the editor exactly.

## 3 — Write the configuration

1. Fill **`kit.config.js`** with the interview + discovery results
   (publication, author, language, siteOrigin if known, steady.slug,
   steady.publicationId, memberHeading if non-default). Leave the rest at defaults.
2. Create **`.env`** (Node hosts) and/or **`.dev.vars`** (Cloudflare local dev) from
   the examples:
   ```
   KIT_ADMIN_CODE=<the admin code>
   FULLTEXT_FEED_URL=<authenticated feed URL, if provided>
   ```
   Never commit these files. Never echo `FULLTEXT_FEED_URL` back into the chat or logs.

## 4 — Verify locally

1. `npm run doctor` → fix every ❌ before continuing (⚠️ are acceptable; explain them
   to the user).
2. `npm run dev` (background), then:
   - `curl -s http://localhost:8788/ | grep -o "<title>[^<]*"` → contains the site name.
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:8788/rss` → `200`.
   - `curl -s http://localhost:8788/api/config` → `{}` or JSON (200).
3. `npm test` → green.
4. If anything fails: diagnose (feed reachable? config typo?), fix, repeat.

## 5 — Deploy

Open the recipe for the chosen host and follow it exactly:

| Host | Recipe |
|---|---|
| Railway (recommended) | `docs/agent/deploy/railway.md` |
| Render | `docs/agent/deploy/render.md` |
| Fly.io | `docs/agent/deploy/fly.md` |
| Docker / own server (e.g. Hetzner) | `docs/agent/deploy/docker-vps.md` |
| Uberspace | `docs/agent/deploy/uberspace.md` |
| Vercel | `docs/agent/deploy/vercel.md` |
| Cloudflare Pages | `docs/agent/deploy/cloudflare.md` |

All Node hosts need a **persistent disk** mounted at the data directory — without it,
published settings, the logo and clap counts reset on every redeploy. The recipes
cover this; never skip that part. (Vercel has no disk and stores in Upstash Redis
instead; Cloudflare stores in KV — their recipes cover that.)

## 6 — Post-deploy verification + handover

1. `curl -s -o /dev/null -w "%{http_code}" https://<deployed-url>/` → `200`;
   `curl -s https://<deployed-url>/ | grep -o "<title>[^<]*"` → site name.
2. `curl -s https://<deployed-url>/api/config` → 200.
3. Update `kit.config.js` → `siteOrigin` with the final URL (and redeploy) if it
   wasn't known before.
4. Hand the user a short checklist (their language):
   - ✅ Site URL + what was deployed where.
   - 🔑 Admin code: stored where? Needed for "publish for all visitors" in the panel.
   - ⚙️ **Steady backend**: set the checkout URL of the publication to
     `https://<domain>/memberships` so the on-site checkout works.
   - 🌐 Custom domain: how to connect it on the chosen host (recipe has the steps),
     then update `siteOrigin` + redeploy.
   - 🎨 Design: open the site, click the ✦ button (bottom right), pick a look,
     then "publish for all visitors" with the admin code.
   - 📡 Full-text feed: where to find it in the Steady backend, if not set up yet.

If any check failed and you cannot fix it, say exactly what works, what doesn't,
and what you tried — do not declare success.
