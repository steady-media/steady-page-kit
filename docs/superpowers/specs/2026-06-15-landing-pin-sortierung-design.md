# Spec: Beiträge anpinnen (Pin-to-top-Sortierung)

**Datum:** 2026-06-15
**Status:** Design abgenommen, bereit für Implementierungsplanung
**Betroffener Bereich:** Landing (`/`) + Rubrik-Seiten (`/rubrik/:slug`), Customizer-Panel

---

## 1. Problem

Die Reihenfolge der Beiträge auf der Startseite ist heute vollständig durch den
Steady-RSS-Feed bestimmt (neueste zuerst) und für den Publisher praktisch nicht
steuerbar. Der einzige Hebel ist `pinnedGuid` in `kit.config.js` — er pinnt **genau
einen** Beitrag als Aufmacher, nur per Hand im Code-File, nicht im Panel. Die
„Meistgelesen"-Leiste ist Kosmetik (Feed-Positionen 7–10 durchnummeriert,
`render.ts` → `popularItems`), sortiert also nichts.

Der Publisher braucht eine unkomplizierte Möglichkeit, einzelne Lieblingsbeiträge
nach oben zu holen — auf der Startseite **und** je Rubrik-Sektion.

## 2. Ziel & Nicht-Ziele

**Ziel:** Bis zu 3 Beiträge pro Bereich visuell (im Panel/Editing-Modus) anpinnen.
Angepinnte stehen oben in Klick-Reihenfolge; Pin 1 wird zum Aufmacher. Alles
Übrige bleibt neueste-zuerst. Veröffentlichung über den bestehenden
„Für alle Besucher speichern"-Flow.

**Nicht-Ziele (YAGNI):**
- Keine freie Drag-&-Drop-Kuratierung aller Beiträge.
- Keine echte „Meistgelesen"-Sortierung (es gibt kein Lese-/View-Signal; Claps sind
  laut AGENTS.md „an applause signal, not a metric").
- Keine globale Sortier-Regel (neu/alt/beliebt) — bewusst verworfen zugunsten des
  Pin-Modells.
- Kein neuer API-Endpoint, keine neue Route.

## 3. UX

**Bedienung:** Im Editing-Modus zeigt jede Beitragskarte in der Meta-/Datumszeile
das Pin-Icon (Reißzwecke) — **Variante B** aus dem Mockup. Klick = anpinnen, der
Beitrag springt nach oben. Erneuter Klick = lösen. Maximal **3 pro Bereich**, in
**Klick-Reihenfolge**. **Pin 1 wird zum Aufmacher.**

**Warum Variante B (Meta-Zeile) statt Bild-Overlay:** Das Kit hat Kartenstile **ohne
Bild** — „Nur Text" und „Karten-Liste" (`panel.ts`, `card`-Style `text`/`list`) — und
der Rubrik-Stream nutzt reine Text-Teaser. Ein Bild-Overlay hätte dort keinen Platz;
die Meta-Zeile existiert auf jedem Kartenstil und auf den Sektions-Seiten.

**Sichtbarkeit = Editing-Modus (WYSIWYG):** Pins sind **nur sichtbar, solange das
Customizer-Panel offen ist** (`<html class="cz-on">`, gesetzt in `kit-panel.js`).
Panel zu → keine Pin-Icons → der Publisher sieht exakt die Besucher-Ansicht. Das
verhindert die Verwirrung „sehen meine Besucher dieses Icon auch?".

**Greift nur für Publisher:** Veröffentlichte Pins wirken für alle Besucher; die
*Bedienung* (Vorschau via Cookie) folgt dem bestehenden Personalisierungs-Modell des
Kits. Global gespeichert wird nur über den admin-gateten Publish-Button.

