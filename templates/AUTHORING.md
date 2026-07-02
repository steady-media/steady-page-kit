# Authoring a template

A guide for building your own Steady Page Kit template. A template is **style
only**: a single stylesheet that restyles the pages the kit already renders from a
Steady feed. You never touch the feed, routing, login, paywall, or checkout — which
is why a template can't break a site.

## 0. Prerequisites

- Node ≥ 22.18 and this repo (`npm install`).
- Read [`docs/design/TOKENS.md`](../docs/design/TOKENS.md) once — it's the contract
  you target: the design **tokens** you tune, the **class names** you style, and the
  **boundary** you must not cross.

## 1. The mental model

Two layers, and you only own the second:

- **Data + plumbing (fixed):** feed → posts, `kit.config.js` → identity, the Steady
  widget → login/paywall/checkout, routing. Off-limits.
- **The design (yours):** the tokens in `:root` and the styles for the documented
  classes (`.hero`, `.card`, `.rubrik__feature`, `.post`, …).

A template ships as one folder:

```
templates/<your-name>/
  skin.css       complete replacement for public/assets/kit.css (styles the whole
                 class contract; no customizer panel)
  template.md    the spec: mood, fonts, palette, customization knobs
  preview.html   links ./skin.css with placeholder content → preview == applied result
```

## 2. Start from Blueprint (recommended)

`templates/blueprint/` is the neutral, fully-labeled skeleton. Copy it and make it
yours:

```bash
cp -r templates/blueprint templates/aurora     # your template name
```

Then, in `templates/aurora/skin.css`:

1. **Delete the labels block** (the `component labels` section — the `::before`
   tags and dashed outlines). That scaffolding is only for reading the skeleton.
2. **Set your tokens** in `:root` — fonts, colors, radii, spacing, grid columns.
   Most of your design lives here; components read these tokens.
3. **Restyle component by component** — header, hero, cards, sections, post page,
   footer. Keep the class names; change the looks.
4. Keep `.card__pin,.cz-fab{display:none!important;}` — the kit still emits that
   customizer chrome; a no-panel template must hide it.

Update `template.md` (mood, fonts, palette, knobs) and `preview.html` (swap in your
own placeholder content if you like — it already links `./skin.css`).

## 3. Preview loop

**Fast (no server):** open `templates/<name>/preview.html` in a browser. Edit
`skin.css`, refresh. Instant. Best for the bulk of styling.

**On real feed data** (catches things placeholder content can't — e.g. long titles,
missing images, the pin chrome): use the helper, which swaps your skin into the kit
and starts the dev server, then restores on exit.

```bash
node scripts/preview-template.js aurora   # swap in, print next steps
npm run dev                               # serve at http://localhost:8788 (hard-refresh to bust CSS cache)
node scripts/preview-template.js --restore   # put the real kit.css back when done
```

> Tip: point the dev server at any public Steady feed with `FEED_URL`, e.g.
> `FEED_URL=https://steady.page/<slug>/rss npm run dev`.

## 4. Completeness checklist

A store-quality template:

- [ ] Styles **every** group in [`TOKENS.md §2`](../docs/design/TOKENS.md) —
      header, hero + `.aufmacher`, pills, grid/cards, all three section layouts
      (feature/cards/compact), portal rails, load-more, the **post page**, search
      modal, footer.
- [ ] Hides `.card__pin` and `.cz-fab`.
- [ ] Exposes customization through the `:root` token block (so it's tunable).
- [ ] Responsive (mobile + desktop).
- [ ] Never crosses the boundary in [`TOKENS.md §3`](../docs/design/TOKENS.md).
- [ ] `npm run check && npm test && npm run doctor` all green.
- [ ] Listed in `templates/README.md`.

## 5. Building with an LLM (optional)

The store's prompts work on your template too: `templates/apply-template.md`
applies one, `templates/customize.md` maps plain-language change requests
("warmer palette", "rounder corners") to token/rule edits. Handy for customization
passes or for letting a publisher tweak your template.

## 6. Share it

Add your folder + a row in `templates/README.md`, run the checklist, and open a PR.
Every template is independent — you're only ever adding a folder.
