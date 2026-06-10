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
  posts/[id].js       Route /posts/:id         Einzelpost: Volltext-Join + Steady-Paywall + Claps + Prev/Next
  rubrik/[slug].js    Route /rubrik/:slug      Rubrik-Seite einer Feed-Kategorie
  memberships.js      Route /memberships       Steady-Checkout-Embed
  rss.js              Route /rss               eigener Feed-Endpunkt (Proxy)
  sitemap.xml.js      Route /sitemap.xml       generiert aus dem Feed
  robots.txt.js       Route /robots.txt        env-bewusst (SITE_ORIGIN)
  api/
    config.js         GET/PUT/PATCH/DELETE     globale Einstellungen (KV; PATCH = Revert)
    logo.js           GET/PUT/DELETE           global gespeichertes Logo (KV)
    search.js         GET ?q=                  feed-basierte Suche (echte Titel + Links)
    react.js          GET/POST ?g=             Clap-Zähler pro Post (KV)
  _lib/                                        (Unterstrich = wird nicht geroutet)
    config.js         Konstanten (Feed-URL, Steady-IDs, DEFAULT_NAV, ASSET_VERSION)
    util.js           esc, fmtDate, slugify, teaser (Bild-Resize)
    feed.js           getItems, parseFeed, parseChannelMeta, normTitle, topCategories
    settings.js       parseStruct, getConfig/getLogoMeta/getClaps (KV), buildPageContext
    http.js           htmlResponse (Security-Header), jsonResponse, isAdmin
    icons.js          Inline-SVGs
    page.js           head() (SEO/OG/Canonical) / header() (+ Such-Dialog) / footer()
    panel.js          Markup des Customizer-Panels
    render.js         renderLanding/-Section/-Post/… + prepareFullText (Paywall-Schnitt)
public/assets/
  kit.css             Design-Tokens + alle Komponenten-Styles
  kit-theme.js        Theme-Engine: Kataloge + Setter (window.kit*), Auto-Dark
  kit-panel.js        Panel-Logik, Suche, Claps/Teilen, Publish + Revert, Mehr-laden
test/                 node --test (npm test); CI: .github/workflows/ci.yml
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
| `KIT_KV` | KV-Binding (wrangler.toml) | globale Config + Logo + Clap-Zähler |
| `KIT_ADMIN_CODE` | Secret | Gate für globales Speichern (Publish/Revert, Logo) |
| `FULLTEXT_FEED_URL` | Secret | authentifizierter Steady-Feed mit Volltexten (`content:encoded`) |
| `ANALYTICS_TOKEN` | Secret (optional) | Cloudflare-Web-Analytics-Beacon aktivieren |
| `FEED_URL`, `SITE_ORIGIN`, `STEADY_PUBLICATION_ID`, `STEADY_LOGIN_URL` | Vars (optional) | Portabilität: Kit für eine andere Publikation deployen, ohne Code zu ändern |

```bash
printf '%s' "<wert>" | npx wrangler pages secret put KIT_ADMIN_CODE --project-name blaupause-kit
```

## Wissenswertes

- **Volltexte:** Der öffentliche Feed liefert nur Teaser. `posts/[id].js` joint den
  Volltext-Feed **per normalisiertem Titel** (die GUIDs beider Feeds unterscheiden
  sich!). Kein Match → Teaser-Stub mit Steady-Link. Der Volltext-Feed umfasst nur
  die ~6 jüngsten Beiträge.
- **Paywall:** Beginnt im Volltext ein Abschnitt mit der Überschrift „Mitglieder-Bereich"
  (`MEMBER_HEADING` in `_lib/config.js`), setzt `prepareFullText()` davor das offizielle
  Steady-Element `<div id="steady_paywall">`. Das Smart-Layer-Widget blendet für
  Nicht-Mitglieder alles darunter aus und zeigt die im **Steady-Backend konfigurierte**
  Paywall (Settings → Paywall); Mitglieder sehen den Inhalt. Hinweis: Wie bei Steadys
  offizieller JS-Paywall üblich bleibt der Inhalt im HTML (Gating ist clientseitig).
- **Caching:** HTML 5 Min (mit persönlichen Cookies: `no-store`), Feed 10 Min Edge,
  Logo 10 Min (Cache-Bust über `?v=<ts>`), globale Config 60 s, statische Assets 7 Tage.
- **Login:** Der echte `<steady-login-button>` (Smart Layer). Ein Inline-Snippet
  blendet nach 3 s einen direkten Login-Link ein, falls das Widget nicht lädt.
- **Suche:** feed-basiert (`/api/search`) mit eigenem Modal — echte Titel, echte Links,
  immer aktuell. (Die frühere Cloudflare-AI-Search-Anbindung ist entfernt.)
- **Claps:** KV-Zähler (`react:<guid>`), eventually consistent — als Applaus-Signal
  gedacht, nicht als exakte Metrik. Teilen nutzt die Web Share API (Fallback: Link kopieren).
- **SEO:** Canonical/OG/Twitter-Tags aus dem Feed, `/sitemap.xml`, `/robots.txt`, `/rss`.
