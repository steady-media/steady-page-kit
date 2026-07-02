# Customize a template

**Paste this into your AI coding tool** with the repo open, then describe what you
want in plain language ("use my orange #E86A2C", "rounder corners", "make the
headlines bigger", "centered hero", "hide card excerpts").

---

You are customizing the currently-applied Steady Page Kit skin
(`public/assets/kit.css`). Work within the contract — never touch the boundary in
`docs/design/TOKENS.md §3` (feed, routing, Steady widget, auth, `kit.config.js`).

**Classify each request, then apply the smallest change that satisfies it.**

### Tier‑1 — token edits (prefer these)
If the request maps to a design token, edit only the `:root` block. Reference the
token table in `docs/design/TOKENS.md §1`. Examples:
- brand color → `--color-brand` (+ `--color-brand-deep` one shade darker)
- background warmth → `--color-bg` / `--color-bg-2` / `--color-line`
- type scale → `--fs`, or a specific `--text-*`
- corner radius → `--radius-card` / `--radius-btn`
- cards per row → `--grid-cols`
- font → `--font-head` / `--font-body` (also update the font `@import`/`<link>`)

### Tier‑2 — component edits (only when Tier‑1 can't express it)
Edit the specific component rule for a class in the contract
(`docs/design/TOKENS.md §2`). Keep the class names. Examples:
- "centered hero" → add `text-align:center` + collapse `.hero__grid` to one column
- "hide excerpts" → `.card__excerpt{display:none}`
- "full-bleed hero image" → widen `.hero__media` / restructure `.hero__grid`
Make the change once, in one place; don't scatter overrides.

### Always
1. Preserve contrast and accessibility (don't make ink-soft too light on paper).
2. Keep it consistent — a token change should cascade; avoid one-off hardcoded colors.
3. `npm run bump-assets`, then **verify**:
   `npm run check && npm test && npm run doctor`, and eyeball `/`, a section, a post.
4. Summarize the exact tokens/rules you changed so the edit is auditable.

If a request is really "a different design," suggest applying a different template
via `templates/apply-template.md` instead of forcing this one.
