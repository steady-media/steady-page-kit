# UPDATE runbook (for coding agents)

Bring an existing installation up to the latest kit version without losing the
publisher's configuration, branding or published data.

## 0 — Which version is installed?

Look at the project root of the installation:

- **`functions/index.js` exists (`.js`!)** → the installation is **v1**
  → follow **Section B** (v1 → v2 replace migration).
- **`functions/index.ts` exists** → the installation is **v2**
  → follow **Section A** (normal update).

## Ownership map (applies to both sections)

**The publisher owns** (never overwrite, always keep):

- `kit.config.js`
- `.env`, `.dev.vars` (never in git anyway)
- `wrangler.toml` → the `name` and the KV namespace `id`
- `data/` (Node hosts: published config, logo, claps — lives on the server, not in git)
- **Brand assets in `public/assets/`**: `logo.png`, `favicon.png`/`favicon.svg` and
  `teaser-fallback.svg` where the publisher replaced them, plus anything the
  publisher added to that folder
- any host files they added (`render.yaml`, `fly.toml`, …)

**The template owns** (take the new version): everything else — `functions/`,
`server/`, `api/`, `scripts/`, `test/`, the stock files in `public/assets/`
(`kit.css`, `kit-theme.js`, `kit-panel.js`), `package.json`, `tsconfig*.json`,
`vercel.json`, `Dockerfile`, docs.

A template-owned file can still carry a publisher patch (e.g. an extra rule in
`kit.css`, a changed line in a renderer). Those are **template-code patches**:
note what each patch does, take the new template file, re-apply the patch on top.

## Section A — v2 → v2.x update

### A1 — repo was created from the GitHub template (or any git copy)

```sh
git remote add upstream https://github.com/seboess/steady-page-kit.git   # once
git fetch upstream
git merge upstream/main
```

Resolve conflicts using the ownership map above (publisher files: keep ours;
template files: take upstream; template-code patches: take upstream, re-apply the
patch). Typical conflict: `wrangler.toml` — keep the publisher's `name`/KV `id`,
take everything else.

### A2 — no git history (zip download)

1. Download the latest template zip, unpack next to the project.
2. Copy over everything EXCEPT the publisher-owned files listed above.
3. Diff `kit.config.js` against the template's new `kit.config.js` — if the
   template added new fields, add them (with defaults) to the publisher's file.
4. Re-apply any template-code patches the installation had.

### A3 — always afterwards

```sh
npm install
npm run check && npm test
npm run doctor            # exit 0 = ready (⚠️ warnings are ok, ❌ are not)
```

If you re-applied patches to `public/assets/kit.css` or `public/assets/kit-*.js`,
run `npm run bump-assets`. For untouched assets the template has already bumped
`ASSET_VERSION` — do not bump again. Then redeploy with the same recipe as the
original setup (`docs/agent/deploy/`) and verify per SETUP.md §6.

## Section B — v1 → v2 replace migration

v2 is a TypeScript in-place port: **every v1 path exists in v2, only the extension
changed** (`.js` → `.ts`). Routes, KV keys, cookies, the panel protocol and
`kit.config.js` are unchanged. Strategy: do not patch the old tree file by file —
put the new template **next to** it, carry over what the publisher owns,
re-apply their patches, verify, redeploy.

### B1 — inventory the fork

List every file that differs from the v1 template the installation started from:

- **With git history**: `git diff <v1-upstream-ref> --stat` — `<v1-upstream-ref>`
  is the last pure template state (the tag/commit the repo was created from, or
  the upstream remote's v1 branch).
- **Without git**: collect the list of files changed by hand. A `FORK-NOTES.md`
  (if the installation keeps one) is the best source; otherwise compare against a
  freshly downloaded v1 template copy.

Sort the list into three buckets:

1. **Publisher files** (see ownership map) → carried over in B3.
2. **Brand assets in `public/assets/`** (`logo.png`, replaced `favicon.*`,
   replaced `teaser-fallback.svg`, anything added) → carried over in B3.
3. **Template-code patches** (e.g. an edited rule in `kit.css`, a changed favicon
   link in `functions/_lib/page.js`) → note file + what the patch does;
   re-applied in B4 via the path table.

### B2 — unpack the v2 template next to the project

Get the latest template ("Use this template" on GitHub, zip download, or
`git clone`) into a **sibling directory**. Do not unpack into the v1 tree.

### B3 — carry over publisher files + brand assets

Copy from the v1 project into the new v2 directory (skip what doesn't exist):

- `kit.config.js` — v2's copy only adds an optional JSDoc header
  (`// @ts-check` + `/** @type {...} */`); you may copy those two lines into the
  publisher's file for IDE/typecheck support, everything works without them.
- `.env` and/or `.dev.vars`
- `wrangler.toml` — or just transfer its `name =` and KV `id =` into the v2 file
- `data/` — Node hosts; on the server this directory stays on the persistent
  disk/volume and never moves at all
- the brand assets from bucket 2 (`public/assets/logo.png`, `favicon.*`, …)
- host files the installation added (`render.yaml`, `fly.toml`, …)

### B4 — re-apply template-code patches (bucket 3)

Same path, new extension:

| v1 file | v2 file |
|---|---|
| `functions/**/*.js` | same path, `.ts` |
| `server/fs-kv.js` | `server/fs-kv.ts` |
| `server/node.js` | `server/node.ts` (v2's `server/node.js` is only a thin bootstrap) |
| `server/env.js`, `scripts/doctor.js` | unchanged (stay `.js`) |
| `public/assets/kit.css`, `kit-theme.js`, `kit-panel.js` | unchanged (stay CSS/JS) |
| `kit.config.js` | unchanged (plain JS, publisher file) |

The code inside is typed but otherwise the v1 code — patches usually apply 1:1.
After re-applying, verify each patch actually landed (e.g. grep the changed
value in the v2 file). New in v2 (no v1 counterpart, nothing to migrate):
`server/routes.ts`, `server/kv-redis-rest.ts`, `server/vercel.ts`,
`api/index.ts`, `functions/_lib/auth.ts`, `functions/_lib/scrub.ts`,
`functions/_lib/types.ts`.

### B5 — asset version

If (and only if) you re-applied patches to `public/assets/kit.css` or
`public/assets/kit-*.js`: run `npm run bump-assets`
(`test/asset-version.test.js` fails until you do). The script has no
dependencies — it works before `npm install`.

### B6 — verify

In the new v2 directory:

```sh
npm install
npm run check && npm test
npm run doctor            # exit 0 = ready (⚠️ warnings are ok, ❌ are not)
```

If `npm run doctor` reports a missing admin code even though the installation has
one: the secrets live in `.env`/`.dev.vars` — make sure B3 copied them.

### B7 — switch the deployment over

Redeploy **with the same recipe the installation used before**
(`docs/agent/deploy/`). You replace the project content (git push, `railway up`,
`npm run deploy:cf`, …), not the platform:

- **Cloudflare Pages: same Pages project, same KV binding, same wrangler.toml
  values — NO platform switch, no KV migration.** Published settings, logo and
  claps stay where they are.
- **Node hosts**: same service, same persistent disk/volume — `data/` on the
  server carries the published state across the redeploy.

### B8 — host Node version

v2 needs **Node ≥ 22.18** on the host (the server refuses to start below, with a
clear message). The template pins this where the platform reads it
(`package.json` → `engines`, `Dockerfile` → `node:24`); on self-managed hosts
(VPS without Docker, Uberspace) check `node -v` yourself — the recipe of each
host has the exact step.

Finally verify per SETUP.md §6.
