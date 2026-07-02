# Blueprint

> The starting point. A neutral, labeled wireframe that renders your real Steady
> feed so you can see — and then style — every element the kit gives you.

![Blueprint preview](preview.html)

## What it is
Blueprint is not a finished look; it's the **skeleton every other template starts
from**. Applied to a publication, it renders the actual content in plain
grayscale and tags each component with the class name you target
(`.hero`, `.rubrik__feature`, `.card`, `.post`, …). You design by:

1. **Deleting the labels** — remove the `component labels` block in `skin.css`.
2. **Styling the classes** — work through the components, using the tokens and
   the class contract in [`docs/design/TOKENS.md`](../../docs/design/TOKENS.md).

## At a glance
| | |
|---|---|
| **Mood** | Neutral wireframe / blueprint |
| **Type** | System sans for content, monospace for labels & meta |
| **Color** | Grayscale content; one purple reserved for the label + link layer |
| **Images** | Your real feed images, shown grayscale in dashed slots |
| **Best for** | Builders learning the surface, and as the base for a new template |

## How to read it
- **Purple tag** on a component = the class you style (`.hero`, `.grid → .card`).
  One tag per component, on purpose — sub-element names are in
  [`TOKENS.md §2`](../../docs/design/TOKENS.md).
- **Dashed outline** = the bounds of that component.
- **Grayscale image + dashed border** = an image slot filled from the feed.

## Building from Blueprint (recommended flow)
1. Apply Blueprint (`templates/apply-template.md`) — see your own content labeled.
2. Copy `skin.css` to a new `templates/<your-name>/skin.css`.
3. Delete the labels block; set your tokens in `:root`; restyle component by
   component. Use `templates/customize.md` for token/rule guidance.
4. Keep `npm run check && npm test && npm run doctor` green.

## Boundary
Style only. Never touch the feed, routing, the Steady widget, auth, or
`kit.config.js` ([`TOKENS.md §3`](../../docs/design/TOKENS.md)).
