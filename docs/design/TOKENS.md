# Template contract — the customization API

This is the stable surface every template targets and every customization edits.
It is the reason a template can be applied by an LLM **without breaking the site**:
a template is *style only*. It restyles a fixed set of class names that
`functions/_lib/render.ts` emits, using a fixed set of design tokens. It never
touches the feed, routing, the Steady widget, or auth.

Think of it as three things: **tokens** (what you tune), **the class contract**
(what render.ts emits and a skin must style), and **the boundary** (what a
template must never touch).

---

## 1. Design tokens (the knob surface)

Every template declares these as CSS custom properties in `:root`. Tier‑1
customization ("use my orange", "rounder corners", "bigger type") is nothing more
than editing these values. Components read tokens exclusively, so any combination
stays visually consistent.

### Typography
| Token | Meaning | Example |
|---|---|---|
| `--font-head` | Display / headline family | `"Fraunces", Georgia, serif` |
| `--font-body` | Body + chrome family | `"Instrument Sans", system-ui, sans-serif` |
| `--fs` | Global size multiplier | `1` (raise to `1.06` for larger type) |
| `--text-base` | Base body size | `calc(18px*var(--fs))` |
| `--text-h1` | Hero headline size | `clamp(44px,6vw,78px)` |
| `--weight-heading` | Headline weight | `400`–`900` |
| `--weight-body` | Body weight | `400` |
| `--track-head` | Headline letter‑spacing | `-.02em` |
| `--case-head` | Headline case | `none` / `uppercase` |

### Color
| Token | Meaning |
|---|---|
| `--color-ink` | Primary text |
| `--color-ink-soft` | Secondary text / meta |
| `--color-brand` | The one accent (links, active states, rules) |
| `--color-bg` | Page background |
| `--color-line` | Hairlines / dividers |
| `--btn-fg` | Text on the brand button |

### Shape & layout
| Token | Meaning |
|---|---|
| `--radius-card` | Corner radius on media/cards |
| `--radius-btn` | Corner radius on buttons/pills |
| `--container` | Max content width (e.g. `1080px`) |
| `--card-ar` | Card media aspect ratio (e.g. `4/3`) |
| `--grid-cols` | Cards per row in the teaser grid (default `3`) |

> **Customization rule of thumb:** if a change can be expressed by editing a token
> above, it is Tier‑1 (safe, mechanical). If it needs a new rule or markup, it is
> Tier‑2 (see `templates/customize.md`).

---

## 2. The class contract (what a skin must style)

These class names are produced by `functions/_lib/render.ts` and `page.ts` from
live Steady feed data. A template restyles them; it must not rename them (they are
also part of the kit's protocol — see AGENTS.md hard rule #2). Data flows in from
the `FeedItem` shape in `functions/_lib/types.ts`.

### Chrome (page.ts)
- `.site-header` `.site-header__inner` · `.brand` `.brand__logo` `.brand__logo-img` `.brand__name`
- `.header-actions` · `.steady-login-button` `.login-link`
- `.tabs` `.tabs__bar` `.tabs__inner` `.tab` `.tab--active` · `.tabs__search`
- `.site-footer` `.site-footer__inner` `.site-footer__links` `.footer-link`
- `.kit-search` and children (`.kit-search__box/__in/__x/__res/__a/__t/__d/__m`) — the search modal
- `.skip-link` · `.btn` `.btn--primary` `.btn--outline`

### Landing + section (render.ts)
- Lead story: `.hero` `.hero__grid` `.hero__title` `.hero__excerpt` `.hero__date` `.hero__media`
  and the large variant `.aufmacher` / `.aufmacher--side` (`__title/__excerpt/__meta/__media`)
- Pills: `.pills` `.pill`
- Grid: `.grid` · `.card` `.card__media` `.card__body` `.card__title` `.card__excerpt` `.card__date`
- Section blocks (`.rubrik`): `.rubrik__head` `.rubrik__chip` `.rubrik__more`
  - feature mode: `.rubrik__feature` `.feat-main` (`__media/__title/__excerpt`) `.feat-list` `.teaser-row` (`__media/__title`)
  - compact mode: `.rubrik__compact` `.teaser-text` (`__title/__excerpt`)
- Portal shell (optional): `.portal-band` `.portal-grid` `.portal-center` `.rail` `.rail-module` `.rail-list` `.rail-num` `.rail-pills`
- `.load-more` `.loadmore-wrap` · `#memberships` (Steady checkout anchor)

### Post page (render.ts `renderPost`)
- `.post` `.post__col` `.post__eyebrow` `.post__title` `.post__lede` `.post__meta`
- `.post__hero` · `.post__body` `.post__body--full` (styles Steady's full‑text HTML: h2/h3/blockquote/img/…)
- `.post__react` `.post__clap` `.post__share` · `.post-nav` (`__a/--prev/--next`)

A complete skin styles **all** of the above. Missing a group doesn't break the
site — that page just falls back to unstyled defaults — but a store template
should be complete. `npm test` (`test/render.test.js`) renders every page type, so
gaps are visible.

### Hide customizer chrome (no-panel templates)
The kit still emits two customizer-era elements even with the panel removed:
`.card__pin` (per-card pin buttons) and `.cz-fab` (the panel launcher). A no-panel
template **must** hide them, or they render as unstyled oversized controls:

```css
.card__pin,.cz-fab{display:none!important;}
```
(Verified on live feed data — without this, `.card__pin` shows giant pushpin icons.)

---

## 3. The boundary (never touched by a template or customization)

This is what makes the store safe. A template/LLM must **not** edit:

- `functions/_lib/feed.ts` — feed fetch/parse (the CMS)
- `server/routes.ts`, `functions/**` route handlers — routing
- The Steady widget, `#steady_paywall`, `steady-login-button`, `#memberships` — the paywall/login/checkout layer (`page.ts` head, `render.ts`)
- `functions/_lib/auth.ts`, `scrub.ts` — auth + secret redaction
- `kit.config.js` — the publisher's identity file (their content, not the design)
- The class names and protocol enums in AGENTS.md hard rule #2

Style-only edits, bounded by this list + the test suite, are why "apply a
template" can't take a site down.

---

## 4. Verifying a template

A template is "correctly applied" when this is green (AGENTS.md hard rule #3):

```
npm run check && npm test && npm run doctor
```

Plus a visual check of `/`, `/rubrik/<slug>`, and `/posts/<id>`. After editing
`public/assets/kit.css`, run `npm run bump-assets` (hard rule #4).
