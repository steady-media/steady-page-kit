# Apply a template

**Paste this into your AI coding tool** (Claude Code, Cursor, Codex, Gemini CLI, …)
with the repo open. Replace `<TEMPLATE>` with a template folder name, e.g. `meridian`.

---

You are applying the **`<TEMPLATE>`** template to this Steady Page Kit. It is a
style-only change. Follow these steps exactly and stop if a check fails.

1. **Read the contract first.** Open `docs/design/TOKENS.md` and
   `templates/<TEMPLATE>/template.md`. The boundary in TOKENS.md §3 is
   off-limits — do not edit the feed, routing, the Steady widget, auth, or
   `kit.config.js`.

2. **Swap the stylesheet.** Copy `templates/<TEMPLATE>/skin.css` over
   `public/assets/kit.css` (replace the whole file).

3. **Remove the customizer panel** (this template ships without it). In
   `functions/_lib/page.ts`, in the `footer()` function, delete:
   - the `<button class="cz-fab" …>…</button>` element,
   - the `${panelHtml()}` call,
   - the `<script src="/assets/kit-panel.js…">` line,
   and remove now-unused imports (`panelHtml` from `./panel.ts`, `ICON_PANEL`).
   Leave the rest of `kit-panel.js`'s features alone — search, load-more and
   claps do not depend on the panel markup, but if you prefer, keep the script
   tag; only the FAB + `panelHtml()` are the "edit panel".

4. **Apply any template extras** listed under "Wiring notes" in
   `templates/<TEMPLATE>/template.md` (e.g. an optional masthead line). Skip ones
   the user didn't ask for.

5. **Bump the asset version.** Run `npm run bump-assets` (required after editing
   `public/assets/kit.css`).

6. **Verify — all must be green:**
   ```
   npm run check && npm test && npm run doctor
   ```
   Then boot `npm run dev` and open `/`, a `/rubrik/<slug>` section page, and a
   `/posts/<id>` post page. Confirm the look matches
   `templates/<TEMPLATE>/preview.html`.

7. **Report** what changed and paste the check output. Do not commit unless the
   user asks.

If the user also wants changes to the look, do **not** hand-edit blindly — follow
`templates/customize.md`.