**Panel: Reflow statt Overlay (Voraussetzung für die Pin-UX).** Heute ist das Panel
`.cz` ein `position:fixed`-Overlay (340 px rechts, `kit.css`), das den rechten
Seitenrand **überdeckt** — die dort liegenden Karten (und damit ihre Pins) wären nicht
erreichbar, und der Publisher kann nicht beurteilen, was Besucher sehen. Stattdessen
soll sich bei offenem Panel die **Breite des Seiteninhalts verringern**: der Inhalt
rückt nach links neben das Panel, sodass die gesamte Seite sichtbar und jede Karte
anklickbar bleibt. Der Inhalt reflowt dabei in die schmalere Breite (das Karten-Grid
rechnet die Spalten neu). Diese Änderung verbessert die Customizer-Bedienung generell,
nicht nur fürs Pinnen.

- **Mechanik:** Panelbreite als CSS-Variable `--cz-w` (Desktop 340 px). Bei
  `html.cz-on` bekommt die Seiten-Wurzel (Body bzw. der Inhalts-Wrapper) sowie jede
  sticky/fixed Site-Chrome (Header) `margin-right: var(--cz-w)` mit weicher
  `transition` (~.25 s). Das Panel selbst bleibt `position:fixed; right:0`.
- **Responsive-Fallback:** Unterhalb einer Breite, ab der 340 px Reflow keinen sinnvollen
  Platz mehr lassen (z. B. < ~960 px), bleibt es beim bisherigen Slide-in-Overlay
  (`max-width:92vw`) — Reflow in einen Streifen wäre schlechter. Mobiles Pinnen ist ein
  Randfall.

## 4. Wirkungsbereich (Scope)

Pins sind an die **Seite gebunden**, auf der sie gesetzt werden:

| Seite | Scope-Key | Effekt von Pin 1 |
|---|---|---|
| Startseite `/` | `/` | wird Hero/Aufmacher (ersetzt `pinnedGuid`-Verhalten) |
| Rubrik `/rubrik/:slug` | `rubrik/<slug>` | wird Aufmacher der Sektion (ersetzt `items[0]`) |

Datenmodell: eine Map `scope → [guid, guid, guid]`.

## 5. Datenmodell & Persistenz

Spiegelt 1:1 das bestehende `kitstruct`/`kitchrome`-Muster.

- **Neuer Cookie `kitpins`** (persönliche Vorschau) + **neues Feld `kitpins`** in der
  globalen KV-Config (`GlobalConfig`).
- **Format** wie `kitchrome`: URL-encodetes JSON, hart gedeckelt:
  ```json
  {"/":["guidA","guidB","guidC"],"rubrik/politik":["guidX"]}
  ```
  Caps: **max. 3 GUIDs pro Scope**, GUID-Länge begrenzt (z. B. 200), Scope-Anzahl
  begrenzt (z. B. 40). Defektes JSON → leere Map (fehlertolerant, wie `parseStruct`).
- **Veröffentlichen:** bestehender `cz-pub`-Button → `PUT /api/config` mit Header
  `x-kit-admin` (timing-safe gegen `KIT_ADMIN_CODE`, `auth.ts`). Der PUT-Whitelist in
  `functions/api/config.ts` bekommt `kitpins` (String, `.slice(0, 8000)`). Revert/Redo
  (PATCH) und Reset (DELETE) funktionieren unverändert mit.

## 6. Betroffene Dateien

**Server (TypeScript, `functions/_lib/`):**

- `types.ts` — `StructCfg.pins: Record<string, string[]>` (Default `{}`);
  `GlobalConfig.kitpins?: string`.
- `settings.ts`:
  - `parseStruct()` parst zusätzlich `kitpins` aus dem Cookie in `cfg.pins` (validiert,
    gedeckelt).
  - `effectiveCookie()` injiziert `kitpins` aus `globalCfg`, wenn kein persönlicher
    `kitpins`-Cookie da ist (analog `kitstruct`/`kitchrome`).
  - `buildPageContext()` — `hasPersonalCfg`-Regex erweitern:
    `/(?:^|;\s*)kit(?:struct|chrome|pins)=/` → Vorschau-Seiten mit `kitpins`-Cookie
    laufen auf `no-store`.
