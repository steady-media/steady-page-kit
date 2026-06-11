# Deploy: Railway (recommended default)

Managed PaaS, ~5 €/month. **Ops:** the platform patches OS and TLS and keeps the
service up — you manage only the app. Runs `npm start` (the Node server); Railway
reads the Node version from `package.json` → `engines` (≥ 22.18, already set in
the template — nothing to configure).

**The volume step is mandatory.** Without a volume at `/app/data`, published
settings, the logo and clap counts are wiped on every redeploy.

Via CLI (`npm i -g @railway/cli` or `npx railway`):

1. ```sh
   railway login
   railway init            # create a new project from this directory
   ```
2. **Volume (mandatory, before the first deploy)**: in the Railway dashboard, open
   the service → right-click → **Attach volume** → mount path `/app/data`
   (1 GB is plenty). (CLI alternative: `railway volume add --mount-path /app/data`.)
3. **Variables**:
   ```sh
   railway variables --set "KIT_ADMIN_CODE=<code>" --set "KIT_DATA_DIR=/app/data"
   railway variables --set "FULLTEXT_FEED_URL=<url>"     # optional — paste, don't echo
   ```
4. **Deploy**: `railway up`
5. **Public URL**: `railway domain` generates a `*.up.railway.app` domain.
6. **Custom domain**: dashboard → service → Settings → Domains; then set
   `siteOrigin` in `kit.config.js` and `railway up` again.
7. **Check the volume took effect**: after the deploy, publish a setting via the
   panel (or `ls /app/data` via `railway ssh`) and redeploy once — the setting
   must survive.

Railway detects Node and runs `npm start` by default; no config file needed.
Single instance only (fs storage is not shared between replicas).
Verify per SETUP.md §6.
