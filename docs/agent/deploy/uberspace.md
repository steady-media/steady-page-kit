# Deploy: Uberspace

Popular German shared host; disk is persistent by default (no volume dance).
Assumes a shell on `<user>.uber.space`.

1. **Copy the project** to the host (git clone or rsync) into
   `~/steady-page-kit`, create `~/steady-page-kit/.env` with:
   ```
   KIT_ADMIN_CODE=<code>
   FULLTEXT_FEED_URL=<url>   # optional
   PORT=8788
   ```
2. **Service** — `~/etc/services.d/steady-page-kit.ini`:
   ```ini
   [program:steady-page-kit]
   directory=%(ENV_HOME)s/steady-page-kit
   command=node server/node.js
   autostart=true
   autorestart=true
   ```
   ```sh
   supervisorctl reread && supervisorctl update && supervisorctl start steady-page-kit
   ```
3. **Web backend** (routes the domain to the port):
   ```sh
   uberspace web backend set / --http --port 8788
   ```
4. **Custom domain** (optional):
   ```sh
   uberspace web domain add example.com
   ```
   + DNS per the printed instructions. Then set `siteOrigin` in `kit.config.js`
   and `supervisorctl restart steady-page-kit`.

Data lives in `~/steady-page-kit/data/` — included in normal Uberspace backups.
Verify per SETUP.md §6.
