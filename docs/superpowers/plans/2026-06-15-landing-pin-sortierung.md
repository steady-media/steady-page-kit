# Beiträge anpinnen (Pin-to-top) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Publisher pinnt im Editing-Modus bis zu 3 Beiträge pro Bereich (Startseite und je Rubrik-Seite) nach oben; Pin 1 wird Aufmacher, der Rest bleibt neueste-zuerst.

**Architecture:** Pins liegen als Map `scope → [guid]` in einem `kitpins`-Cookie (persönliche Vorschau) bzw. in der globalen KV-Config — exakt gespiegelt am bestehenden `kitstruct`/`kitchrome`-Mechanismus. Der Server (`render.ts`) reordnet die Feed-Items vor dem Rendern; der Client (`kit-panel.js`) injiziert nur im Admin-/Editing-Modus Pin-Toggles in die Karten-Meta-Zeile und schreibt den Cookie. Veröffentlicht wird über den vorhandenen `PUT /api/config`-Flow. Zusätzlich wird das Customizer-Panel von Overlay auf Reflow umgestellt, damit beim Pinnen keine Karte verdeckt ist.

**Tech Stack:** TypeScript (Cloudflare-Pages-Functions, type-stripped Node ≥ 22.18, erasableSyntaxOnly), Browser-JS mit JSDoc (`checkJs`), `node:test`. Spec: `docs/superpowers/specs/2026-06-15-landing-pin-sortierung-design.md`.

---

## File Structure

- `functions/_lib/types.ts` — `StructCfg.pins`, `GlobalConfig.kitpins` (Typ-Verträge).
- `functions/_lib/settings.ts` — `kitpins` parsen (`parseStruct`), global injizieren (`effectiveCookie`), `no-store`-Regex (`buildPageContext`).
- `functions/_lib/render.ts` — reine `applyPins()`-Funktion + Einbau in `renderLanding`/`renderSection`.
- `functions/api/config.ts` — `kitpins` in den Publish-Blob aufnehmen.
- `functions/_lib/i18n.ts` — Client-Labels für den Pin-Toggle (de + en).
- `public/assets/kit-panel.js` — Pin-Injector + Toggle, Publish-Payload, Reset.
- `public/assets/kit.css` — Pin-Toggle-Styles + Panel-Reflow.
- Tests: `test/settings.test.js`, `test/render.test.js`, neu `test/config.test.js`, `test/i18n.test.js` (Parität automatisch).

---

## Task 1: Typen erweitern

**Files:**
- Modify: `functions/_lib/types.ts` (StructCfg ~169-188, GlobalConfig ~139-148)

- [ ] **Step 1: `pins` zu `StructCfg` hinzufügen**

In `interface StructCfg` (nach `rails: string[];`) ergänzen:

```ts
  /** Angepinnte Beiträge je Bereich: scope ("/" | "rubrik/<slug>") → GUID-Liste (max 3). */
  pins: Record<string, string[]>;
```

- [ ] **Step 2: `kitpins` zu `GlobalConfig` hinzufügen**

In `interface GlobalConfig` (nach `kitchrome?: string;`) ergänzen:

```ts
  /** Serialisierter kitpins-Cookie-Wert (JSON: {scope: [guid]}) */
  kitpins?: string;
```

- [ ] **Step 3: Typen prüfen**

Run: `npm run check`
Expected: PASS (tsc fehlerfrei; `StructCfg` wird in `settings.ts` noch nicht befüllt — das macht Task 2, daher hier nur Typcheck der Deklaration).

> Hinweis: `parseStruct` setzt `pins` erst in Task 2. `tsc` meldet die fehlende Property erst, wenn ein `StructCfg`-Literal sie auslässt — `parseStruct` baut `def` als `StructCfg`, daher kann `npm run check` hier bereits fehlschlagen. Ist das der Fall, direkt mit Task 2 Step 3 weitermachen (Default `pins: {}` ergänzen) und dann erneut prüfen.

- [ ] **Step 4: Commit**

```bash
git add functions/_lib/types.ts
git commit -m "feat(pins): StructCfg.pins + GlobalConfig.kitpins"
```

---

## Task 2: `kitpins`-Cookie parsen (`parseStruct`)

