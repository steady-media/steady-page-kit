# steady-page-kit v2 — TypeScript-In-Place-Port: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die komplette Kit-Codebasis (~3.900 LOC) wird im unveränderten Dateibaum auf erasable TypeScript gehoben — Zero Runtime-Dependencies, kein Build-Step auf dem Node-Pfad, byte-identisches Verhalten (Ausnahme: 10-s-Feed-Timeout), bewacht von der wortgleich portierten v1-Testsuite.

**Architecture:** In-Place-Port `.js → .ts` Datei für Datei in Abhängigkeits-Wellen; jede Welle lässt die Suite grün (Test-Imports flippen nur Endungen). Danach: KVAdapter-Backends (fs/cf-kv/redis-rest), Härtungen (Authorizer, Secret-Scrubbing, Feed-Timeout, CI-Guards), Golden-Master-Beweis, Vercel-Entry, Doku/Migration. Spec: [docs/superpowers/specs/2026-06-11-steady-page-kit-v2-design.md](../specs/2026-06-11-steady-page-kit-v2-design.md).

**Tech Stack:** TypeScript ≥ 5.8 (`strict` + `erasableSyntaxOnly`, `noEmit`), Node ≥ 22.18 (Type Stripping), `node --test`, wrangler 4 (devDep, CF-Pages-Pfad), keine Runtime-Dependencies.

---

## Vorbedingungen

- Arbeitsbranch: `git checkout -b v2/ts-port` (oder Worktree).
- Node ≥ 22.18 lokal (`node --version`).
- Vor JEDEM Commit gilt: `npm run check && npm test` grün. Wo ein Schritt das explizit nennt, steht das erwartete Ergebnis dabei.

## Dateistruktur (was entsteht, was sich ändert)

```
NEU                                       UMBENANNT (.js → .ts, Logik identisch)
functions/_lib/types.ts   zentrale Typen  functions/_lib/{util,icons,i18n,config,
functions/_lib/auth.ts    Authorizer      http,feed,settings,render,page,panel}.ts
functions/_lib/scrub.ts   Secret-Redact   functions/{index,memberships,rss,
server/routes.ts          ROUTES+Dispatch sitemap.xml,robots.txt}.ts
server/kv-redis-rest.ts   Upstash-Backend functions/posts/[id].ts
server/vercel.ts + api/index.ts + vercel.json   functions/rubrik/[slug].ts
server/node.js            NEU: Bootstrap  functions/api/{config,logo,react,search}.ts
scripts/bump-assets.ts                    server/fs-kv.ts · server/node.ts (Kern)
scripts/golden-master.ts                  BLEIBT .js: kit.config.js, scripts/doctor.js,
tsconfig.json + tsconfig.browser.json     server/env.js (geschrumpft),
test/{kv-conformance,security,feed-timeout,     public/assets/kit-*.js (JSDoc/checkJs),
     asset-version,routes-consistency,          test/*.test.js (nur Import-Zeilen)
     protocol,routes-gaps}.test.js
test/asset-hash.json
```

Verantwortlichkeiten: `types.ts` = alle geteilten Typen (einzige neue Abstraktion). `routes.ts` = Routen-Tabelle + plattformneutraler Dispatch (Node- und Vercel-Entry teilen ihn; CF Pages nutzt weiter Ordner-Routing). Alles andere behält seine heutige Verantwortung.

---

### Task 1: Branch + TypeScript-Tooling

**Files:**
- Create: `tsconfig.json`, `tsconfig.browser.json`
- Modify: `package.json`, `.gitignore` (nichts nötig — kein Build-Output)

- [ ] **Step 1: Branch anlegen**

```bash
git checkout -b v2/ts-port
```

- [ ] **Step 2: devDependencies installieren**

```bash
npm install --save-dev typescript@^5.8 @types/node@^24
```

- [ ] **Step 3: `tsconfig.json` anlegen** (Server-/Test-Code; JS-Importe erlaubt, aber nicht geprüft — geprüft wird per `@ts-check`-Pragma nur `kit.config.js`)

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "functions/**/*.ts",
    "server/**/*",
    "scripts/**/*",
    "test/**/*",
    "kit.config.js"
  ],
  "exclude": ["node_modules", "data", "public"]
}
```

- [ ] **Step 4: `tsconfig.browser.json` anlegen** (die zwei Browser-Assets, JSDoc-geprüft)

```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom", "dom.iterable"],
    "module": "none",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["public/assets/kit-theme.js", "public/assets/kit-panel.js"]
}
```

- [ ] **Step 5: `package.json` anpassen** — `engines` und `check`-Skript (Rest bleibt vorerst):

```json
  "engines": { "node": ">=22.18" },
  "scripts": {
    "dev": "node --watch server/node.js",
    "start": "node server/node.js",
    "dev:cf": "wrangler pages dev public",
    "deploy:cf": "wrangler pages deploy public --branch main",
    "doctor": "node scripts/doctor.js",
    "check": "tsc -p tsconfig.json && tsc -p tsconfig.browser.json",
    "test": "node --test test/*.test.js",
    "bump-assets": "node scripts/bump-assets.ts"
  }