- `render.ts`:
  - neue reine Helper-Funktion `applyPins(items, guids)` → zieht die in `guids`
    genannten Items (in Reihenfolge, nur falls im Feed vorhanden, dedupliziert) nach
    vorn, Rest in Feed-Reihenfolge.
  - `renderLanding()` — Scope `/`: wenn `cfg.pins["/"]` nicht leer, `items = applyPins(...)`;
    dadurch ist `items[0]` = Pin 1 = Hero, die bestehende disjunkte Verteilung
    (Hero/Lead/Latest/Popular) greift unverändert. **Fallback:** ist keine Pin-Liste
    vorhanden, gilt weiter `PINNED_GUID` wie heute.
  - `renderSection()` — Scope `rubrik/<slug>`: analog reordern; `featured = items[0]`.
- `api/config.ts` — `kitpins` in den PUT-Blob aufnehmen (siehe §5).
- `i18n.ts` — neue Labels (de + en, Parität wird per Test erzwungen): Pin-Button
  `aria-label` (z. B. „Nach oben anpinnen" / „Pin to top"), Zustand „Angepinnt" /
  „Pinned", optionaler Hinweis-Toast „max. 3".

**Client (`public/assets/`):**

- Pin-Injector (in `kit-panel.js`, das ohnehin auf jeder Seite läuft — kein neues
  Asset, kein zusätzliches Skript-Wiring):
  - findet die Beitrags-Links (`a.card`, `a.teaser-row`, `a.teaser-text`, `a.feat-main`,
    Hero/Aufmacher) und injiziert je einen Pin-Toggle in die Meta-Zeile.
  - **GUID-Quelle:** aus dem `href` `/posts/<guid>` extrahiert und decodiert — damit
    **keine Server-HTML-Änderung** nötig ist (Besucher-Markup bleibt byte-gleich,
    Caching/Golden-Master unberührt). Falls Steady-GUIDs unsichere Zeichen enthalten,
    Fallback: `data-guid` an der Karte.
  - **Sichtbarkeit:** Toggles sind per CSS verborgen und nur unter `html.cz-on`
    sichtbar (Editing-Modus).
  - Klick → aktuellen `kitpins`-Cookie lesen, GUID im Scope der aktuellen
    `location.pathname` (`/` bzw. `rubrik/<slug>`) hinzufügen/entfernen (max 3,
    Klick-Reihenfolge) → Cookie schreiben → `location.reload()` (wie `kitStructSet`).
  - Pin-SVG (Reißzwecke) lebt im Injector-Code.
  - Publish-Payload (`cz-pub`, aktuell `{skin, kitstruct, kitchrome}`) um
    `kitpins: cookieValue("kitpins")` ergänzen.
