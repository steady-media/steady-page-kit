# Blaupause Kit — feed-driven Steady-Skin auf Cloudflare Pages

Eine portable, pixelnahe Hülle von `steady.page/sebastian`, die ihre Inhalte **live aus
Steady** zieht. Du schreibst weiter in Steady — neue Posts erscheinen hier automatisch.

## Wie es funktioniert

```
Steady (du schreibst)  ──RSS──▶  Cloudflare Pages Function  ──HTML──▶  Besucher
   steady.page/sebastian/rss        functions/*.js (Edge-Cache 10 Min)
```

- **Steady ist das CMS.** Single Source of Truth ist der RSS-Feed `steady.page/sebastian/rss`
  (Titel, Excerpt, Kategorie, Teaser-Bild, Datum, Link, GUID — für alle Posts).
- **Auto-Update:** Die Functions rendern bei Abruf aus dem Feed, mit 10-Min-Edge-Cache.
  Neuer Steady-Post → spätestens nach Cache-Ablauf live. Kein Rebuild, kein Trigger, keine Wartung.
- **Routen:**
  - `GET /` → Landing: Hero (neuester bzw. gepinnter Post) + Kategorie-Pills + Post-Grid + Pagination
  - `GET /posts/:id` → Einzelpost-Ansicht (`:id` = Feed-GUID); jeder Steady-Post bekommt automatisch seine Seite
  - `GET /?page=N` → Paginierung durch alle Posts

## Struktur

```
functions/
  _shared.js        Feed holen + parsen, Design-Tokens/CSS, Render-Helfer
  index.js          Route /        (Landing)
  posts/[id].js     Route /posts/:id (Einzelpost)
public/
  assets/           Brand-Chrome (Logo, Favicon, Steady-Wordmark) — lokal, portabel
wrangler.toml       Pages-Config (output dir = public)
```

Teaser-Bilder der Posts kommen aus dem Feed (Steady-CDN) — deckt automatisch neue Posts ab.
Nur das stabile Brand-Chrome liegt lokal in `public/assets/`.

## Lokal starten

```bash
npm install
npm run dev          # → http://localhost:8788
```

## Deployen (Weg B: GitHub → Cloudflare Pages)

1. Repo zu GitHub pushen.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Connect to Git** → dieses Repo.
3. Build settings: **Build command** leer lassen, **Build output directory** = `public`.
4. Deploy. Ab dann: `git push` = neues Deployment. Inhalte aktualisieren sich ohne Push (Feed + Cache).

Alternativ direkt: `npm run deploy` (nach `npx wrangler login`).

## Konfiguration

In `functions/_shared.js` oben:
- `FEED_URL` — die Steady-RSS-URL
- `PINNED_GUID` — eine Post-GUID als Hero pinnen (`null` = neuester Post)
- `PER_PAGE`, `MAX_PILLS` — Grid-/Pill-Anzahl
- `--font-sans` Token im CSS — `CircularStd` eintragen, sobald die Lizenz vorliegt (ersetzt DM Sans)

## Bekannte Grenze: Artikel-Body

Der RSS-Feed liefert **Metadaten + Excerpt**, nicht den vollen Artikeltext (den gated Steady).
Die Einzelseite zeigt darum Preview + „Ganzen Beitrag auf Steady lesen". Den Volltext bringt
später das echte **Steady-Post-/Paywall-Embed-Widget** — Andock-Punkte sind im Code markiert
(`#memberships` auf der Landing, `PAYWALL-ANDOCKZONE` in der Einzelseite).