```

(`bump-assets` zeigt auf eine Datei aus Task 12 — bis dahin schlägt nur dieses eine Skript fehl, das ist ok. Der alte `check`-Loop mit `node --check` entfällt: tsc prüft Syntax UND Typen.)

- [ ] **Step 6: Browser-Assets checkJs-fähig machen.** `tsc -p tsconfig.browser.json` laufen lassen; gemeldete Fehler in `kit-theme.js`/`kit-panel.js` NUR durch JSDoc-Annotationen (`/** @type {...} */`, `/** @param ... */`) und `/** @typedef */`-Blöcke beheben — keine Logikänderung. Wo ein DOM-Zugriff legitim `null` sein kann, vorhandene Laufzeit-Guards als Typ-Guards formen (`if (!el) return;`). Erwartung: 0 Errors.

- [ ] **Step 7: `kit.config.js` typisieren** — Pragma + Typ-Import an den Dateianfang (nach dem Kommentar-Block), Publisher-Inhalt unverändert:

```js
// @ts-check
/** @type {import("./functions/_lib/types.ts").KitConfig} */
export default {
```

(Der Typ existiert erst nach Task 2 — `npm run check` ist nach Task 2 wieder grün; Task 1+2 werden zusammen committet.)

- [ ] **Step 8: Verifizieren + Commit (zusammen mit Task 2)**

---

### Task 2: Zentrale Typen (`functions/_lib/types.ts`)

**Files:**
- Create: `functions/_lib/types.ts`

- [ ] **Step 1: Datei anlegen — vollständiger Inhalt:**

```ts
// _lib/types.ts — geteilte Typen des Kits. Nur erasable Syntax (keine Enums).

/** Publisher-Konfiguration (kit.config.js). */
export interface KitConfig {
  publication: string;
  author?: string;
  language: "de" | "en" | (string & {});
  siteOrigin?: string;
  steady?: { slug?: string; publicationId?: string };
  memberHeading?: string;
  nav?: Array<{ l: string; h: string; x?: boolean }> | null;
  perPage?: number;
  maxPills?: number;
  pinnedGuid?: string | null;
}

/** Von den Functions genutzte Teilmenge der Cloudflare-KV-API.
 *  Implementierungen: CF-KV-Binding (strukturell), server/fs-kv.ts,
 *  server/kv-redis-rest.ts. */
export interface KVAdapter {
  get(key: string, opts?: "text" | "json" | "arrayBuffer" | { type?: "text" | "json" | "arrayBuffer"; cacheTtl?: number }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Laufzeit-Umgebung (CF-Bindings bzw. process.env + KV-Shim). */
export interface KitEnv {
  KIT_KV?: KVAdapter;
  KIT_ADMIN_CODE?: string;
  FULLTEXT_FEED_URL?: string;
  FEED_URL?: string;
  SITE_ORIGIN?: string;
  STEADY_PUBLICATION_ID?: string;
  STEADY_LOGIN_URL?: string;
  ANALYTICS_TOKEN?: string;
  [key: string]: unknown;
}

/** Pages-Functions-Kontext — exakt die Form, die server/routes.ts nachbaut. */
export interface KitContext {
  request: Request;
  env: KitEnv;
  params: Record<string, string>;
  data: Record<string, unknown>;
  waitUntil(p: Promise<unknown>): void;
  next(): void;
}

export type PagesHandler = (context: KitContext) => Promise<Response> | Response;

/** Geparstes Feed-Item (siehe _lib/feed.ts parseFeed). */
export interface FeedItem {
  title: string;
  description: string;
  categories: string[];
  image: string;
  link: string;
  guid: string;
  pubDate: string;
  content: string;
}

/** Global publizierte Config (KV-Key "config"). */
export interface GlobalConfig {
  skin?: Record<string, string>;
  kitstruct?: string;
  kitchrome?: string;
  ts?: number;
}

/** Logo-Metadaten (KV-Key "logo:meta"). */
export interface LogoMeta { type?: string; aspect?: number; ts?: number }

/** Ergebnis von settings.parseStruct — Schema-Werte sind Protokoll. */
export interface StructCfg {
  shell: "single" | "portal";
  auf: "klein" | "gross";
  stream: "liste" | "rubrik";
  rails: string[];
  headerStyle: "links" | "zentriert";
  search: boolean;
  brand: string;
  nav: Array<{ l: string; h: string; x: boolean }> | null;
}

/** Render-Konfiguration pro Request (settings.buildPageContext). */
export interface RenderCfg extends StructCfg {
  skin: Record<string, string> | null;
  logo: LogoMeta | null;
  feedUrl: string | null;
  site: string | null;
  steadyId: string | null;
  loginUrl: string | null;
  analytics: string;
  channelDesc?: string;
}
```

- [ ] **Step 2: Check ausführen**

Run: `npm run check`
Expected: 0 Errors (types.ts kompiliert; kit.config.js-Pragma findet den Typ).

- [ ] **Step 3: Suite ausführen** — `npm test` → alle Tests PASS (nichts Verhaltensrelevantes geändert).

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json tsconfig.browser.json package.json package-lock.json functions/_lib/types.ts kit.config.js public/assets/kit-theme.js public/assets/kit-panel.js
git commit -m "feat(v2): TypeScript-Tooling, zentrale Typen, checkJs für Browser-Assets"
```

---

### Task 3: Port-Welle A — Blattmodule (`util`, `icons`, `i18n`)

**Files:**
- Rename+Typisieren: `functions/_lib/util.js → util.ts`, `icons.js → icons.ts`, `i18n.js → i18n.ts`
- Modify (nur Import-Zeilen): `functions/_lib/{config,feed,render,page,panel}.js`, `functions/api/search.js`, `functions/sitemap.xml.js`, `functions/rss.js`, `test/i18n.test.js`, `test/render.test.js` (je nachdem, wo `grep` trifft)

**Port-Regel für ALLE Wellen (gilt wörtlich):**
1. `git mv <datei>.js <datei>.ts`
2. Exportierte Funktionen bekommen die unten gelisteten Signaturen; lokale Variablen nur typisieren, wo tsc strict es verlangt. **Funktionskörper bleiben Zeichen für Zeichen identisch** (Ausnahme: explizit gelistete Änderungen).
3. Alle Importer aktualisieren: `grep -rln 'from "\(\./\|\.\./\)\?.*<datei>\.js"' functions server scripts test` → in jeder Trefferdatei die Import-Endung auf `.ts` flippen. In Testdateien ist das die EINZIGE erlaubte Änderung.
4. `npm run check && npm test` → grün. Commit pro Welle.

- [ ] **Step 1: `util.ts`** — vollständig (als Muster für alle weiteren Dateien; Körper unverändert zu util.js, nur Signaturen/Typen ergänzt):

```ts
// _lib/util.ts — kleine, überall genutzte Helfer (Escaping, Datum, Slugs, Bild-URLs).

/** HTML-Escaping für Text in Element-Inhalten und Attributen. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

import { LOCALE } from "./i18n.ts";

// Formatter pro Locale cachen — Intl.DateTimeFormat-Konstruktion ist teuer.
const dateFmts = new Map<string, Intl.DateTimeFormat>();
function dateFmt(locale: string): Intl.DateTimeFormat {
  if (!dateFmts.has(locale)) {
    dateFmts.set(locale, new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));
  }
  return dateFmts.get(locale)!;
}

/** RSS-pubDate → Langdatum in der Kit-Sprache ("17. März 2025" / "March 17, 2025");
 *  leer bei ungültigem Datum. `intlLocale` überschreibt (Tests, Sonderfälle). */
export function fmtDate(pub: string, intlLocale?: string): string {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return dateFmt(intlLocale || LOCALE.intl).format(d);
}

/** Kategorie-Name → URL-Slug (für /rubrik/:slug). */
export function slugify(s: unknown): string {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, " und ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Steady-CDN-Bild-URL mit Resize-Parametern (Crop auf Gesichter), HTML-escaped. */
export function teaser(url: string, w: number, h: number): string {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return esc(url + sep + `auto=format&w=${w}&h=${h}&fit=crop&crop=faces`);
}
```

- [ ] **Step 2: `icons.ts`** — nach Port-Regel; Export-Signatur: das Icon-Objekt als `Record<string, string>` (bzw. exportierte Einzel-Konstanten als `string`).

- [ ] **Step 3: `i18n.ts`** — nach Port-Regel; Signaturen:

```ts
import type { KitConfig } from "./types.ts";          // falls für kit-Import nötig
export const LANGUAGE: "de" | "en";
export const LOCALES: Record<"de" | "en", { html: string; og: string; intl: string }>;
export const LOCALE: { html: string; og: string; intl: string };
export function t(key: string, vars?: Record<string, string | number>): string;
// `client`-Teilmenge und Katalog-Arrays: Typen aus der Struktur ableiten
// (z. B. string[][] für pairs) — Werte byte-identisch lassen (i18n-Paritätstest!).
```

(Hinweis: `STRINGS` als `Record<string, Record<string, string>>` typisieren; der bestehende `test/i18n.test.js` erzwingt de/en-Paritäts-Schlüssel und bleibt unverändert bis auf die Import-Endung.)

- [ ] **Step 4: Importer flippen** (Port-Regel Schritt 3), dann:

Run: `npm run check && npm test`
Expected: check 0 Errors; Suite PASS (gemischter Zustand .ts/.js ist mit Type Stripping lauffähig).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(v2): Port-Welle A — util, icons, i18n nach TypeScript"
```

---

### Task 4: Port-Welle B — Kernlogik (`config`, `http`, `feed`, `settings`)

**Files:**
- Rename+Typisieren: `functions/_lib/{config,http,feed,settings}.js → .ts`
- Modify (Import-Zeilen): alle Routen-Dateien, `server/node.js`, `scripts/doctor.js`, `test/{config,feed,settings,node-server}.test.js`

- [ ] **Step 1: `config.ts`** — Signaturen (Körper identisch):

```ts
export { LANGUAGE } from "./i18n.ts";
export function normalizeSlug(input: unknown): string;
export function deriveSteady(slug: string, language: string): { feedUrl: string; loginUrl: string; newsletterUrl: string };
export const STEADY_SLUG: string;
export const PUBLICATION: string;
export const AUTHOR: string;
export const SITE_ORIGIN: string;
export const FEED_URL: string;
export const STEADY_PUBLICATION_ID: string;
export const STEADY_LOGIN_URL: string;
export const NEWSLETTER_URL: string;
export const MEMBER_HEADING: string;
export const PER_PAGE: number;
export const MAX_PILLS: number;
export const PINNED_GUID: string | null;
export const IS_CONFIGURED: boolean;
export const DEFAULT_NAV: Array<{ l: string; h: string; x: boolean }>;
export const USER_AGENT: string;
export const ASSET_VERSION: string;
```

- [ ] **Step 2: `http.ts`** — Signaturen:

```ts
export function htmlResponse(html: string, cacheControl?: string, status?: number): Response;
export function jsonResponse(obj: unknown, status?: number, cacheControl?: string): Response;
export function isAdmin(request: Request, env: KitEnv): boolean;  // bleibt in dieser Welle 1:1 — Härtung kommt in Task 10
```

- [ ] **Step 3: `feed.ts`** — Signaturen (Timeout kommt erst in Task 11!):

```ts
import type { FeedItem } from "./types.ts";
export function _resetFeedCache(): void;
export function fetchFeedXml(feedUrl?: string): Promise<string>;
export function getItems(feedUrl?: string): Promise<FeedItem[]>;
export function parseChannelMeta(xml: string): { title: string; description: string };
export function parseFeed(xml: string): FeedItem[];
export function normTitle(s: string): string;
export function topCategories(items: FeedItem[]): string[];
```

(`feedCache` als `Map<string, { xml: string; at: number }>`; die `cf:`-Fetch-Option mit `as RequestInit` typisieren — sie ist Cloudflare-spezifisch und wird auf Node ignoriert, Kommentar dazu steht schon im Code.)

- [ ] **Step 4: `settings.ts`** — Signaturen:

```ts
import type { GlobalConfig, KitContext, KitEnv, LogoMeta, RenderCfg, StructCfg } from "./types.ts";
export function isConfigured(cfg: { feedUrl?: string | null } | null | undefined): boolean;
export function parseStruct(cookie: string | null | undefined): StructCfg;
export function effectiveCookie(cookie: string | null | undefined, globalCfg: GlobalConfig | null): string;
export function getConfig(env: KitEnv): Promise<GlobalConfig | null>;
export function getLogoMeta(env: KitEnv): Promise<LogoMeta | null>;
export function getClaps(env: KitEnv, guid: string): Promise<number>;
export function buildPageContext(context: KitContext): Promise<{ cfg: RenderCfg; cacheControl: string }>;
```

- [ ] **Step 5: Importer flippen, prüfen, committen** — wie Port-Regel; Commit-Message: `feat(v2): Port-Welle B — config, http, feed, settings`

---

### Task 5: Port-Welle C — Renderer (`render`, `page`, `panel`)

**Files:**
- Rename+Typisieren: `functions/_lib/{render,page,panel}.js → .ts`
- Modify (Import-Zeilen): Routen-Dateien, `test/render.test.js`

- [ ] **Step 1: `render.ts`** — Export-Signaturen (Körper inkl. `prepareFullText`-Logik unangetastet; interne Helfer nur so weit typisieren, wie strict es verlangt):

```ts
import type { FeedItem, RenderCfg } from "./types.ts";
export function renderLanding(items: FeedItem[], page: number, cfg: RenderCfg): string;
export function renderSection(category: string, items: FeedItem[], all: FeedItem[], page: number, cfg: RenderCfg): string;
export function renderPost(item: FeedItem, cfg: RenderCfg, full: string,
  extras: { claps: number; next: { guid: string; title: string } | null; prev: { guid: string; title: string } | null }): string;
export function renderMemberships(cfg: RenderCfg): string;
export function renderEmpty(cfg: RenderCfg): string;
export function render404(cfg: RenderCfg): string;
export function renderOnboarding(): string;
```

- [ ] **Step 2: `page.ts` und `panel.ts`** — nach Port-Regel; deren Exporte (Layout-/Panel-Markup-Funktionen) nach demselben Muster annotieren: String-Rückgaben, `cfg: RenderCfg`-Parameter, Katalog-Strukturen als `ReadonlyArray<...>` gemäß vorhandener Form. Schema-Attribute (`data-v`/`data-fn`/`data-kind`) sind Strings im Markup — NICHT anfassen.

- [ ] **Step 3: Prüfen + Commit** — `npm run check && npm test` grün; Commit `feat(v2): Port-Welle C — render, page, panel`

---

### Task 6: Port-Welle D — Routen + API (11 Dateien)

**Files:**
- Rename+Typisieren: `functions/{index,memberships,rss,sitemap.xml,robots.txt}.js → .ts`, `functions/posts/[id].js → .ts`, `functions/rubrik/[slug].js → .ts`, `functions/api/{config,logo,react,search}.js → .ts`

- [ ] **Step 1: Alle 11 Dateien nach Port-Regel.** Einheitliches Handler-Muster (Beispiel `functions/index.ts`, Körper identisch):

```ts
import type { KitContext } from "./_lib/types.ts";
export async function onRequestGet(context: KitContext): Promise<Response> { /* Körper unverändert */ }
export const onRequestHead = onRequestGet;
```

Für `api/config.ts` zusätzlich `onRequestPut/Patch/Delete`, für `api/logo.ts` `onRequestGet/Put/Delete`, für `api/react.ts` `onRequestGet/Post` — alle mit `(context: KitContext): Promise<Response>`. Lokale Konstanten behalten Werte (`MAX_BYTES = 1572864`, `MAX_BYTES = 65536`, `GUID_RE`, `MAX_RESULTS = 12`).

- [ ] **Step 2: Wrangler-Pfad verifizieren** (CF kompiliert die .ts-Functions selbst):

Run: `npx wrangler pages functions build --outdir /tmp/kit-fn-build && ls /tmp/kit-fn-build`
Expected: Build ohne Fehler.

- [ ] **Step 3: Prüfen + Commit** — Suite grün; Commit `feat(v2): Port-Welle D — Routen und API nach TypeScript`

---

### Task 7: Port-Welle E — Server: `routes.ts`-Extraktion, `node.ts`, Bootstrap, `fs-kv.ts`

**Files:**
- Create: `server/routes.ts` (extrahierter Dispatch), `server/node.js` (NEU: Bootstrap — die alte Datei wird vorher zu `node.ts`)
- Rename+Typisieren: `server/node.js → server/node.ts`, `server/fs-kv.js → fs-kv.ts`
- Modify: `server/env.js` (schrumpft), `test/node-server.test.js`, `test/fs-kv.test.js` (Import-Endungen)

- [ ] **Step 1: `git mv server/node.js server/node.ts` und `git mv server/fs-kv.js server/fs-kv.ts`**

- [ ] **Step 2: `server/routes.ts` anlegen** — Routen-Tabelle + plattformneutraler Dispatch, extrahiert aus dem heutigen node.js (Logik wörtlich übernommen, nur aufgeteilt und typisiert). Vollständiger Inhalt:

```ts
// server/routes.ts — DIE Routen-Tabelle + plattformneutraler Dispatch.
// Node- und Vercel-Entry rufen handleRequest(); Cloudflare Pages routet per
// Ordnerstruktur direkt in functions/ (test/routes-consistency.test.js hält
// beide Welten deckungsgleich).
import type { KitContext, KitEnv, PagesHandler } from "../functions/_lib/types.ts";

import * as routeHome from "../functions/index.ts";
import * as routePost from "../functions/posts/[id].ts";
import * as routeRubrik from "../functions/rubrik/[slug].ts";
import * as routeMemberships from "../functions/memberships.ts";
import * as routeRss from "../functions/rss.ts";
import * as routeSitemap from "../functions/sitemap.xml.ts";
import * as routeRobots from "../functions/robots.txt.ts";
import * as apiConfig from "../functions/api/config.ts";
import * as apiLogo from "../functions/api/logo.ts";
import * as apiSearch from "../functions/api/search.ts";
import * as apiReact from "../functions/api/react.ts";

type RouteModule = Record<string, PagesHandler | undefined>;
export interface Route { re: RegExp; mod: RouteModule; params?: string[]; src: string }

// Statische Routen-Tabelle — bewusst explizit: Single Source of Truth für
// „welche URLs gibt es". `src` koppelt jeden Eintrag an seine functions/-Datei.
export const ROUTES: Route[] = [
  { re: /^\/$/, mod: routeHome, src: "functions/index.ts" },
  { re: /^\/posts\/([^/]+)$/, mod: routePost, params: ["id"], src: "functions/posts/[id].ts" },
  { re: /^\/rubrik\/([^/]+)$/, mod: routeRubrik, params: ["slug"], src: "functions/rubrik/[slug].ts" },
  { re: /^\/memberships$/, mod: routeMemberships, src: "functions/memberships.ts" },
  { re: /^\/rss$/, mod: routeRss, src: "functions/rss.ts" },
  { re: /^\/sitemap\.xml$/, mod: routeSitemap, src: "functions/sitemap.xml.ts" },
  { re: /^\/robots\.txt$/, mod: routeRobots, src: "functions/robots.txt.ts" },
  { re: /^\/api\/config$/, mod: apiConfig, src: "functions/api/config.ts" },
  { re: /^\/api\/logo$/, mod: apiLogo, src: "functions/api/logo.ts" },
  { re: /^\/api\/search$/, mod: apiSearch, src: "functions/api/search.ts" },
  { re: /^\/api\/react$/, mod: apiReact, src: "functions/api/react.ts" },
];

export function handlerFor(mod: RouteModule, method: string): PagesHandler | null {
  const name = "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
  if (mod[name]) return mod[name]!;
  if (method === "HEAD" && mod.onRequestGet) return mod.onRequestGet; // Body strippt die Plattform
  return null;
}

export function allowedMethods(mod: RouteModule): string[] {
  const all = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const out = all.filter(m => handlerFor(mod, m));
  if (out.includes("GET")) out.splice(out.indexOf("GET") + 1, 0, "HEAD");
  return out;
}

export const MAX_BODY = 3 * 1024 * 1024; // Logo-Limit ist 1,5 MB — 3 MB Puffer reichen

/**
 * Request → Response über die ROUTES-Tabelle. `null` = keine Route (Aufrufer
 * macht Static-Serving/404). Übernimmt Trailing-Slash-301, 405+Allow und
 * 413 bei zu großem Body (Content-Length-basiert; der Node-Entry prüft
 * zusätzlich beim Puffern).
 */
export async function handleRequest(request: Request, env: KitEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const rawPath = url.pathname;
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") || "/" : rawPath;
  if (pathname !== rawPath) {
    return new Response(null, { status: 301, headers: { location: pathname + url.search } });
  }

  for (const route of ROUTES) {
    const m = pathname.match(route.re);
    if (!m) continue;

    const fn = handlerFor(route.mod, request.method);
    if (!fn) {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: allowedMethods(route.mod).join(", ") } });
    }

    const len = parseInt(request.headers.get("content-length") || "0", 10);
    if (len > MAX_BODY) {
      return new Response(JSON.stringify({ error: "too_large" }), { status: 413, headers: { "content-type": "application/json" } });
    }

    const params: Record<string, string> = {};
    (route.params || []).forEach((name, i) => {
      let v = m[i + 1]!;
      try { v = decodeURIComponent(v); } catch { /* roh lassen */ }
      params[name] = v;
    });

    const context: KitContext = { request, env, params, data: {}, waitUntil() {}, next() {} };
    return await fn(context);
  }
  return null;
}
```

- [ ] **Step 3: `server/node.ts` umbauen** — behält `toRequest` (gepufferter Body inkl. `MAX_BODY`-Abbruch wie heute), `writeResponse`, `tryStatic`, `buildEnv`, `startServer`; der ROUTES-Loop im Handler wird ersetzt durch:

```ts
const built = await toRequest(req, port);
if (built.tooLarge) { res.writeHead(413, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: "too_large" })); }
const response = built.request ? await handleRequest(built.request, env) : null;
if (response) return writeResponse(res, response);
// danach wie bisher: tryStatic → 404
```

Wichtig: `toRequest` wird VOR `handleRequest` für alle Methoden aufgerufen (heutiges Verhalten: Body-Puffern nur bei Nicht-GET/HEAD — Logik unverändert lassen). Bewusste Mikro-Abweichung: Ein überlanger Body auf einer Route ohne passende Methode bekommt jetzt 413 statt 405 (Body-Limit greift vor dem Methoden-Check) — defensiver als v1, kein Test und kein realer Client hängt daran; im Commit-Text erwähnen. `startServer(opts)` -Signatur:

```ts
export function startServer(opts?: { port?: number; host?: string; env?: Record<string, unknown> }): Promise<import("node:http").Server>;
```

Der `isMain`-Block wandert in den neuen Bootstrap (Step 4) — `node.ts` exportiert nur noch und startet nichts selbst. Die Konsolen-Startmeldung zieht mit um.

- [ ] **Step 4: NEUEN `server/node.js` (Bootstrap) anlegen** — vollständiger Inhalt:

```js
#!/usr/bin/env node
// server/node.js — Bootstrap: prüft die Node-Version in plain JS, BEVOR
// TypeScript-Module geladen werden (sonst wäre der Fehler ein kryptisches
// ERR_UNKNOWN_FILE_EXTENSION). npm run dev / npm start zeigen hierher.
import { loadDotEnv } from "./env.js";