**Files:**
- Modify: `functions/_lib/settings.ts` (`parseStruct`, ~26-60)
- Test: `test/settings.test.js`

- [ ] **Step 1: Failing tests schreiben**

In `test/settings.test.js` ans Ende anfügen:

```js
test("parseStruct: kitpins wird gelesen, je Scope auf 3 gedeckelt", () => {
  const val = encodeURIComponent(JSON.stringify({ "/": ["g1", "g2", "g3", "g4"], "rubrik/politik": ["a"] }));
  const s = parseStruct("kitpins=" + val);
  assert.deepEqual(s.pins["/"], ["g1", "g2", "g3"]);
  assert.deepEqual(s.pins["rubrik/politik"], ["a"]);
});

test("parseStruct: ohne kitpins ist pins eine leere Map", () => {
  assert.deepEqual(parseStruct("").pins, {});
});

test("parseStruct: defektes kitpins → leere Map", () => {
  assert.deepEqual(parseStruct("kitpins=%7Bkaputt").pins, {});
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/settings.test.js`
Expected: FAIL (`s.pins` ist `undefined`).

- [ ] **Step 3: `pins` im Default + Parsing ergänzen**

In `parseStruct` das Default-Objekt `def` erweitern (Zeile mit `rails: []` ergänzen):

```ts
  const def: StructCfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {},
                headerStyle: "links", search: false, brand: "", nav: null, foot: null };
```

Direkt **vor** `return def;` (nach dem `kitchrome`-Block) einfügen:

```ts
  // kitpins = JSON {scope: [guid,…]} — angepinnte Beiträge je Bereich, hart gedeckelt.
  const pm = cookie.match(/(?:^|;\s*)kitpins=([^;]*)/);
  if (pm) {
    try {
      const o = JSON.parse(decodeURIComponent(pm[1])) as Record<string, unknown>;
      if (o && typeof o === "object") {
        let scopes = 0;
        for (const k in o) {
          if (scopes++ >= 40) break;
          const v = o[k];
          if (!Array.isArray(v)) continue;
          const list = v.filter((g): g is string => typeof g === "string" && !!g && g.length <= 200).slice(0, 3);
          if (list.length) def.pins[String(k).slice(0, 120)] = list;
        }
      }
    } catch (e) { /* defekter Cookie → leere Map */ }
  }
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `node --test test/settings.test.js`
Expected: PASS (alle, inkl. der bestehenden).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/settings.ts test/settings.test.js
git commit -m "feat(pins): kitpins-Cookie in parseStruct parsen (cap 3/Scope)"
```

---

## Task 3: Global injizieren + `no-store` (`effectiveCookie`, `buildPageContext`)

**Files:**
- Modify: `functions/_lib/settings.ts` (`effectiveCookie` ~67-74, `buildPageContext` ~129)
- Test: `test/settings.test.js`

- [ ] **Step 1: Failing tests schreiben**

In `test/settings.test.js` `buildPageContext` zum Import ergänzen:

```js
import { parseStruct, effectiveCookie, buildPageContext } from "../functions/_lib/settings.ts";
```

Und ans Ende anfügen:

```js
test("effectiveCookie: globales kitpins greift ohne persönlichen Cookie", () => {
  const g = { kitpins: encodeURIComponent(JSON.stringify({ "/": ["g1"] })) };
  assert.match(effectiveCookie("", g), /kitpins=/);
  const merged = effectiveCookie("kitpins=" + encodeURIComponent(JSON.stringify({ "/": ["x"] })), g);
  assert.equal((merged.match(/kitpins=/g) || []).length, 1); // persönlich gewinnt
});

test("buildPageContext: kitpins-Cookie erzwingt no-store", async () => {
  const ctx = { env: {}, request: new Request("https://example.com/", { headers: { cookie: "kitpins=%7B%7D" } }) };
  const { cacheControl } = await buildPageContext(/** @type {any} */ (ctx));
  assert.equal(cacheControl, "no-store");
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/settings.test.js`
Expected: FAIL (`effectiveCookie` hängt kein `kitpins` an; `buildPageContext` liefert `public, max-age=300`).

- [ ] **Step 3: Injektion + Regex implementieren**

In `effectiveCookie`, im `if (globalCfg) {`-Block, nach der `kitchrome`-Zeile:

```ts
    if (globalCfg.kitpins && !/(?:^|;\s*)kitpins=/.test(out)) out += (out ? "; " : "") + "kitpins=" + globalCfg.kitpins;
```

In `buildPageContext` die `hasPersonalCfg`-Zeile erweitern:

```ts
  const hasPersonalCfg = /(?:^|;\s*)kit(?:struct|chrome|pins)=/.test(cookie);
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `node --test test/settings.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/settings.ts test/settings.test.js
git commit -m "feat(pins): kitpins global injizieren + no-store für Vorschau"
```

---

## Task 4: `applyPins()` (reine Reorder-Funktion)

**Files:**
- Modify: `functions/_lib/render.ts` (neue exportierte Funktion, nach den Imports / vor `renderLanding`)
- Test: `test/render.test.js`

- [ ] **Step 1: Failing tests schreiben**

In `test/render.test.js` Import ergänzen:

```js
import { prepareFullText, renderPost, renderOnboarding, applyPins } from "../functions/_lib/render.ts";
```

Und ans Ende anfügen:

```js
const PINITEMS = ["g1", "g2", "g3", "g4"].map((g) => ({
  title: g, description: "", categories: [], image: "", link: "", guid: g, pubDate: "", content: "",
}));
const ids = (arr) => arr.map((i) => i.guid);

test("applyPins: gepinnte zuerst in Reihenfolge, Rest chronologisch", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, ["g3", "g1"])), ["g3", "g1", "g2", "g4"]);
});
test("applyPins: leere/fehlende Liste = No-Op", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, [])), ["g1", "g2", "g3", "g4"]);
  assert.deepEqual(ids(applyPins(PINITEMS, undefined)), ["g1", "g2", "g3", "g4"]);
});
test("applyPins: unbekannte GUIDs übersprungen, Duplikate dedupliziert", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, ["gX", "g2", "g2"])), ["g2", "g1", "g3", "g4"]);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/render.test.js`
Expected: FAIL (`applyPins` not exported).

- [ ] **Step 3: `applyPins` implementieren**

In `functions/_lib/render.ts` direkt vor `/* ----...---- Seiten */` (vor `renderLanding`) einfügen:

```ts
/**
 * Gepinnte Beiträge (in Reihenfolge, nur im Feed vorhandene, dedupliziert) nach vorn
 * ziehen; der Rest bleibt in Feed-Reihenfolge. Leere/fehlende Liste = unverändert.
 */
