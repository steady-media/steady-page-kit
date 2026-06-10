# UPDATE runbook (for coding agents)

Bring an existing installation up to the latest kit version without losing the
publisher's configuration.

## Ownership map

**The publisher owns** (never overwrite, always keep):
- `kit.config.js`
- `.env`, `.dev.vars` (never in git anyway)
- `wrangler.toml` → the `name` and the KV namespace `id`
- `data/` (Node hosts: published config, logo, claps — lives on the server, not in git)
- any custom host files they added (`render.yaml`, `fly.toml`, …)

**The template owns** (take the new version): everything else — `functions/`,
`server/`, `public/assets/`, `scripts/`, `test/`, docs.

## Path A — repo was created from the GitHub template (or any git copy)

```sh
git remote add upstream https://github.com/seboess/steady-page-kit.git   # once
git fetch upstream
git merge upstream/main
```
Resolve conflicts using the ownership map above (publisher files: keep ours;
template files: take upstream). Typical conflict: `wrangler.toml` — keep the
publisher's `name`/KV `id`, take everything else.

## Path B — no git history (zip download)

1. Download the latest template zip, unpack next to the project.
2. Copy over everything EXCEPT the publisher-owned files listed above.
3. Diff `kit.config.js` against the new `kit.config.js` of the template — if the
   template added new fields, add them (with defaults) to the publisher's file.

## Always afterwards

```sh
npm install
npm run check && npm test
npm run doctor
```
Then redeploy with the same recipe as the original setup (`docs/agent/deploy/`),
and verify per SETUP.md §6. If `public/assets/` changed, the template has already
bumped `ASSET_VERSION` — do not bump it yourself during an update.