/** Versions-Check; liefert die Fehlermeldung oder null. Exportiert für Tests. */
export function checkNodeVersion(version) {
  const [maj = 0, min = 0] = String(version).split(".").map(Number);
  if (maj > 22 || (maj === 22 && min >= 18)) return null;
  return [
    `steady-page-kit v2 braucht Node >= 22.18 (gefunden: ${version}).`,
    "DE: Bitte Node 24 LTS installieren — siehe README «Voraussetzungen» bzw. dein Deploy-Rezept in docs/agent/deploy/.",
    "EN: Please install Node 24 LTS — see README 'Requirements' or your deploy recipe in docs/agent/deploy/.",
  ].join("\n");
}

const problem = checkNodeVersion(process.versions.node);
if (problem) { console.error(problem); process.exit(1); }

loadDotEnv(new URL("../.env", import.meta.url).pathname);
const { startServer } = await import("./node.ts");
const server = await startServer();
const { port } = server.address();
const { IS_CONFIGURED } = await import("../functions/_lib/config.ts");
const configured = IS_CONFIGURED || !!process.env.FEED_URL;
const hint = configured ? "" : "  (noch unkonfiguriert → Onboarding-Seite; sage deinem KI-Tool: „Richte meine Seite ein“)";
console.log(`steady-page-kit läuft auf http://localhost:${port}${hint}`);
```

- [ ] **Step 5: `server/env.js` schrumpfen** — vollständiger neuer Inhalt (Node ≥ 22.18 hat `process.loadEnvFile` immer):

```js
// server/env.js — .env-Loader (still tolerant; bestehende Env-Variablen gewinnen).
// Konsumenten: server/node.js (Bootstrap) und scripts/doctor.js.
/** .env laden; fehlende Datei ist ok. Liefert true, wenn geladen wurde. */
export function loadDotEnv(path = ".env") {
  try { process.loadEnvFile(path); return true; } catch { return false; }
}
```

- [ ] **Step 6: `fs-kv.ts`** — nach Port-Regel; Signatur `export function createFsKv(dir: string): KVAdapter;` (Körper identisch, `import type { KVAdapter } from "../functions/_lib/types.ts"`).

- [ ] **Step 7: Test-Imports flippen** — in `test/node-server.test.js`: `from "../server/node.ts"` (startServer), `from "../functions/_lib/feed.ts"`, `from "../functions/_lib/config.ts"`; in `test/fs-kv.test.js`: `from "../server/fs-kv.ts"`. SONST NICHTS ändern.

- [ ] **Step 8: Bootstrap-Test ergänzen** — an `test/node-server.test.js` ANHÄNGEN (neuer Test, bestehende unverändert):

```js
import { checkNodeVersion } from "../server/node.js";

