# Deploy: Uberspace

Popular German shared host; disk is persistent by default (no volume dance).
**Ops:** Uberspace patches the OS and provides TLS for your domains — you run the
app yourself (the service below, updates, and keeping an eye on `data/`).
Assumes a shell on `<user>.uber.space`.

1. **Node version**: the kit needs Node ≥ 22.18 — select Node 24 on the host:
   ```sh
   uberspace tools version use node 24
   node -v    # must show ≥ 22.18
   ```
   (`uberspace tools version list node` shows the available versions.)
2. **Copy the project** to the host (git clone or rsync) into
   `~/steady-page-kit`, create `~/steady-page-kit/.env` with:
   ```
   KIT_ADMIN_CODE=<code>
   FULLTEXT_FEED_URL=<url>   # optional
   PORT=8788
   ```
3. **Service** — `~/etc/services.d/steady-page-kit.ini`:
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
4. **Web backend** (routes the domain to the port):
   ```sh
   uberspace web backend set / --http --port 8788
   ```
5. **Custom domain** (optional):
   ```sh
   uberspace web domain add example.com
   ```
   + DNS per the printed instructions. Then set `siteOrigin` in `kit.config.js`
   and `supervisorctl restart steady-page-kit`.

Data lives in `~/steady-page-kit/data/` — included in normal Uberspace backups.
Verify per SETUP.md §6.
