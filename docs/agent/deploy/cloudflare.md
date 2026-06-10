# Deploy: Cloudflare Pages

Storage: Cloudflare KV (no disk needed). Free tier is fine.
Prerequisite: a Cloudflare account (free) — the user signs up at dash.cloudflare.com.

1. **Login** (opens a browser window for the user):
   ```sh
   npx wrangler login
   ```
2. **Pick a project name** (lowercase, hyphens; e.g. the slug):
   edit `wrangler.toml` → `name = "<project-name>"`.
3. **Create the KV namespace** and put its id into `wrangler.toml`:
   ```sh
   npx wrangler kv namespace create KIT_KV
   ```
   Copy the printed `id` into the `[[kv_namespaces]]` block (binding stays `KIT_KV`).
4. **Create the Pages project + first deploy**:
   ```sh
   npm run deploy:cf
   ```
   Wrangler asks to create the project on first run — confirm. Note the
   `*.pages.dev` URL it prints.
5. **Set production secrets** (prompted interactively, or pipe the value):
   ```sh
   npx wrangler pages secret put KIT_ADMIN_CODE --project-name <project-name>
   npx wrangler pages secret put FULLTEXT_FEED_URL --project-name <project-name>   # optional
   ```
6. **Redeploy** so the secrets are live: `npm run deploy:cf`
7. **Custom domain** (optional): Cloudflare dashboard → Workers & Pages →
   <project> → Custom domains → add. Then set `siteOrigin` in `kit.config.js`
   to the final URL and `npm run deploy:cf` again.

Verify per SETUP.md §6. Note: after changing `kit.config.js` you must redeploy —
the config is bundled at deploy time.