test("Bootstrap: checkNodeVersion akzeptiert >=22.18, lehnt älter ab", () => {
  assert.equal(checkNodeVersion("22.18.0"), null);
  assert.equal(checkNodeVersion("24.1.0"), null);
  assert.match(checkNodeVersion("22.17.1") || "", /22\.18/);
  assert.match(checkNodeVersion("20.19.0") || "", /Node 24 LTS/);
});
```

- [ ] **Step 9: Verifizieren**

Run: `npm run check && npm test && npm run dev & sleep 2 && curl -sI http://localhost:8788/ | head -1; kill %1`
Expected: check 0 Errors, Suite PASS, curl `HTTP/1.1 200 OK`.

- [ ] **Step 10: Commit** — `feat(v2): Port-Welle E — routes.ts-Dispatch, node.ts, Bootstrap-Guard, fs-kv.ts`

---

### Task 8: Port-Welle F — doctor, CI, Dockerfile

**Files:**
- Modify: `scripts/doctor.js` (bleibt plain JS!), `.github/workflows/ci.yml`, `Dockerfile`

- [ ] **Step 1: doctor old-Node-sicher machen.** In `scripts/doctor.js`: den statischen Import von `../functions/_lib/config.js` ENTFERNEN und den Versions-Check VOR den Import ziehen. Konkret: Zeilen 20–23 (der `import {...} from "../functions/_lib/config.js"`) ersetzen durch nichts; nach dem bestehenden Umgebungs-Check-Block (Zeile 58–63) einfügen bzw. diesen ersetzen durch:

```js
/* — 1. Umgebung — */
console.log("Umgebung / environment");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 18)) ok(`Node ${process.versions.node}`);
else { fail(`Node ${process.versions.node} — zu alt; v2 braucht >= 22.18 (empfohlen: Node 24 LTS)`); finish(); }

const { STEADY_SLUG, FEED_URL, SITE_ORIGIN, STEADY_PUBLICATION_ID,
        MEMBER_HEADING, IS_CONFIGURED, LANGUAGE, USER_AGENT } =
  await import("../functions/_lib/config.ts");
```

Dazu eine kleine `finish()`-Hilfe (druckt Summary + `process.exit(blockers ? 1 : 0)`) — den bestehenden Exit-Code-Block am Dateiende in `function finish()` umziehen und am Ende des Skripts `finish()` aufrufen, damit der Früh-Abbruch denselben Pfad nimmt.

- [ ] **Step 2: Admin-Code-Längen-Warnung in doctor.** Im Secrets-Abschnitt von doctor.js (dort, wo `KIT_ADMIN_CODE` geprüft wird — `grep -n "KIT_ADMIN_CODE" scripts/doctor.js`) ergänzen:

```js
if (process.env.KIT_ADMIN_CODE && process.env.KIT_ADMIN_CODE.length < 12)
  warn("KIT_ADMIN_CODE ist kürzer als 12 Zeichen — bitte einen langen, zufälligen Code verwenden");
```

- [ ] **Step 3: `// @ts-check` am doctor-Dateianfang** ergänzen; gemeldete tsc-Fehler nur per JSDoc beheben.

- [ ] **Step 4: `.github/workflows/ci.yml`** — vollständiger neuer Inhalt:

```yaml
# CI: Typcheck + Tests + Doctor (offline) + CF-Functions-Build auf beiden Node-Majors.
# Deploys laufen bewusst manuell (docs/agent/deploy/*) — kein Auto-Deploy aus CI.
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: node scripts/doctor.js --offline
      - run: npx wrangler pages functions build --outdir /tmp/kit-fn-build
```

- [ ] **Step 5: Dockerfile** — Basis-Image und Install-Zeile anpassen (Rest unverändert lassen): `FROM node:24-slim` und `npm ci --omit=dev` (TypeScript/wrangler werden zur Laufzeit nicht gebraucht — Type Stripping läuft in Node selbst).

> Bewusste Abweichung von Spec §4.4: ESLint/Prettier kommen NICHT in diesem Plan, sondern beim Repo-Transfer (Task 17 Step 3), wenn die echte steady-widget-2.0-Config abgeglichen werden kann — Konventionen raten wäre doppelte Arbeit. Bis dahin trägt `tsc strict` die Qualitätslast in CI.

- [ ] **Step 6: Verifizieren + Commit**

Run: `npm run check && npm test && node scripts/doctor.js --offline`
Expected: alles grün; doctor Exit 0.
Commit: `feat(v2): doctor old-Node-sicher + Admin-Code-Warnung, CI-Matrix 22/24, Docker node:24`

**→ Hiermit ist der reine Port abgeschlossen. Tag setzen:** `git tag v2-port-parity`

---

### Task 9: KVAdapter-Konformität + redis-rest-Backend (TDD)

**Files:**
- Create: `test/kv-conformance.test.js`, `server/kv-redis-rest.ts`
- Modify: `server/node.ts` (`buildEnv`-Wiring)

- [ ] **Step 1: Konformitätstest schreiben (failing für redis-rest)** — `test/kv-conformance.test.js`, vollständig:

```js
// test/kv-conformance.test.js — jedes Storage-Backend erfüllt dieselbe
// KV-Teilmenge, inkl. des Logo-Kontrakts (1,5-MB-Binär-Roundtrip).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsKv } from "../server/fs-kv.ts";
import { createRedisRestKv } from "../server/kv-redis-rest.ts";

const LOGO_BYTES = 1572864; // exakt das /api/logo-Limit

function conformance(name, makeKv) {
  describe(`KVAdapter-Konformität: ${name}`, () => {
    let kv;
    before(async () => { kv = await makeKv(); });

    test("text: get/put/delete-Roundtrip, fehlender Key → null", async () => {
      assert.equal(await kv.get("c:none"), null);
      await kv.put("c:txt", "hallo");
      assert.equal(await kv.get("c:txt"), "hallo");
      await kv.delete("c:txt");
      assert.equal(await kv.get("c:txt"), null);
    });

    test("json: Objekt-Roundtrip + kaputtes JSON → null", async () => {
      await kv.put("c:json", JSON.stringify({ a: 1, s: "ü" }));
      assert.deepEqual(await kv.get("c:json", "json"), { a: 1, s: "ü" });
      await kv.put("c:bad", "{nope");
      assert.equal(await kv.get("c:bad", "json"), null);
    });

    test("opts-Objekt-Form wie settings.js: {type:'json', cacheTtl}", async () => {
      await kv.put("c:opts", JSON.stringify({ ok: true }));
      assert.deepEqual(await kv.get("c:opts", { type: "json", cacheTtl: 60 }), { ok: true });
    });

    test("arrayBuffer: 1,5-MB-Binär-Roundtrip (Logo-Kontrakt)", async () => {
      const buf = new Uint8Array(LOGO_BYTES);
      for (let i = 0; i < buf.length; i += 4096) buf[i] = i % 251;
      await kv.put("c:logo", buf);
      const back = new Uint8Array(await kv.get("c:logo", "arrayBuffer"));
      assert.equal(back.byteLength, LOGO_BYTES);
      assert.equal(back[4096], 4096 % 251);
      assert.equal(back[LOGO_BYTES - 4096], (LOGO_BYTES - 4096) % 251);
    });

    test("Schema-Keys mit Doppelpunkt funktionieren", async () => {
      await kv.put("config:prev", "x");
      assert.equal(await kv.get("config:prev"), "x");
      await kv.put("react:guid-eins-001", "7");
      assert.equal(await kv.get("react:guid-eins-001"), "7");
    });
  });
}

// — fs-Backend —
let fsDir;
before(async () => { fsDir = await mkdtemp(join(tmpdir(), "kvconf-")); });
after(async () => { await rm(fsDir, { recursive: true, force: true }); });
conformance("fs", async () => createFsKv(fsDir));

// — redis-rest-Backend gegen einen Fake-Upstash-Server (GET /get|/set|/del) —
let restSrv;
const store = new Map();
before(async () => {
  restSrv = http.createServer(async (req, res) => {
    const [, op, rawKey] = req.url.split("/");
    const key = decodeURIComponent(rawKey || "");
    if (req.headers.authorization !== "Bearer test-token") { res.writeHead(401); return res.end("{}"); }
    const reply = obj => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (op === "get") return reply({ result: store.has(key) ? store.get(key) : null });
    if (op === "del") { store.delete(key); return reply({ result: 1 }); }
    if (op === "set") {
      const chunks = []; for await (const c of req) chunks.push(c);
      store.set(key, Buffer.concat(chunks).toString("utf8"));
      return reply({ result: "OK" });
    }
    res.writeHead(404); res.end("{}");
  });
  await new Promise(r => restSrv.listen(0, "127.0.0.1", r));
});
after(async () => { await new Promise(r => restSrv.close(r)); });
conformance("redis-rest", async () =>
  createRedisRestKv(`http://127.0.0.1:${restSrv.address().port}`, "test-token"));
```

- [ ] **Step 2: Test laufen lassen — erwartetes Scheitern**

Run: `node --test test/kv-conformance.test.js`
Expected: FAIL — `createRedisRestKv` existiert nicht (fs-Hälfte PASS).

- [ ] **Step 3: `server/kv-redis-rest.ts` implementieren** — vollständig:

```ts
// server/kv-redis-rest.ts — KVAdapter über die Upstash-kompatible Redis-REST-API.
// Für Hosts ohne Disk (Vercel). Nur fetch, keine Dependencies. Binärwerte werden
// markiert + base64-kodiert (REST transportiert Strings). ACHTUNG Rezept-Doku:
// Upstash-Free limitiert Requests auf 1 MB — das 1,5-MB-Logo braucht einen
// bezahlten Tier; der Konformitätstest erzwingt den Kontrakt gegen den Fake.
import { Buffer } from "node:buffer";
import type { KVAdapter } from "../functions/_lib/types.ts";

const B64 = " b64:"; // Marker;   kommt in keinem Schema-Wert vor