export function applyPins(items: FeedItem[], guids?: string[]): FeedItem[] {
  if (!guids || !guids.length) return items;
  const byGuid = new Map(items.map(it => [it.guid, it]));
  const seen = new Set<string>();
  const pinned: FeedItem[] = [];
  for (const g of guids) {
    if (seen.has(g)) continue;
    const it = byGuid.get(g);
    if (it) { pinned.push(it); seen.add(g); }
  }
  if (!pinned.length) return items;
  return pinned.concat(items.filter(it => !seen.has(it.guid)));
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `node --test test/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/render.ts test/render.test.js
git commit -m "feat(pins): applyPins() Reorder-Helfer"
```

---

## Task 5: `renderLanding` nutzt `/`-Pins (Pin 1 = Hero)

**Files:**
- Modify: `functions/_lib/render.ts` (`renderLanding`, ~162-174)
- Test: `test/render.test.js`

- [ ] **Step 1: Failing test schreiben**

In `test/render.test.js` ans Ende anfügen:

```js
const LANDITEMS = ["g1", "g2", "g3", "g4", "g5"].map((g) => ({
  title: "Titel-" + g, description: "Teaser " + g, categories: ["x"],
  image: "", link: "", guid: g, pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
}));

test("renderLanding: Pin 1 wird Hero, Reihenfolge respektiert", () => {
  const cfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: { "/": ["g3", "g1"] } };
  const html = renderLanding(LANDITEMS, 1, /** @type {any} */ (cfg));
  assert.match(html, /hero__title[^]*\/posts\/g3/); // g3 ist der Hero
  assert.ok(html.indexOf("/posts/g3") < html.indexOf("/posts/g1")); // g3 vor g1
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/render.test.js`
Expected: FAIL (g1 ist Hero, da Feed-Reihenfolge unverändert).

- [ ] **Step 3: Pins in `renderLanding` einbauen**

Den Default-Cfg-Fallback (~163) um `pins: {}` ergänzen:

```ts
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {} } as unknown as RenderCfg;
```

Den Hero-Block (~166-168) ersetzen:

```ts
  const pinList = (cfg.pins && cfg.pins["/"]) || [];
  const items2 = applyPins(items, pinList);
  const heroIdx = pinList.length ? 0 : (PINNED_GUID ? Math.max(0, items2.findIndex(i => i.guid === PINNED_GUID)) : 0);
  const hero = items2[heroIdx];
  const rest = items2.filter((_, i) => i !== heroIdx);
  const cats = topCategories(items2);
```

> Alle nachfolgenden `items`-Referenzen in `renderLanding` betreffen nur `hero`/`rest`/`cats`, die jetzt auf `items2` basieren — keine weiteren Änderungen nötig.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/render.ts test/render.test.js
git commit -m "feat(pins): renderLanding nutzt /-Pins (Pin 1 = Hero)"
```

---

## Task 6: `renderSection` nutzt `rubrik/<slug>`-Pins (Pin 1 = Featured)

**Files:**
- Modify: `functions/_lib/render.ts` (`renderSection`, ~217-225)
- Test: `test/render.test.js`

- [ ] **Step 1: Failing test schreiben**

In `test/render.test.js` Import ergänzen (`renderSection`):

```js
import { prepareFullText, renderPost, renderOnboarding, applyPins, renderLanding, renderSection } from "../functions/_lib/render.ts";
```

Und ans Ende anfügen:

```js
test("renderSection: Pin 1 wird Featured der Sektion", () => {
  const items = ["g1", "g2", "g3"].map((g) => ({
    title: "T-" + g, description: "", categories: ["politik"], image: "", link: "",
    guid: g, pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
  }));
  const cfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: { "rubrik/politik": ["g2"] } };
  const html = renderSection("politik", items, items, 1, /** @type {any} */ (cfg));
  assert.match(html, /aufmacher__title[^]*\/posts\/g2/); // g2 ist Featured
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/render.test.js`
Expected: FAIL (g1 ist Featured).

- [ ] **Step 3: Pins in `renderSection` einbauen**

Den Default-Cfg-Fallback (~218) um `pins: {}` ergänzen:

```ts
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {} } as unknown as RenderCfg;
```

Die Zeilen `const featured = items[0]; const rest = items.slice(1);` (~221-222) ersetzen:

```ts
  const ordered = applyPins(items, cfg.pins && cfg.pins["rubrik/" + slug]);
  const featured = ordered[0];
  const rest = ordered.slice(1);
```

> `slug` ist in `renderSection` bereits oben aus `slugify(category)` berechnet.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/render.ts test/render.test.js
git commit -m "feat(pins): renderSection nutzt Rubrik-Pins (Pin 1 = Featured)"
```

---

## Task 7: `kitpins` persistieren (`PUT /api/config`)

**Files:**
- Modify: `functions/api/config.ts` (PUT-Blob, ~29-34)
- Create: `test/config.test.js`

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `test/config.test.js`:

```js
// test/config.test.js — PUT /api/config persistiert kitpins (admin-gated).
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPut } from "../functions/api/config.ts";

function memKV() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
  };
}

test("PUT /api/config speichert kitpins (mit Admin-Code)", async () => {
  const kv = memKV();
  const env = { KIT_KV: kv, KIT_ADMIN_CODE: "secret" };
  const pins = JSON.stringify({ "/": ["g1"] });
  const req = new Request("https://x/api/config", {
    method: "PUT",
    headers: { "x-kit-admin": "secret", "content-type": "application/json" },
    body: JSON.stringify({ skin: {}, kitstruct: "", kitchrome: "", kitpins: pins }),
  });
  const res = await onRequestPut(/** @type {any} */ ({ request: req, env }));
  assert.equal(res.status, 200);
  const saved = JSON.parse(await kv.get("config"));
  assert.equal(saved.kitpins, pins);
});

test("PUT /api/config ohne Admin-Code → 401", async () => {
  const env = { KIT_KV: memKV(), KIT_ADMIN_CODE: "secret" };
  const req = new Request("https://x/api/config", {
    method: "PUT", headers: { "content-type": "application/json" }, body: "{}",
  });
  const res = await onRequestPut(/** @type {any} */ ({ request: req, env }));
  assert.equal(res.status, 401);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test test/config.test.js`
Expected: FAIL (gespeicherter Blob hat kein `kitpins`).

- [ ] **Step 3: `kitpins` in den Blob aufnehmen**

In `functions/api/config.ts`, im `onRequestPut`-`blob` (nach der `kitchrome`-Zeile):

```ts
    kitpins: typeof body.kitpins === "string" ? body.kitpins.slice(0, 8000) : "",
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test test/config.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/config.ts test/config.test.js
git commit -m "feat(pins): kitpins im PUT /api/config-Blob persistieren"
```

---

## Task 8: Client-Labels (i18n, de + en)

**Files:**
- Modify: `functions/_lib/i18n.ts` (de `client` ~195-217, en `client` ~392-414)

- [ ] **Step 1: Labels in beiden Sprachen ergänzen**

Im **de**-`client`-Objekt (z. B. nach `"palette.dark"`):

```ts
      "pin.add": "Nach oben anpinnen",
      "pin.remove": "Pin entfernen",
      "pin.label": "Angepinnt",
      "pin.max": "Maximal 3 Beiträge pro Bereich.",
```

Im **en**-`client`-Objekt an gleicher Stelle:

```ts
      "pin.add": "Pin to top",
      "pin.remove": "Remove pin",
      "pin.label": "Pinned",
      "pin.max": "Maximum 3 posts per section.",
```

- [ ] **Step 2: Paritäts- und Typtests**

Run: `node --test test/i18n.test.js && npm run check`
Expected: PASS (de/en-Key-Parität erfüllt; tsc fehlerfrei).

- [ ] **Step 3: Commit**

```bash
git add functions/_lib/i18n.ts
git commit -m "feat(pins): Client-Labels für Pin-Toggle (de + en)"
```

---

## Task 9: Pin-Injector + Toggle im Client (`kit-panel.js`)

**Files:**
- Modify: `public/assets/kit-panel.js` (Publish-Payload ~681, Reset ~656-657, neuer Block vor `})();`)

- [ ] **Step 1: `kitpins` in die Publish-Payload aufnehmen**

In `kit-panel.js` die Payload-Zeile (~681) ersetzen:

```js
      var payload = { skin: skin, kitstruct: cookieValue("kitstruct"), kitchrome: cookieValue("kitchrome"), kitpins: cookieValue("kitpins") };
```

- [ ] **Step 2: Reset um `kitpins` erweitern**

Im Reset-Handler (~656-657) nach den beiden `document.cookie`-Zeilen ergänzen:

```js
    document.cookie = "kitpins=;path=/;max-age=0";
```

- [ ] **Step 3: Pin-Injector-Block hinzufügen**

Unmittelbar vor dem schließenden `})();` der Haupt-IIFE einfügen:

```js
  /* ---------------------------------------------------------------- Beiträge anpinnen */
  // Nur für Admins (kitAdmin vorhanden) und nur sichtbar im Editing-Modus (html.cz-on,
  // per CSS). Pins liegen im kitpins-Cookie {scope:[guid]}; Scope = aktuelle Seite.
  /** @returns {string|null} "/" | "rubrik/<slug>" | null */
  function pinScope() {
    var p = location.pathname;
    if (p === "/" || p === "") return "/";
    var m = p.match(/^\/rubrik\/([^/]+)\/?$/);
    return m ? "rubrik/" + decodeURIComponent(m[1]) : null;
  }
  /** @returns {Record<string,string[]>} */
  function pinsRead() {
    var m = document.cookie.match(/(?:^|;\s*)kitpins=([^;]*)/);
    if (!m) return {};
    try { var o = JSON.parse(decodeURIComponent(m[1])); return (o && typeof o === "object") ? o : {}; }
    catch (e) { return {}; }
  }
  /** @param {Record<string,string[]>} map */
  function pinsWrite(map) {
    document.cookie = "kitpins=" + encodeURIComponent(JSON.stringify(map)) + ";path=/;max-age=31536000";
    location.reload();
  }
  var PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.8V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.8a2 2 0 0 0 1.1 1.8l1.8.9A2 2 0 0 1 19 15.2V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-.8a2 2 0 0 1 1.1-1.8l1.8-.9A2 2 0 0 0 9 10.8Z"/></svg>';
  (function () {
    var scope = pinScope();
    var isAdmin = false;
    try { isAdmin = !!localStorage.getItem("kitAdmin"); } catch (e) {}
    if (!scope || !isAdmin) return;
    var list = (function () { var l = pinsRead()[scope]; return Array.isArray(l) ? l : []; })();
    var cards = document.querySelectorAll("a.card, a.teaser-row, a.teaser-text, a.feat-main");
    for (var i = 0; i < cards.length; i++) {
      (function (cardEl) {
        var href = cardEl.getAttribute("href") || "";
        var mm = href.match(/^\/posts\/(.+)$/);
        if (!mm) return;
        var guid = decodeURIComponent(mm[1]);
        var meta = cardEl.querySelector(".card__date");
        if (!meta) return;
        var pinned = list.indexOf(guid) >= 0;
        var btn = document.createElement("span");
        btn.className = "card__pin" + (pinned ? " is-pinned" : "");
        btn.setAttribute("role", "button");
        btn.setAttribute("tabindex", "0");
        btn.setAttribute("aria-pressed", pinned ? "true" : "false");
        btn.setAttribute("aria-label", pinned ? T("pin.remove", "Pin entfernen") : T("pin.add", "Nach oben anpinnen"));
        btn.innerHTML = PIN_SVG + '<span class="card__pin-t">' + T("pin.label", "Angepinnt") + "</span>";
        /** @param {Event} e */
        function toggle(e) {
          e.preventDefault(); e.stopPropagation();
          var map = pinsRead();
          var l = Array.isArray(map[scope]) ? map[scope].slice() : [];
          var at = l.indexOf(guid);
          if (at >= 0) { l.splice(at, 1); }
          else {
            if (l.length >= 3) { alert(T("pin.max", "Maximal 3 Beiträge pro Bereich.")); return; }
            l.push(guid);
          }
          if (l.length) map[scope] = l; else delete map[scope];
          pinsWrite(map);
        }
        btn.addEventListener("click", toggle);
        btn.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { toggle(e); }
        });
        meta.appendChild(btn);
      })(cards[i]);
    }
  })();
```

- [ ] **Step 4: Browser-Typcheck**

Run: `npm run check`
Expected: PASS (tsconfig.browser.json prüft `kit-panel.js` via JSDoc/checkJs).

- [ ] **Step 5: Commit**

```bash
git add public/assets/kit-panel.js
git commit -m "feat(pins): Pin-Injector + Toggle im Customizer-Client"
```

---

## Task 10: Pin-Styles + Panel-Reflow (`kit.css`)

**Files:**
- Modify: `public/assets/kit.css` (`.cz` ~311, neue Regeln)

- [ ] **Step 1: Panelbreite als Variable + Reflow**

`.cz`-Regel (~311): `width:340px;` → `width:var(--cz-w);` ändern. Dann am Anfang des Panel-Block-Bereichs (z. B. direkt vor `.cz-fab`) ergänzen:

```css
:root{--cz-w:340px;}
@media (min-width:960px){html.cz-on body{margin-right:var(--cz-w);transition:margin-right .25s ease-in-out;}}
```

- [ ] **Step 2: Pin-Toggle-Styles**

Ans Ende von `kit.css` anfügen:

```css
.card__pin{display:none;align-items:center;gap:5px;margin-left:auto;padding:2px 7px;font:inherit;font-size:12px;line-height:1;color:var(--color-ink-soft);background:none;border:1px solid transparent;border-radius:0;cursor:pointer;}
.card__pin svg{width:15px;height:15px;flex:none;}
.card__pin-t{display:none;}
.card__pin:hover{color:var(--color-brand);}
.card__pin.is-pinned{color:var(--color-brand);border-color:currentColor;}
.card__pin.is-pinned .card__pin-t{display:inline;}
html.cz-on .card__date{display:flex;align-items:center;gap:8px;}
html.cz-on .card__pin{display:inline-flex;}
```

- [ ] **Step 3: Asset-Version bumpen**

Run: `npm run bump-assets`
Expected: aktualisiert `ASSET_VERSION` in `functions/_lib/config.ts` und die Fixture `test/asset-hash.json`.

- [ ] **Step 4: Asset-Version-Test**

Run: `node --test test/asset-version.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/assets/kit.css functions/_lib/config.ts test/asset-hash.json
git commit -m "feat(pins): Pin-Toggle-Styles + Panel-Reflow statt Overlay"
```

---

## Task 11: Integration — voller Check, Tests, Browser-QA

**Files:** keine Code-Änderung (Verifikation; ggf. Folge-Fixes)

- [ ] **Step 1: Voller Typecheck + Testlauf**

Run: `npm run check && npm test`
Expected: PASS (alle Suites).

- [ ] **Step 2: Dev-Server booten + Smoke**

Run: `npm run dev` (Port 8788), dann `curl -s localhost:8788/ | head -c 400`
Expected: HTTP-Render der Startseite (kein 500).

- [ ] **Step 3: Browser-QA Reflow + Pins**

Über `/browse` (gstack) bzw. das Preview-Tooling:
- Admin-Code setzen (Panel → „Für alle Besucher speichern" einmal anstoßen, Code eingeben — legt `localStorage.kitAdmin` an), Seite neu laden.
- Panel öffnen → **prüfen:** Inhalt wird schmaler (Reflow ≥ 960 px), **keine** Karte vom Panel verdeckt; Header nicht überlappt. *(Ist der Header `position:fixed` und wird überlappt, Regel `html.cz-on .site-header{margin-right:var(--cz-w)}` ergänzen und Asset erneut bumpen.)*
- Pin-Icon erscheint in der Karten-Meta-Zeile (nur bei offenem Panel). Drei Beiträge anpinnen → nach Reload stehen sie oben, Pin 1 ist Aufmacher. 4. Pin → Hinweis „Maximal 3".
- Panel schließen → Pins verschwinden (echte Besucher-Ansicht).
- Auf einer `/rubrik/<slug>`-Seite dasselbe → eigener Bereich, eigener Aufmacher.
- „Für alle Besucher speichern" → in privatem Fenster (ohne Cookie) prüfen, dass die Reihenfolge global greift.

- [ ] **Step 4: Golden-Master (Regression ohne Pins)**

Run: `node scripts/golden-master.ts v1-final` *(falls der v1-Ref verfügbar ist)*
Expected: Ohne gesetzte/veröffentlichte Pins identische Ausgabe (Pin-Feature ist additiv und greift nur bei vorhandenen Pins).

- [ ] **Step 5: Abschluss-Commit (falls QA-Fixes nötig waren)**

```bash
git add -A
git commit -m "fix(pins): QA-Korrekturen (Reflow/Header/Pin-UX)"
```

---

## Self-Review (vom Plan-Autor durchgeführt)

- **Spec-Abdeckung:** §3 UX → Task 9/10; §3 Reflow → Task 10/11; §4 Scope → Task 5/6/9; §5 Persistenz → Task 2/3/7/9; §6 Dateien → Task 1–10; §8 Icon → Task 9 (`PIN_SVG`); §9 Rückwärtskompat (`PINNED_GUID`-Fallback, No-Op ohne Pins) → Task 5 + Task 4; §9 Caching → Task 3; §11 Tests → Task 2–8 + 11; §12 Asset-Bump/Schema → Task 10/11. Keine Lücke.
- **Platzhalter:** keine — jeder Code-Schritt enthält vollständigen Code; die einzige bedingte Stelle (fixed-Header-Regel) ist als konkrete QA-Anweisung mit fertiger CSS-Regel formuliert.
- **Typkonsistenz:** `StructCfg.pins: Record<string,string[]>` (Task 1) wird in `parseStruct` (Task 2), `render.ts` (`cfg.pins["/"]`, `cfg.pins["rubrik/"+slug]`, Task 5/6) und Client (`pinsRead`/`pinsWrite`, Task 9) konsistent als Map verwendet; `GlobalConfig.kitpins: string` (Task 1) ↔ `effectiveCookie` (Task 3) ↔ Publish-Payload `kitpins` (Task 9) ↔ Blob (Task 7) durchgängig String. `applyPins(items, guids?)`-Signatur identisch in Definition (Task 4) und Aufrufen (Task 5/6).
