# Deploy: Vercel

Serverless functions — **no persistent disk**, so storage goes through
**Upstash Redis (REST)**. The entry (`api/index.ts` + `vercel.json`) ships with
the template; Vercel bundles the TypeScript at deploy time and serves `public/`
statically. **Ops:** the platform patches OS and TLS — you manage only the app.

**Plan notes — read before choosing Vercel:**

- Vercel's **Hobby (free) plan forbids commercial use** (Vercel ToS). Publisher
  pages with paid memberships are commercial → use the **Pro plan**.
- **Upstash's free tier caps requests at 1 MB.** Logo uploads travel
  base64-encoded, so uploads work up to **~700 KB**; the kit's full 1.5-MB logo
  contract needs a paid Upstash tier. Everything else fits the free tier.

1. **Upstash Redis database**: in the Vercel dashboard → Storage → Marketplace →
   **Upstash for Redis** (this links the database and sets the env vars on the
   project automatically). Alternative: create a database at upstash.com and copy
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from its REST API section.
2. **Login + link** (CLI: `npm i -g vercel` or `npx vercel`):
   ```sh
   npx vercel login
   npx vercel link          # create/select the Vercel project for this directory
   ```
3. **Environment variables** (skip the two Upstash ones if the Marketplace set them):
   ```sh
   npx vercel env add UPSTASH_REDIS_REST_URL production
   npx vercel env add UPSTASH_REDIS_REST_TOKEN production
   npx vercel env add KIT_ADMIN_CODE production
   npx vercel env add FULLTEXT_FEED_URL production    # optional — paste, don't echo
   ```
4. **Deploy**: `npx vercel deploy --prod` → note the `*.vercel.app` URL.
5. **Custom domain**: dashboard → project → Settings → Domains (or
   `npx vercel domains add <domain>`); then set `siteOrigin` in `kit.config.js`
   and deploy again.

Note: after changing `kit.config.js` you must redeploy — the config is bundled at
deploy time. Verify per SETUP.md §6.