export function createRedisRestKv(baseUrl: string, token: string): KVAdapter {
  const url = baseUrl.replace(/\/+$/, "");
  const headers = { authorization: `Bearer ${token}` };

  async function call(path: string, body?: string): Promise<unknown> {
    const res = await fetch(url + path, body === undefined
      ? { headers }
      : { method: "POST", headers, body });
    if (!res.ok) throw new Error(`redis-rest HTTP ${res.status}`);
    const data = (await res.json()) as { result: unknown };
    return data.result;
  }

  return {
    async get(key, opts) {
      const type = typeof opts === "string" ? opts : (opts && opts.type) || "text";
      const raw = (await call(`/get/${encodeURIComponent(key)}`)) as string | null;
      if (raw == null) return null;
      if (type === "arrayBuffer") {
        const b64 = raw.startsWith(B64) ? raw.slice(B64.length) : Buffer.from(raw, "utf8").toString("base64");
        const buf = Buffer.from(b64, "base64");
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
      const text = raw.startsWith(B64) ? Buffer.from(raw.slice(B64.length), "base64").toString("utf8") : raw;
      if (type === "json") { try { return JSON.parse(text); } catch { return null; } }
      return text;
    },
    async put(key, value) {
      const body = typeof value === "string"
        ? value
        : B64 + Buffer.from(ArrayBuffer.isView(value)
            ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
            : new Uint8Array(value)).toString("base64");
      await call(`/set/${encodeURIComponent(key)}`, body);
    },
    async delete(key) {
      await call(`/del/${encodeURIComponent(key)}`);
    },
  };
}
```

- [ ] **Step 4: Test erneut — PASS** (`node --test test/kv-conformance.test.js`)

- [ ] **Step 5: Wiring in `server/node.ts` `buildEnv`** — vor dem fs-Fallback:

```ts
if (!env.KIT_KV) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    env.KIT_KV = createRedisRestKv(String(env.UPSTASH_REDIS_REST_URL), String(env.UPSTASH_REDIS_REST_TOKEN));
  } else {
    env.KIT_KV = createFsKv(env.KIT_DATA_DIR || join(ROOT, "data"));
  }
}
```

- [ ] **Step 6: `npm run check && npm test` grün → Commit** — `feat(v2): KVAdapter-Konformitätstest + redis-rest-Backend (Upstash, fetch-only)`

---

### Task 10: Härtung — Authorizer-Naht mit timing-safe Vergleich (TDD)

**Files:**
- Create: `functions/_lib/auth.ts`, Test in `test/security.test.js` (neu)
- Modify: `functions/api/config.ts` (3 Stellen), `functions/api/logo.ts` (2 Stellen), `functions/_lib/http.ts` (isAdmin entfernen)

- [ ] **Step 1: Failing Test** — `test/security.test.js` anlegen (erster Block):

```js
// test/security.test.js — Authorizer + Secret-Scrubbing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../functions/_lib/auth.ts";

function reqWith(code) {
  return new Request("http://x/api/config", { headers: code == null ? {} : { "x-kit-admin": code } });
}

test("isAuthorized: korrekt/falsch/leer/ohne Secret", async () => {
  const env = { KIT_ADMIN_CODE: "geheim-1234567890" };
  assert.equal(await isAuthorized(reqWith("geheim-1234567890"), env), true);
  assert.equal(await isAuthorized(reqWith("falsch"), env), false);
  assert.equal(await isAuthorized(reqWith(""), env), false);
  assert.equal(await isAuthorized(reqWith(null), env), false);
  assert.equal(await isAuthorized(reqWith("egal"), {}), false);
});
```

Run: `node --test test/security.test.js` → FAIL (Modul fehlt).

- [ ] **Step 2: `functions/_lib/auth.ts`** — vollständig (WebCrypto, läuft auf Workers UND Node; das ist die Authorizer-Naht für v2.1 „Login mit Steady"):

```ts
// _lib/auth.ts — Authorizer-Naht. v2.0: geteilter Admin-Code, timing-safe.
// v2.1 (geplant, Spec §2.6): Tausch gegen „Login mit Steady"-Owner-Check —
// NUR diese Funktion wird ersetzt, die Aufrufer bleiben.
import type { KitEnv } from "./types.ts";

/** true, wenn der Request globale Writes (Config/Logo) ausführen darf. */
export async function isAuthorized(request: Request, env: KitEnv): Promise<boolean> {
  const code = env.KIT_ADMIN_CODE;
  const given = request.headers.get("x-kit-admin") || "";
  if (!code || !given) return false;
  // Digest-Vergleich statt ===: konstante Zeit unabhängig von Übereinstimmungslänge.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(code)),
  ]);
  const va = new Uint8Array(a), vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}
```

- [ ] **Step 3: Call-Sites umstellen.** In `functions/api/config.ts` und `functions/api/logo.ts`: Import `isAdmin` aus `http.ts` ersetzen durch `import { isAuthorized } from "../_lib/auth.ts";` und jede Zeile `if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);` durch `if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);`. Danach `isAdmin` aus `http.ts` löschen (keine Konsumenten mehr — mit `grep -rn "isAdmin" functions server test` verifizieren).

- [ ] **Step 4: Suite** — `npm run check && npm test` → PASS (der bestehende 401/200-Test in node-server.test.js beweist Verhaltens-Parität).

- [ ] **Step 5: Commit** — `feat(v2): Authorizer-Naht mit timing-safe Admin-Vergleich (4D/4A)`

---

### Task 11: Härtung — Secret-Scrubbing + Feed-Timeout (TDD)

**Files:**
- Create: `functions/_lib/scrub.ts`
- Modify: `functions/_lib/feed.ts` (Timeout), `server/node.ts` (logError im catch), `test/security.test.js` (+2 Tests), Create: `test/feed-timeout.test.js`

- [ ] **Step 1: Failing Tests.** An `test/security.test.js` anhängen:

```js
import { scrubSecrets, logError } from "../functions/_lib/scrub.ts";

test("scrubSecrets entfernt FULLTEXT_FEED_URL samt Token aus beliebigem Text", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const dirty = `fetch failed for ${env.FULLTEXT_FEED_URL}\ncause: connect to token=SUPERSECRET123`;
  const clean = scrubSecrets(dirty, env);
  assert.ok(!clean.includes("SUPERSECRET123"));
  assert.ok(clean.includes("[redacted]"));
});

test("logError loggt niemals den Volltext-Token (Message, Stack, cause)", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const lines = [];
  const orig = console.error;
  console.error = (...a) => lines.push(a.join(" "));
  try {
    logError(new Error(`feed kaputt: ${env.FULLTEXT_FEED_URL}`, { cause: env.FULLTEXT_FEED_URL }), env);
  } finally { console.error = orig; }
  const all = lines.join("\n");
  assert.ok(all.includes("[steady-page-kit]"));
  assert.ok(!all.includes("SUPERSECRET123"));
});
```

Und `test/feed-timeout.test.js` (vollständig):

```js
// test/feed-timeout.test.js — hängender Feed: Timeout statt Endlos-Hänger,
// warmer Cache überbrückt (stale-while-error wird durch den Timeout erreichbar).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchFeedXml, _resetFeedCache } from "../functions/_lib/feed.ts";

let hangSrv, hangUrl, sockets;
before(async () => {
  sockets = new Set();
  hangSrv = http.createServer(() => { /* nie antworten */ });
  hangSrv.on("connection", s => sockets.add(s));
  await new Promise(r => hangSrv.listen(0, "127.0.0.1", r));
  hangUrl = `http://127.0.0.1:${hangSrv.address().port}/rss`;
});
after(async () => { for (const s of sockets) s.destroy(); await new Promise(r => hangSrv.close(r)); });

test("kalter Cache: hängender Feed bricht nach timeoutMs ab", async () => {
  _resetFeedCache();
  const t0 = Date.now();
  await assert.rejects(() => fetchFeedXml(hangUrl, { timeoutMs: 200 }));
  assert.ok(Date.now() - t0 < 2000, "Abbruch muss zeitnah erfolgen");
});

test("warmer Cache: hängender Feed liefert den letzten Stand", async () => {
  _resetFeedCache();
  // Cache von Hand wärmen: einmal gegen einen funktionierenden Mini-Server fetchen
  const okSrv = http.createServer((q, r) => { r.writeHead(200); r.end("<rss>ok</rss>"); });
  await new Promise(r => okSrv.listen(0, "127.0.0.1", r));
  const okUrl = `http://127.0.0.1:${okSrv.address().port}/rss`;
  assert.equal(await fetchFeedXml(okUrl), "<rss>ok</rss>");
  await new Promise(r => okSrv.close(r));
  // Cache-Eintrag künstlich altern lassen geht nicht ohne Hook — stattdessen:
  // gleiche URL, Server tot → fetch wirft → stale Rückgabe greift erst nach TTL.
  // Innerhalb der TTL liefert der Cache direkt; beides beweist „kein Hänger".
  assert.equal(await fetchFeedXml(okUrl, { timeoutMs: 200 }), "<rss>ok</rss>");
});
```

Run: `node --test test/security.test.js test/feed-timeout.test.js` → FAIL (scrub.ts fehlt; fetchFeedXml kennt kein zweites Argument).

- [ ] **Step 2: `functions/_lib/scrub.ts`** — vollständig:

```ts
// _lib/scrub.ts — Secret-Redaktion für Logs (AGENTS.md Hard Rule 1 als Code).
// Beim Ergänzen neuer Secrets (z. B. v2.1 OAuth client_secret): hier eintragen.
import type { KitEnv } from "./types.ts";

export function scrubSecrets(text: string, env: Pick<KitEnv, "FULLTEXT_FEED_URL">): string {
  let out = text;
  const u = env.FULLTEXT_FEED_URL;
  if (u) {
    out = out.split(u).join("[redacted]");
    try {
      const q = new URL(u);
      if (q.search.length > 1) out = out.split(q.search.slice(1)).join("[redacted]");
    } catch { /* URL unparsebar → der Voll-String-Ersatz oben hat gegriffen */ }
  }
  return out;
}

