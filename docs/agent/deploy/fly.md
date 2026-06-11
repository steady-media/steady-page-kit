# Deploy: Fly.io

Uses the repo's Dockerfile (pins `node:24` — the required Node ≥ 22.18 comes for
free). **Ops:** the platform patches the host OS and terminates TLS — you manage
the app and the machine count. **Requires a Fly volume** mounted at `/app/data` —
without it, published settings/logo/claps are lost on every deploy.

1. Install/login: `fly auth login` (CLI: https://fly.io/docs/flyctl/install/).
2. Create `fly.toml` in the repo root (pick a unique app name + nearby region):
   ```toml
   app = "<app-name>"
   primary_region = "fra"

   [build]

   [env]
     KIT_DATA_DIR = "/app/data"
     PORT = "8788"

   [http_service]
     internal_port = 8788
     force_https = true
     auto_stop_machines = "stop"
     auto_start_machines = true
     min_machines_running = 0

   [mounts]
     source = "kit_data"
     destination = "/app/data"

   [[vm]]
     size = "shared-cpu-1x"
   ```
3. ```sh
   fly apps create <app-name>
   fly volumes create kit_data --region fra --size 1
   fly secrets set KIT_ADMIN_CODE=<code>
   fly secrets set FULLTEXT_FEED_URL=<url>      # optional — paste, don't echo
   fly deploy
   ```
4. URL: `https://<app-name>.fly.dev`. Custom domain: `fly certs add <domain>` +
   DNS per the printed instructions; then set `siteOrigin` in `kit.config.js`
   and `fly deploy` again.

Keep it at **one machine** (fs storage): `fly scale count 1`.
Note: with `min_machines_running = 0` the first request after idle takes ~1s to wake.
Verify per SETUP.md §6.
