# Deploy: Railway (recommended default)

Managed PaaS, ~5 €/month. **Ops:** the platform patches OS and TLS and keeps the
service up — you manage only the app. Runs `npm start` (the Node server); Railway
reads the Node version from `package.json` → `engines` (≥ 22.18, already set) and
the deploy config from `railway.json` (start command + healthcheck on
`/robots.txt`) — nothing to configure.

**The volume step is mandatory.** Without a volume at `/app/data`, published
settings, the logo and clap counts are wiped on every redeploy.

---

## Path A — one-click template (for publishers, no CLI)

This is the path the Steady backend / the setup agent hands the publisher: a
single **Deploy on Railway** button that asks for a few values and ships a live
site. No git clone, no file editing.

The button lives wherever the publisher starts (Steady backend card, README):

```markdown
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/steady-page-kit?referralCode=-TGvVk)
```

The publisher fills in these template variables during the one-click flow
(env-based config — no `kit.config.js` edit needed; see "How env config works"):

| Variable | Required | Example / note |
|---|---|---|
| `STEADY_SLUG` | yes | `sebastian` — the part after `steady.page/`. Derives the feed + login URL. |
| `STEADY_PUBLICATION_ID` | yes | the publication UUID (loads the Steady widget: login/paywall/checkout). |
| `SITE_ORIGIN` | yes | the final URL, e.g. `https://your-domain` (no trailing slash). |
| `KIT_ADMIN_CODE` | yes | a long random code (the template can auto-generate one). Gates global publishing. |
| `KIT_DATA_DIR` | yes | `/app/data` — must match the volume mount path below. |
| `FULLTEXT_FEED_URL` | optional | the authenticated full-text feed (secret — paste, never log). |

The template also bundles a **volume mounted at `/app/data`** (mandatory) so
published settings/logo/claps survive redeploys.

### How to create the Railway template (one-time, by the kit owner)

1. Push this repo to GitHub (already done: `steady-media/steady-page-kit`).
2. Railway dashboard → **New → Template** → point it at the repo.
3. Add a **volume** to the service, mount path `/app/data`.
4. Declare the template variables from the table above (mark secrets as secret).
5. Publish the template. Railway gives you a `railway.com/deploy/<code>` URL —
   that URL carries your account, so deployments count toward the
   **Template Kickback (25%)** and, paired with your **affiliate link (15%)**,
   the hosting referral.

The live template is `railway.com/deploy/steady-page-kit` (owner: Steady, referral
`-TGvVk`) — already wired into the button above and the READMEs. To point it at a
different template, replace that slug everywhere it appears.

Verify current affiliate/kickback terms at `railway.com/affiliate-program` and
`docs.railway.com/community/affiliate-program` before relying on them.

---

## Path B — CLI (for developers, full control)

Via CLI (`npm i -g @railway/cli` or `npx railway`):

1. ```sh
   railway login
   railway init            # create a new project from this directory
   ```
2. **Volume (mandatory, before the first deploy)**: dashboard → service →
   right-click → **Attach volume** → mount path `/app/data` (1 GB is plenty).
   (CLI: `railway volume add --mount-path /app/data`.)
3. **Variables** (env config — either `STEADY_SLUG` or the explicit URLs):
   ```sh
   railway variables --set "STEADY_SLUG=<slug>" --set "STEADY_PUBLICATION_ID=<uuid>" \
     --set "SITE_ORIGIN=https://<your-domain>" \
     --set "KIT_ADMIN_CODE=<code>" --set "KIT_DATA_DIR=/app/data"
   railway variables --set "FULLTEXT_FEED_URL=<url>"     # optional — paste, don't echo
   ```
   (A filled `kit.config.js` in the repo also works and takes the same role; env
   wins per-request.)
4. **Deploy**: `railway up`
5. **Public URL**: `railway domain` generates a `*.up.railway.app` domain.
6. **Custom domain**: dashboard → service → Settings → Domains; then set
   `SITE_ORIGIN` (or `siteOrigin` in `kit.config.js`) to the final URL and
   `railway up` again.
7. **Check the volume took effect**: publish a setting via the panel (or
   `ls /app/data` via `railway ssh`) and redeploy once — the setting must survive.

---

## How env config works (one-click without editing kit.config.js)

The kit's publisher identity normally lives in `kit.config.js`. For one-click
deploys it also reads env overrides, so the template can ask for values instead:
- `STEADY_SLUG` derives the public feed URL and the Steady login URL (precedence:
  explicit `FEED_URL` > `STEADY_SLUG` > `kit.config.js`).
- `STEADY_PUBLICATION_ID`, `SITE_ORIGIN`, `STEADY_LOGIN_URL`, `FEED_URL`,
  `ANALYTICS_TOKEN` override per request.
- The publication ID and site origin cannot be derived — the publisher always
  provides those.

Single instance only (fs storage is not shared between replicas). Verify per
SETUP.md §6.