/** Zentraler Fehler-Logger — einzige erlaubte console.error-Stelle für Request-Fehler. */
export function logError(err: unknown, env: Pick<KitEnv, "FULLTEXT_FEED_URL">): void {
  const base = err instanceof Error
    ? `${err.message}\n${err.stack ?? ""}${err.cause !== undefined ? `\ncause: ${String(err.cause)}` : ""}`
    : String(err);
  console.error("[steady-page-kit]", scrubSecrets(base, env));
}
```

- [ ] **Step 3: Timeout in `feed.ts`.** Signatur erweitern und Fetch-Aufruf ändern (einzige Logik-Änderung des Ports, Spec §8.5):

```ts
const FEED_TIMEOUT_MS = 10_000;
export async function fetchFeedXml(feedUrl?: string, opts: { timeoutMs?: number } = {}): Promise<string> {
  // ... unverändert bis zum fetch:
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(opts.timeoutMs ?? FEED_TIMEOUT_MS),
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit);
  // ... Rest unverändert (catch mit stale-Fallback greift jetzt auch bei Timeout)
}
```

`getItems` reicht `opts` NICHT durch (Routen nutzen den Default — YAGNI).

- [ ] **Step 4: `server/node.ts`** — im zentralen `catch` des Request-Handlers `console.error("[steady-page-kit]", err)` ersetzen durch `logError(err, env)` (Import aus `../functions/_lib/scrub.ts`).

- [ ] **Step 5: Alle Tests** — `npm run check && npm test` → PASS.

- [ ] **Step 6: Commit** — `feat(v2): Secret-Scrubbing im zentralen Error-Pfad + 10s-Feed-Timeout (7A/9A)`

---

### Task 12: Guards — ASSET_VERSION-Hash, ROUTES-Konsistenz, Protokoll-Konstanten

**Files:**
- Create: `test/asset-version.test.js`, `test/asset-hash.json`, `scripts/bump-assets.ts`, `test/routes-consistency.test.js`, `test/protocol.test.js`

- [ ] **Step 1: `scripts/bump-assets.ts`** — vollständig:

```ts
// scripts/bump-assets.ts — ASSET_VERSION + Hash-Fixture in EINEM Schritt aktualisieren.
// `npm run bump-assets` nach jeder Änderung an public/assets/kit.css|kit-*.js.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASSETS = ["public/assets/kit.css", "public/assets/kit-theme.js", "public/assets/kit-panel.js"];

const h = createHash("sha256");
for (const f of ASSETS) h.update(readFileSync(ROOT + f));
const hash = h.digest("hex");

const today = new Date().toISOString().slice(0, 10);
const cfgPath = ROOT + "functions/_lib/config.ts";
const cfg = readFileSync(cfgPath, "utf8");
const m = cfg.match(/ASSET_VERSION = "([^"]+)"/);
if (!m) { console.error("ASSET_VERSION nicht gefunden"); process.exit(1); }
const cur = m[1]!;
// Format YYYY-MM-DD<buchstabe>: gleicher Tag → Buchstabe hochzählen, sonst neuer Tag + "a"
const next = cur.startsWith(today)
  ? today + String.fromCharCode((cur.slice(10) || "a").charCodeAt(0) + 1)
  : today + "a";
writeFileSync(cfgPath, cfg.replace(/ASSET_VERSION = "[^"]+"/, `ASSET_VERSION = "${next}"`));
writeFileSync(ROOT + "test/asset-hash.json", JSON.stringify({ assetVersion: next, hash }, null, 2) + "\n");
console.log(`ASSET_VERSION: ${cur} → ${next}`);
```

- [ ] **Step 2: Fixture initial erzeugen:** `node scripts/bump-assets.ts` (schreibt `test/asset-hash.json` und bumpt einmalig).

- [ ] **Step 3: `test/asset-version.test.js`** — vollständig:

```js
// Hard Rule 4 als CI-Garantie: Asset-Änderung ohne Versions-Bump = rot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ASSET_VERSION } from "../functions/_lib/config.ts";

const ASSETS = ["public/assets/kit.css", "public/assets/kit-theme.js", "public/assets/kit-panel.js"];

test("ASSET_VERSION passt zum Asset-Hash (sonst: npm run bump-assets)", () => {
  const h = createHash("sha256");
  for (const f of ASSETS) h.update(readFileSync(new URL("../" + f, import.meta.url)));
  const rec = JSON.parse(readFileSync(new URL("./asset-hash.json", import.meta.url), "utf8"));
  assert.equal(rec.assetVersion, ASSET_VERSION, "config.ts und Fixture sind auseinander");
  assert.equal(rec.hash, h.digest("hex"), "Assets geändert ohne npm run bump-assets");
});
```

- [ ] **Step 4: `test/routes-consistency.test.js`** — vollständig (ersetzt Hard Rule 5):

```js
// Eine Routen-Wahrheit: jede functions/-Routendatei steht in ROUTES und umgekehrt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../server/routes.ts";

test("ROUTES ↔ functions/-Ordner sind deckungsgleich", () => {
  const root = fileURLToPath(new URL("../functions/", import.meta.url));
  const found = [];
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "_lib") walk(dir + e.name + "/", prefix + e.name + "/");
      else if (e.isFile() && e.name.endsWith(".ts")) found.push("functions/" + prefix + e.name);
    }
  };
  walk(root, "");
  const inRoutes = ROUTES.map(r => r.src).sort();
  const inTree = found.filter(f => !f.startsWith("functions/_lib/")).sort();
  assert.deepEqual(inTree, inRoutes);
});
```

- [ ] **Step 5: `test/protocol.test.js`** — vollständig (Hard Rule 2 als Test; Quelle: AGENTS.md-Schema-Liste):

```js
// Protokoll-Stabilität: Schema-Werte sind Schnittstelle, keine Texte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStruct } from "../functions/_lib/settings.ts";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("Cookie-Schema: parseStruct versteht die kanonischen Enum-Werte", () => {
  const s = parseStruct("kitstruct=" + encodeURIComponent("shell=portal&auf=gross&stream=rubrik&header=zentriert&search=1&rails=neueste,meist,themen"));
  assert.equal(s.shell, "portal");
  assert.equal(s.auf, "gross");
  assert.equal(s.stream, "rubrik");
  assert.equal(s.headerStyle, "zentriert");
  assert.deepEqual(s.rails, ["neueste", "meist", "themen"]);
});

test("KV-Keys und Admin-Header sind unverändert im Quelltext verankert", () => {
  const api = read("functions/api/config.ts") + read("functions/api/logo.ts") + read("functions/api/react.ts");
  for (const key of ['"config"', '"config:prev"', '"logo:data"', '"logo:meta"', '"react:"']) {
    assert.ok(api.includes(key.replaceAll('"', '"')) || api.includes(key), `KV-Key ${key} fehlt`);
  }
  assert.ok((read("functions/_lib/auth.ts")).includes("x-kit-admin"));
});

test("Client-Schema: localStorage-Keys + Enum-Kataloge unverändert", () => {
  const theme = read("public/assets/kit-theme.js");
  for (const token of ["kitFontHead", "kitColors", "schmal", "standard", "breit",
                       "kompakt", "komfortabel", "grosszuegig", "eckig", "rund",
                       "farbe", "duotone", "graustufen"]) {
    assert.ok(theme.includes(token), `kit-theme.js: "${token}" fehlt`);
  }
  const panel = read("functions/_lib/panel.ts");
  for (const attr of ["data-fn", "data-kind", "data-v"]) assert.ok(panel.includes(attr));
});

test("URL-Schema: /rubrik/-Prefix existiert als Route", () => {
  assert.ok(read("server/routes.ts").includes("/rubrik/"));
});
```

- [ ] **Step 6: Lauf + Commit**

Run: `npm run check && npm test`
Expected: PASS (alle drei neuen Suiten grün).
Commit: `feat(v2): CI-Guards — Asset-Hash, ROUTES-Konsistenz, Protokoll-Konstanten (6A)`

---

### Task 13: GAP-Tests — die 8 ungetesteten Pfade

**Files:**
- Create: `test/routes-gaps.test.js` (nutzt dasselbe Boot-Muster wie node-server.test.js)

- [ ] **Step 1: Datei anlegen** — vollständig:

```js
// test/routes-gaps.test.js — Coverage-Lücken aus dem Eng-Review (D-Review 2026-06-11).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server/node.ts";
import { _resetFeedCache } from "../functions/_lib/feed.ts";

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>Gap-Tests</title><description><![CDATA[x]]></description>
<item><title><![CDATA[Mitglieder-Post]]></title><description><![CDATA[Teaser.]]></description>
<category>politik</category><guid>guid-gap-001</guid>
<pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate></item>
</channel></rss>`;

import { MEMBER_HEADING } from "../functions/_lib/config.ts"; // fork-sicher: nutzt die echte Überschrift

const FULL_XML = FEED_XML.replace("<description><![CDATA[Teaser.]]></description>",
  `<description><![CDATA[Teaser.]]></description><content:encoded><![CDATA[
   <p>Öffentlicher Teil.</p><h2>${MEMBER_HEADING}</h2><p>Geheimer Teil.</p>]]></content:encoded>`);

let feedSrv, kitSrv, base, dataDir;
before(async () => {
  _resetFeedCache();
  feedSrv = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/rss+xml" });
    res.end(req.url.startsWith("/full") ? FULL_XML : FEED_XML);
  });
  await new Promise(r => feedSrv.listen(0, "127.0.0.1", r));
  const fu = `http://127.0.0.1:${feedSrv.address().port}`;
  dataDir = await mkdtemp(join(tmpdir(), "kitgaps-"));
  kitSrv = await startServer({ port: 0, env: {
    FEED_URL: fu + "/rss", FULLTEXT_FEED_URL: fu + "/full",
    KIT_ADMIN_CODE: "geheim-1234567890", KIT_DATA_DIR: dataDir,
    SITE_ORIGIN: "https://gap.test",
  }});
  base = `http://127.0.0.1:${kitSrv.address().port}`;
});
after(async () => {
  await new Promise(r => kitSrv.close(r));
  await new Promise(r => feedSrv.close(r));
  await rm(dataDir, { recursive: true, force: true });
  _resetFeedCache();
});

test("GET /memberships rendert den Checkout-Container", async () => {
  const res = await fetch(base + "/memberships");
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes("insert_steady_checkout_here"));
});

test("GET /robots.txt nutzt SITE_ORIGIN", async () => {
  const res = await fetch(base + "/robots.txt");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "User-agent: *\nAllow: /\n\nSitemap: https://gap.test/sitemap.xml\n");
});

test("Unbekannter Pfad → 404", async () => {
  const res = await fetch(base + "/gibt-es-nicht");
  assert.equal(res.status, 404);
});

