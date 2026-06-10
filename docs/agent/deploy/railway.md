# Deploy: Railway

Runs `npm start`. **Requires a Railway volume** mounted at `/app/data` — without it,
published settings/logo/claps are lost on every deploy.

Via CLI (`npm i -g @railway/cli` or `npx railway`):

1. ```sh
   railway login
   railway init            # create a new project from this directory
   ```
2. **Volume** (before first deploy): in the Railway dashboard, open the service →
   right-click → **Attach volume** → mount path `/app/data` (1 GB is plenty).
   (CLI alternative: `railway volume add --mount-path /app/data`.)
3. **Variables**:
   ```sh
   railway variables --set "KIT_ADMIN_CODE=<code>" --set "KIT_DATA_DIR=/app/data"
   railway variables --set "FULLTEXT_FEED_URL=<url>"     # optional — paste, don't echo
   ```
4. **Deploy**: `railway up`
5. **Public URL**: `railway domain` generates a `*.up.railway.app` domain.
6. **Custom domain**: dashboard → service → Settings → Domains; then set
   `siteOrigin` in `kit.config.js` and `railway up` again.

Railway detects Node and runs `npm start` by default; no config file needed.
Single instance only (fs storage is not shared between replicas).
Verify per SETUP.md §6.
