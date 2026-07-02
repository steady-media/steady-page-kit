# Steady template store

Templates turn your Steady Page Kit into a distinct-looking website — driven by
your Steady feed, with no code required from you. Each template is a **reference
skin + a prompt**: your AI coding tool reads it and applies it, and the kit's test
suite guarantees your site still works.

## How it works

1. **Pick a template** below.
2. **Apply it** — paste `templates/apply-template.md` into your AI tool (Claude
   Code, Cursor, Codex, Gemini CLI, …) with this repo open, and name the template.
3. **Customize it** — paste `templates/customize.md` and describe what you want in
   plain language ("use my orange", "rounder corners", "bigger headlines").

A template is style-only: it restyles the classes your pages already render and
never touches your feed, login, paywall or checkout. See the guarantees in
[`docs/design/TOKENS.md`](../docs/design/TOKENS.md).

## Templates

| Template | Mood | Use it for |
|---|---|---|
| **[Blueprint](blueprint/template.md)** ([preview](blueprint/preview.html)) | Neutral labeled wireframe | Learning the styleable elements, and as the base for a new template |

_Blueprint is the starting point — every other template is built by applying it,
then styling. Finished skins (editorial, bold, minimal, classic) come next._

## For template authors

A new template is one folder:

```
templates/<name>/
  skin.css       complete replacement for public/assets/kit.css (styles the whole
                 class contract, no panel)
  template.md    the spec: mood, fonts, palette, customization knobs, wiring notes
  preview.html   links ./skin.css so the preview IS the applied result
```

Target the contract in [`docs/design/TOKENS.md`](../docs/design/TOKENS.md): style
only the documented classes, expose customization through the `:root` token block,
and never cross the boundary (feed / routing / Steady widget / auth / kit.config.js).
Keep `npm run check && npm test && npm run doctor` green.