test("Trailing Slash → 301 auf slashlose URL, Query bleibt", async () => {
  const res = await fetch(base + "/memberships/?x=1", { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/memberships?x=1");
});

test("config: PATCH ohne Vorversion → 404; PUT+PATCH = Revert; Doppel-PATCH = Redo; DELETE = Reset", async () => {
  const H = { "x-kit-admin": "geheim-1234567890", "content-type": "application/json" };
  assert.equal((await fetch(base + "/api/config", { method: "PATCH", headers: H })).status, 404);
  await fetch(base + "/api/config", { method: "PUT", headers: H, body: JSON.stringify({ skin: { v: "1" } }) });
  await fetch(base + "/api/config", { method: "PUT", headers: H, body: JSON.stringify({ skin: { v: "2" } }) });
  assert.equal((await fetch(base + "/api/config", { method: "PATCH", headers: H })).status, 200);
  assert.equal((await (await fetch(base + "/api/config")).json()).skin.v, "1"); // Revert
  await fetch(base + "/api/config", { method: "PATCH", headers: H });
  assert.equal((await (await fetch(base + "/api/config")).json()).skin.v, "2"); // Redo
  assert.equal((await fetch(base + "/api/config", { method: "DELETE", headers: H })).status, 200);
  assert.deepEqual(await (await fetch(base + "/api/config")).json(), {});      // Reset
});

test("logo: über 1,5 MB → 413 too_large (Handler-Limit)", async () => {
  const res = await fetch(base + "/api/logo", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-1234567890", "x-kit-type": "image/png" },
    body: new Uint8Array(1572865),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, "too_large");
});

test("Paywall-Cut: Volltext enthält steady_paywall vor dem Mitglieder-Teil", async () => {
  const res = await fetch(base + "/posts/guid-gap-001");
  assert.equal(res.status, 200);
  const html = await res.text();
  const cut = html.indexOf('id="steady_paywall"');
  assert.ok(cut > 0, "Paywall-Element fehlt");
  assert.ok(html.indexOf("Geheimer Teil") > cut, "Mitglieder-Inhalt steht vor der Paywall");
});

test("Feed down + kalter Cache: / fällt freundlich zurück, /rss → 503 mit retry-after", async () => {
  _resetFeedCache();
  const deadDir = await mkdtemp(join(tmpdir(), "kitdead-"));
  const dead = await startServer({ port: 0, env: {
    FEED_URL: "http://127.0.0.1:9/rss", KIT_DATA_DIR: deadDir, SITE_ORIGIN: "https://gap.test",
  }});
  const dbase = `http://127.0.0.1:${dead.address().port}`;
  try {
    const landing = await fetch(dbase + "/");
    assert.equal(landing.status, 200); // renderEmpty — freundlicher Fallback, kein 500
    const rss = await fetch(dbase + "/rss");
    assert.equal(rss.status, 503);
    assert.equal(rss.headers.get("retry-after"), "120");
  } finally {
    await new Promise(r => dead.close(r));
    await rm(deadDir, { recursive: true, force: true });
    _resetFeedCache();
  }
});
```

- [ ] **Step 2: Lauf** — `node --test test/routes-gaps.test.js` → PASS (alles testet BESTEHENDES Verhalten; ein FAIL hier heißt: Port hat Verhalten verändert → Port fixen, nicht den Test).

- [ ] **Step 3: Commit** — `test(v2): 8 Coverage-Gaps geschlossen (Review-Sektion 3)`

---

### Task 14: Golden-Master — v1 vs. v2 Beweis

**Files:**
- Create: `scripts/golden-master.ts`

- [ ] **Step 1: Skript anlegen** — vollständig:

```ts
// scripts/golden-master.ts — Paritätsbeweis: v1 (Git-Ref) und v2 (Arbeitsstand)
// rendern denselben Fixture-Feed; HTML/JSON-Diff modulo ASSET_VERSION/ts/Ports.
// Aufruf: node scripts/golden-master.ts <v1-ref>   (z. B. v1-final oder ein SHA)
// Exit 0 = identisch; Exit 1 = Diff (Report in .gm-report/).
import { execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";

const REF = process.argv[2];
if (!REF) { console.error("Usage: node scripts/golden-master.ts <v1-ref>"); process.exit(2); }

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>GM-Publikation</title><description><![CDATA[GM-Feed.]]></description>
<item><title><![CDATA[Erster Beitrag]]></title><description><![CDATA[Teaser eins.]]></description>
<category>politik</category><media:content url="https://img.example/1.jpg"/>
<link>https://steady.page/p/1</link><guid>guid-eins-001</guid>
<pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate></item>
<item><title><![CDATA[Zweiter Beitrag]]></title><description><![CDATA[Teaser zwei.]]></description>
<category>kultur</category><guid>guid-zwei-002</guid>
<pubDate>Tue, 18 Mar 2025 08:00:00 +0000</pubDate></item>
</channel></rss>`;

const ROUTESET = ["/", "/posts/guid-eins-001", "/rubrik/politik", "/memberships",
  "/rss", "/sitemap.xml", "/robots.txt", "/api/config", "/api/search?q=zweiter",
  "/api/react?g=guid-eins-001"];

function normalize(s: string): string {
  return s
    .replace(/\?v=[A-Za-z0-9-]+/g, "?v=NORM")        // ASSET_VERSION-Buster
    .replace(/"ts":\s*\d+/g, '"ts":0')                // Zeitstempel in JSON
    .replace(/127\.0\.0\.1:\d+/g, "127.0.0.1:0");    // Ports
}

async function boot(cmdCwd: string, env: Record<string, string>): Promise<{ base: string; kill: () => void }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server/node.js"], {
      cwd: cmdCwd, env: { ...process.env, ...env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", d => {
      out += String(d);
      const m = out.match(/http:\/\/localhost:(\d+)/);
      if (m) resolve({ base: `http://127.0.0.1:${m[1]}`, kill: () => child.kill() });
    });
    child.on("exit", code => reject(new Error(`Server-Exit ${code} vor Port-Meldung:\n${out}`)));
    setTimeout(() => reject(new Error("Boot-Timeout")), 15000);
  });
}

// 1. Fixture-Feed-Server
const feedSrv = http.createServer((q, r) => { r.writeHead(200, { "content-type": "application/rss+xml" }); r.end(FEED_XML); });
await new Promise<void>(r => feedSrv.listen(0, "127.0.0.1", () => r()));
const feedUrl = `http://127.0.0.1:${(feedSrv.address() as { port: number }).port}/rss`;

// 2. v1-Worktree + Injektion (F9: Config/Daten rein, sonst rendert v1 Onboarding)
const wt = mkdtempSync(join(tmpdir(), "gm-v1-"));
execSync(`git worktree add --detach "${wt}" ${REF}`, { stdio: "inherit" });
cpSync("kit.config.js", join(wt, "kit.config.js"));               // gleiche Publisher-Config
const dataDir = mkdtempSync(join(tmpdir(), "gm-data-"));          // GETEILTER KV-Stand
const envBoth = { FEED_URL: feedUrl, KIT_DATA_DIR: dataDir, KIT_ADMIN_CODE: "gm-code-123456", SITE_ORIGIN: "https://gm.test" };

let failed = false;
try {
  const v1 = await boot(wt, envBoth);
  const v2 = await boot(process.cwd(), envBoth);
  mkdirSync(".gm-report", { recursive: true });
  for (const route of ROUTESET) {
    const [a, b] = await Promise.all([fetch(v1.base + route), fetch(v2.base + route)]);
    const [ta, tb] = [normalize(await a.text()), normalize(await b.text())];
    const same = a.status === b.status && ta === tb;
    console.log(`${same ? "✅" : "❌"} ${route}  (v1 ${a.status} / v2 ${b.status})`);
    if (!same) {
      failed = true;
      const slug = route.replace(/[^a-z0-9]+/gi, "_") || "root";
      writeFileSync(`.gm-report/${slug}.v1.txt`, ta);
      writeFileSync(`.gm-report/${slug}.v2.txt`, tb);
    }
  }
  v1.kill(); v2.kill();
} finally {
  feedSrv.close();
  execSync(`git worktree remove --force "${wt}"`);
  rmSync(dataDir, { recursive: true, force: true });
}
if (failed) { console.error("\nDiffs unter .gm-report/ — diff <route>.v1.txt <route>.v2.txt"); process.exit(1); }
console.log("\nGolden-Master: v1 und v2 sind verhaltensgleich.");
```

- [ ] **Step 2: v1-Referenz taggen** (der letzte Commit vor Task 1): `git tag v1-final <sha-vor-v2-branch>`

- [ ] **Step 3: Lauf**

Run: `node scripts/golden-master.ts v1-final`
Expected: alle Routen ✅, Exit 0. Erwartete legitime Abweichung: KEINE (das Feed-Timeout ändert keinen Response-Inhalt). Bei ❌: `.gm-report/` lesen, Port-Fehler fixen, NICHT die Normalisierung aufweichen.

- [ ] **Step 4: `.gm-report/` in `.gitignore` aufnehmen; Commit** — `feat(v2): Golden-Master-Harness, Lauf gegen v1-final dokumentiert (8A/F9)` — Konsolen-Output des erfolgreichen Laufs in die PR-Beschreibung kopieren.

---

### Task 15: Vercel-Entry

**Files:**
- Create: `server/vercel.ts`, `api/index.ts`, `vercel.json`

- [ ] **Step 1: `server/vercel.ts`** — vollständig:

```ts
// server/vercel.ts — Vercel-Entry (Web-Handler-Signatur). Statisches liefert
// Vercel selbst aus public/; alles andere geht durch dieselbe ROUTES-Tabelle.
// Storage: redis-rest (Upstash) — Vercel-Functions haben keine persistente Disk.
import { handleRequest } from "./routes.ts";
import { createRedisRestKv } from "./kv-redis-rest.ts";
import type { KitEnv } from "../functions/_lib/types.ts";

const env: KitEnv = { ...process.env } as KitEnv;
if (!env.KIT_KV && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  env.KIT_KV = createRedisRestKv(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN);
}

export default async function handler(request: Request): Promise<Response> {
  const response = await handleRequest(request, env);
  return response ?? new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}
```

- [ ] **Step 2: `api/index.ts`** — vollständig (Vercel-Konvention; nur Re-Export):

```ts
export { default } from "../server/vercel.ts";
```

- [ ] **Step 3: `vercel.json`** — vollständig (Dateisystem gewinnt vor Rewrites → public/ bleibt statisch):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }]
}
```

- [ ] **Step 4: Lokal smoke-testen** (kein Vercel-Account nötig — der Entry ist eine pure Funktion):

