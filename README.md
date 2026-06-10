# Blaupause Kit — anpassbare Steady-Landingpage auf Cloudflare Pages

Eine portable Hülle von `steady.page/sebastian`, die ihre Inhalte **live aus Steady**
zieht und über ein eingebautes Customizer-Panel gestaltbar ist (Fonts, Farben,
Layout, Struktur) — mit Leitplanken, damit keine „MySpace-Seiten" entstehen.
Du schreibst weiter in Steady; neue Posts erscheinen hier automatisch.

```
Steady (CMS)  ──RSS──▶  Pages Functions (SSR, Edge-Cache 10 Min)  ──HTML──▶  Besucher
                              │
                              ├─ KV (KIT_KV): global veröffentlichte Config + Logo
                              └─ Secrets: FULLTEXT_FEED_URL, KIT_ADMIN_CODE
```

## Architektur in einem Absatz

Der **Server** rendert die Seiten-**Struktur** (einspaltig oder Portal, Aufmacher,
Rubriken, Leisten, Header) aus dem `kitstruct`/`kitchrome`-Cookie bzw. der global
veröffentlichten Config. Der **Client** (kit-theme.js) wendet den **Skin** (Fonts,
Farben, Karten-Stile) als CSS-Variablen/Klassen an — blockierend im `<head>`, damit
nichts flackert. Präzedenz überall: **persönliche Einstellungen (localStorage/Cookie)
schlagen die globale Basis (KV), die globale Basis schlägt die Defaults.**

## Code-Landkarte

```
functions/
  index.js            Route /                  Landing (Komposition laut Config)
  posts/[id].js       Route /posts/:id         Einzelpost + Volltext-Join (Titel-Match)
  rubrik/[slug].js    Route /rubrik/:slug      Rubrik-Seite einer Feed-Kategorie
  memberships.js      Route /memberships       Steady-Checkout-Embed
  api/
    config.js         GET/PUT/DELETE           global veröffentlichte Einstellungen (KV)
    logo.js           GET/PUT/DELETE           global gespeichertes Logo (KV)
  _lib/                                        (Unterstrich = wird nicht geroutet)
    config.js         Konstanten (Feed-URL, Steady-IDs, DEFAULT_NAV, ASSET_VERSION)
    util.js           esc, fmtDate, slugify, teaser (Bild-Resize)
    feed.js           getItems, parseFeed, normTitle, topCategories
    settings.js       parseStruct, getConfig/getLogoMeta (KV), buildPageContext
    http.js           htmlResponse, jsonResponse, isAdmin (x-kit-admin-Gate)
    icons.js          Inline-SVGs
    page.js           head() / header() / footer()
    panel.js          Markup des Customizer-Panels
    render.js         renderLanding/-Section/-Post/-Memberships/-404/-Empty
public/assets/
  kit.css             Design-Tokens + alle Komponenten-Styles
  kit-theme.js        Theme-Engine: Kataloge (Fonts/Paletten/Looks) + Setter (window.kit*)
  kit-panel.js        Panel-Logik (bindet Controls an die Setter, Publish, Logo, Mehr-laden)
  kit-search.js       fetch-Interceptor für das Cloudflare-AI-Search-Modal
```

**Konvention:** Skin-Regler wirken live (CSS-Variablen). Struktur-Regler schreiben
einen Cookie und laden neu, weil der Server die Struktur rendert. Wer einen neuen
Regler baut: Token in `kit.css` → Setter in `kit-theme.js` → Control in
`_lib/panel.js` (data-fn/data-kind/data-v) — die generische Segment-Logik in
`kit-panel.js` greift automatisch.

## Lokal entwickeln

```bash
npm install
cp .dev.vars.example .dev.vars   # Secrets eintragen (gitignored)
npm run dev                      # → http://localhost:8788
npm run check                    # Syntax-Check über alle JS-Dateien
```

## Deployen

```bash
npm run deploy                   # direkt (nach `npx wrangler login`)
```

Oder via GitHub-Integration: Repo verbinden, Build command leer, Output dir `public`.
Nach Asset-Änderungen (`public/assets/kit-*`): `ASSET_VERSION` in
`functions/_lib/config.js` hochzählen (Cache-Buster).

## Secrets & Bindings (Produktion)

| Name | Typ | Zweck |
|---|---|---|
| `KIT_KV` | KV-Binding (wrangler.toml) | globale Config + Logo |
| `KIT_ADMIN_CODE` | Secret | Gate für globales Speichern (Panel → „Für alle Besucher speichern", Logo) |
| `FULLTEXT_FEED_URL` | Secret | authentifizierter Steady-Feed mit Volltexten (`content:encoded`) |

```bash
printf '%s' "<wert>" | npx wrangler pages secret put KIT_ADMIN_CODE --project-name blaupause-kit
```

## Wissenswertes

- **Volltexte:** Der öffentliche Feed liefert nur Teaser. `posts/[id].js` joint den
  Volltext-Feed **per normalisiertem Titel** (die GUIDs beider Feeds unterscheiden
  sich!). Kein Match → Teaser-Stub mit Steady-Link. Der Volltext-Feed umfasst nur
  die ~6 jüngsten Beiträge.
- **Caching:** HTML 5 Min (mit persönlichen Cookies: `no-store`), Feed 10 Min Edge,
  Logo 10 Min (Cache-Bust über `?v=<ts>`), globale Config 60 s.
- **Login:** Der echte `<steady-login-button>` (Smart Layer). Ein Inline-Snippet
  blendet nach 3 s einen direkten Login-Link ein, falls das Widget nicht lädt.
- **Suche:** Cloudflare AI Search; der Index basiert auf Markdown-Exporten, die
  Chunks haben keine Titel/URLs — `kit-search.js` ergänzt sie clientseitig.
