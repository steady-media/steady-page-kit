# Deploy: Render

Runs `npm start` (the Node server). **Requires a persistent disk** mounted at
`/app/data` — without it, published settings/logo/claps are lost on every deploy.
Persistent disks are not on Render's free tier — tell the user (Starter plan).

1. Push the repo to GitHub/GitLab (Render deploys from git). If the user has no
   remote yet, create one (e.g. `gh repo create <name> --private --source . --push`).
2. Create `render.yaml` in the repo root:
   ```yaml
   services:
     - type: web
       name: steady-page-kit
       runtime: node
       plan: starter
       buildCommand: npm install
       startCommand: npm start
       healthCheckPath: /
       envVars:
         - key: KIT_ADMIN_CODE
           sync: false
         - key: FULLTEXT_FEED_URL
           sync: false
         - key: KIT_DATA_DIR
           value: /app/data
       disk:
         name: kit-data
         mountPath: /app/data
         sizeGB: 1
   ```
3. Commit + push, then in the Render dashboard: **New → Blueprint** → select the
   repo. Render reads render.yaml; the user fills in the two secret values when
   prompted (`sync: false` = entered in the dashboard, never in git).
4. After the first deploy, note the `*.onrender.com` URL.
5. **Custom domain**: Render dashboard → Settings → Custom Domains; then set
   `siteOrigin` in `kit.config.js`, commit, push (auto-redeploys).

Single instance only — do not scale to multiple instances (fs storage is not shared).
Verify per SETUP.md §6.