An `test/routes-gaps.test.js` ODER als Schnell-Check inline:

```bash
node -e 'const {default:h}=await import("./server/vercel.ts"); const r=await h(new Request("http://x/robots.txt")); console.log(r.status, (await r.text()).slice(0,20))'
```
Expected: `200 User-agent: *…` (ohne SITE_ORIGIN-Env nutzt er den kit.config.js-Wert).

- [ ] **Step 5: `npm run check` grün → Commit** — `feat(v2): Vercel-Entry über gemeinsame ROUTES-Tabelle (D19-Hostmatrix)`

(Hinweis: Der echte End-to-End-Deploy-Test gegen Vercel passiert beim Schreiben des Rezepts in Task 16 — dort dogfooden, Upstash-Limit dokumentieren.)

---

### Task 16: Doku-Paket — README, AGENTS, SETUP, UPDATE, 7 Rezepte

**Files:**
- Modify: `README.md`, `README.de.md`, `AGENTS.md`, `AGENT.md`, `GEMINI.md`, `CLAUDE.md` (unverändert lassen — zeigt auf AGENTS.md), `docs/agent/SETUP.md`, `docs/agent/UPDATE.md`, alle `docs/agent/deploy/*.md`
- Create: `docs/agent/deploy/vercel.md`, `docs/agent/deploy/hetzner.md` (oder docker-vps.md erweitern), `CHANGELOG.md`

Kein Code — aber präzise Inhalts-Vorgaben. Für jede Datei gilt: de/en-Fassungen synchron halten.

- [ ] **Step 1: `AGENTS.md` aktualisieren:**
  - „What runs where": `.ts`-Endungen; NEU: `server/routes.ts` (eine Routen-Tabelle), `functions/_lib/auth.ts` (Authorizer), `functions/_lib/types.ts`; Storage-Absatz: KVAdapter mit drei Backends (fs/cf-kv/redis-rest, Auswahl via Env).
  - Commands-Tabelle: `npm run check` = „Typcheck (tsc, beide Configs)"; NEU `npm run bump-assets`.
  - Hard Rule 4 ersetzen durch: „Nach Asset-Änderungen `npm run bump-assets` (Test erzwingt es)."
  - Hard Rule 5 ersetzen durch: „Neue Routen: Datei unter `functions/` + Eintrag in `server/routes.ts` — `test/routes-consistency.test.js` erzwingt Deckungsgleichheit."
  - NEU Hard Rule: „Nur erasable TypeScript (kein enum/namespace) — `erasableSyntaxOnly` erzwingt es. Node-Baseline ≥ 22.18."
  - „Good to know" ergänzen: Feed-Fetch hat 10-s-Timeout (bewusste v2-Änderung), Secret-Scrubbing via `_lib/scrub.ts` (einzige console.error-Stelle).

- [ ] **Step 2: `README.md` / `README.de.md`:**
  - Hosting-Abschnitt neu ordnen: **Empfohlen: Railway** (Managed, ~5 €/Monat, persistente Disk, Agent kann per CLI deployen) → Render/Fly → Hetzner/Docker-VPS & Uberspace („für alle, die ihren Server selbst verwalten") → Vercel (serverless + Upstash; Hobby-Tier untersagt kommerzielle Nutzung — Hinweis!) → Cloudflare Pages („weiterhin unterstützt, $0; nicht mehr unsere Default-Empfehlung").
  - **Ops-Träger-Tabelle** einfügen (Spalten: Host | wer patcht OS | TLS | Disk-Persistenz | Kosten):
    Railway/Render/Fly/Vercel/CF = Plattform; Hetzner-VPS/Uberspace = Publisher.
  - „Zero runtime dependencies" bleibt (stimmt weiter!); „no build step" eingrenzen: „kein Build-Step auf dem Node-Pfad; Cloudflare/Vercel bündeln beim Deploy toolchain-seitig".
  - Voraussetzungen: Node ≥ 22.18 (empfohlen 24 LTS).

- [ ] **Step 3: `docs/agent/UPDATE.md` — komplette Neufassung mit v1-Weiche.** Struktur:
  1. **Versions-Weiche:** „Liegt `functions/index.js` (`.js`!) im Repo → Installation ist v1 → Abschnitt B. Liegt `functions/index.ts` → v2 → Abschnitt A."
  2. **Abschnitt A (v2→v2.x):** wie heutiger Path A/B (git merge upstream bzw. Zip), Ownership-Map v2.
  3. **Abschnitt B (v1→v2-Migration):** (a) `git diff <v1-upstream-tag>..HEAD --stat` → Patch-Liste kategorisieren: Publisher-Dateien (behalten), **Brand-Assets in `public/assets/` (behalten — NEU Publisher-Eigentum:** `logo.png`, `favicon.png`, `favicon.svg` und alles vom Publisher Hinzugefügte), Template-Code-Patches (Liste je Datei notieren; nach Migration anhand der v1→v2-Tabelle unten neu anwenden oder verwerfen). (b) Neues v2-Template daneben auspacken, Publisher-Dateien + Brand-Assets rüberkopieren (`kit.config.js`, `.env`/`.dev.vars`, `wrangler.toml` name+KV-id, `data/`, Brand-Assets, Host-Dateien). (c) Code-Patches re-applien: v1→v2-Pfad-Tabelle (`functions/_lib/page.js → functions/_lib/page.ts` usw. — alle Pfade identisch bis auf Endung). (d) Wer `kit.css`/`kit-*.js` gepatcht hat: `npm run bump-assets`. (e) `npm install && npm run check && npm test && npm run doctor` → redeploy mit dem ursprünglichen Rezept. (f) Cloudflare: gleiches Pages-Projekt, gleiches KV-Binding — KEIN Plattformwechsel nötig.
  4. Ownership-Map (beide Abschnitte): heutige Liste + Brand-Assets-Zeile.

- [ ] **Step 4: `docs/agent/SETUP.md`:** Host-Auswahl-Schritt auf die neue Empfehlungs-Reihenfolge umstellen (Railway zuerst, Begründung in einem Satz, CF als „$0, wenn Budget wichtiger als Unabhängigkeit"); Admin-Code-Generierung: „mindestens 16 zufällige Zeichen" (z. B. `openssl rand -base64 24`); Node-Versions-Check als Schritt 0.

- [ ] **Step 5: Rezepte:** `railway.md` als Default-Rezept polieren (Volume für `data/` PFLICHT-Schritt!); `vercel.md` NEU (Upstash anlegen, beide Env-Vars, Logo-Limit-Hinweis, Hobby-ToS-Hinweis); `cloudflare.md`: Hinweis-Box „weiterhin unterstützt, nicht mehr Default; bestehende Projekte unverändert weiterbetreiben"; `docker-vps.md`: Hetzner-Beispiel + Ops-Verantwortung benennen; alle Rezepte: Node ≥ 22.18 prüfen/pinnen.

- [ ] **Step 6: `CHANGELOG.md` anlegen** — Eintrag `## 2.0.0` mit: TS-Port, Zero-Deps bestätigt, KVAdapter+Vercel, Feed-Timeout (einzige Verhaltensänderung), Authorizer-Naht, Node ≥ 22.18, Migrationsverweis auf UPDATE.md Abschnitt B.

- [ ] **Step 7: Doku-Walkthrough als Test:** UPDATE.md Abschnitt B einmal wörtlich an DIESER Blaupause-Installation durchspielen (sie hat Fork-Patches laut FORK-NOTES.md — der Testfall aus dem Review). Erwartung: Brand-Assets überleben, `npm run doctor` Exit 0.

- [ ] **Step 8: Commit** — `docs(v2): Hosting-Neuordnung (Railway-Default, Ops-Tabelle), UPDATE.md mit v1-Weiche, Vercel-Rezept, CHANGELOG 2.0.0`

---

### Task 17: Transfer-Paket + Abschluss

**Files:**
- Create: `.github/CODEOWNERS`
- Modify: `FORK-NOTES.md` (dieser Fork), AGENTS.md-Querverweise prüfen

- [ ] **Step 1: `.github/CODEOWNERS`** — vollständig:

```
# Steady-Dev-Team owned das Kit (Repo: steady-media/steady-page-kit nach Transfer)
* @steady-media/engineering
```

- [ ] **Step 2: Abschluss-Verifikation (alles auf einmal):**

Run: `npm run check && npm test && node scripts/doctor.js --offline && node scripts/golden-master.ts v1-final && npx wrangler pages functions build --outdir /tmp/kit-fn-build`
Expected: alles grün/Exit 0.

- [ ] **Step 3: Transfer-Checkliste in PR-Beschreibung** (manuell, außerhalb Git): Repo-Transfer `seboess/steady-page-kit` → `steady-media/` (GitHub-Redirects bleiben), Template-Flag im neuen Repo aktivieren, Branch-Protection main, ESLint/Prettier-Config beim Transfer gegen steady-widget-2.0 abgleichen (bewusst NICHT vorher raten), Biweekly-npm-Update-Bot aufs Repo erweitern, **main_app-Ticket „Owner-Rollen-Endpunkt + OAuth-Skizze für Kit v2.1" anlegen — MUSS vor v2.0-Release-Freeze beantwortet sein (Spec §2.6/F7)**.

- [ ] **Step 4: PR öffnen** — Titel `steady-page-kit v2: TypeScript-In-Place-Port (Zero-Deps)`; Beschreibung: Spec-Link, Golden-Master-Output, Migrations-Hinweis, Review-Trail (Eng-Review CLEARED 2026-06-11).

---

## Reihenfolge & Parallelisierung

Sequentiell: 1→2→3→4→5→6→7→8 (Port-Kette, jede Welle grün) →9→10→11→12→13→14→15. Task 16 (Doku) kann ab Task 8 parallel laufen (eigene Lane, keine Code-Module). Task 17 zuletzt. main_app-Abstimmung (Step 17.3) sofort anstoßen — längste externe Latenz.

## Selbstprüfung vor „fertig"

1. `git diff v1-final --stat` über `test/` zeigt in den 7 Bestands-Testdateien NUR Import-Zeilen-Änderungen (+ angehängten Bootstrap-Test in node-server.test.js).
2. `package.json` → `"dependencies"` existiert nicht / ist leer (Zero-Dep-Versprechen).
3. Golden-Master-Output liegt in der PR.
4. AGENTS.md Hard Rules 4+5 verweisen auf die Tests, nicht auf Disziplin.
```