- `kit.css`:
  - Styling der Pin-Toggles + `html.cz-on`-Sichtbarkeitsregel + aktiver
    („angepinnt") Zustand.
  - **Panel-Reflow** (siehe §3): `--cz-w`-Variable; `html.cz-on` verschiebt den
    Seiteninhalt + sticky Header per `margin-right: var(--cz-w)` (mit Transition);
    Responsive-Fallback auf das bisherige Overlay unterhalb des Breakpoints. `.cz`
    bleibt `fixed`.
- **Asset-Versionierung:** nach Edits an `kit-panel.js`/`kit.css`
  `npm run bump-assets` laufen lassen (`test/asset-version.test.js` erzwingt das).

## 7. Datenfluss

```
Publisher klickt Pin (Editing-Modus)
  → kit-panel.js: kitpins-Cookie aktualisieren (Scope = Pfad, max 3) → reload
  → Server: buildPageContext → effectiveCookie (persönlich gewinnt) → parseStruct → cfg.pins
  → render.ts: applyPins reordnet items; Pin 1 = Hero/Featured
  → Vorschau für den Publisher (no-store)
Publisher klickt „Für alle Besucher speichern"
  → PUT /api/config {…, kitpins} (x-kit-admin)
  → KV "config".kitpins gesetzt
  → für Besucher ohne eigenen kitpins-Cookie via effectiveCookie wirksam (5 Min cachebar)
```

## 8. Icon

Neues Pin-Icon im Stil der bestehenden Inline-SVGs (`icons.ts`-Familie: viewBox
`0 0 24 24`, `fill="none"`, `stroke="currentColor"`, Round-Caps). Im
Steady-Design-System-Extract existiert **kein** Pin-Icon, daher Lucide-Thumbtack als
treuer Stil-Match. Da der Toggle client-injiziert wird, lebt das SVG im
Injector-Code; exakte Glyph-Bestätigung gegen `steady-media/main_app` zum Schluss.

## 9. Rückwärtskompatibilität & Caching

- **`pinnedGuid` (kit.config.js)** bleibt gültig: greift als Startseiten-Hero,
  **solange keine** `/`-Pins (Cookie oder veröffentlicht) vorliegen. Panel-Pins
  gewinnen.
- **Ohne Pins** (kein Cookie, nichts veröffentlicht) ist `applyPins` ein No-Op → die
  gerenderte Reihenfolge **und das Markup** sind identisch zu vorher (Golden-Master-
  Parität bleibt; Server-HTML ändert sich nicht, da GUIDs aus dem href kommen).
- **Caching:** Vorschau mit persönlichem `kitpins`-Cookie → `no-store`; veröffentlichte
  Pins → normal `public, max-age=300`.

## 10. Edge Cases

- Gepinnte GUID nicht (mehr) im Feed → still übersprungen.
- Mehr als 3 im Cookie → auf 3 gekürzt (defensiv beim Parsen).
- Gleiche GUID in mehreren Scopes → erlaubt, unabhängig.
- Defekter `kitpins`-Cookie/JSON → leere Map, Default-Verhalten.
- Pin im `liste`- vs. `rubrik`-Stream der Startseite: beide Scopes sind `/` — Pin 1
  wird in beiden Layouts zum Aufmacher; Pins 2–3 erscheinen in der Lead-Reihe.

## 11. Tests

- **`parseStruct`/`parsePins`** (unit): gültige Map, Cap auf 3, Scope-/Längen-Limits,
  defektes JSON → `{}`, persönlich-vs-global-Präzedenz via `effectiveCookie`.
- **`applyPins`** (unit): Reihenfolge (gepinnte zuerst in Klick-Reihenfolge), fehlende
  GUIDs übersprungen, Dedup, Rest chronologisch, No-Op bei leerer Liste.
- **`renderLanding`/`renderSection`**: Pin 1 = Hero bzw. Featured; Fallback auf
  `PINNED_GUID` ohne Pins.
- **`api/config` PUT**: persistiert `kitpins`, respektiert `MAX_BYTES`, 401 ohne
  Admin-Code.
- **i18n-Parität** (bestehender Test) für die neuen Keys.
- **Golden-Master**: ohne Pins identische Ausgabe (additive Feature-Diffs nur bei
  gesetzten Pins).
- **Visuelle QA (Reflow):** Panel offen → Inhalt schmaler, keine Karte verdeckt, alle
  Pins erreichbar; Panel zu → Besucher-Ansicht; Responsive-Fallback unter dem
  Breakpoint. (Nicht unit-testbar — manuelle/Browser-QA, z. B. via `/browse`.)

## 12. Schema-Stabilität (AGENTS.md Hard Rules)

- Neue, **stabile** Bezeichner (nicht übersetzen/umbenennen): Cookie-/KV-Key `kitpins`,
  Scope-Keys `/` und `rubrik/<slug>` (nutzt den bereits stabilen `/rubrik/`-Präfix).
- UI-**Labels** nur über `i18n.ts` (de + en).
- Nach Asset-Edits `npm run bump-assets`; vor Abschluss `npm run check && npm test`.

## 13. Offene Punkte (für später, nicht in diesem Scope)

- Optionaler kleiner Sichtbarkeits-Indikator im Panel („3/3 Pins auf dieser Seite").
- Exakte Pin-Glyph-Abstimmung gegen main_app.
- Reorder der Pins per ▲▼ (bewusst verworfen: Klick-Reihenfolge reicht).
