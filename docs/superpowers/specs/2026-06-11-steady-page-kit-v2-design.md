# steady-page-kit v2 — Design-Spec (TypeScript-In-Place-Port)

Stand: 2026-06-11 · Status: Eng-Review CLEARED (16 Findings + 10 Outside-Voice, 0 offen)
Entstanden aus: Brainstorming → /plan-eng-review (inkl. Outside-Voice-Challenge).

## 1. Ziel

Das Steady-Dev-Team übernimmt Ownership und Maintenance des Kits. Dafür wird die
Codebasis (~3.900 LOC JS) auf **TypeScript** gehoben — als **Paritäts-Port ohne
Build-Step, ohne Framework, im unveränderten Dateibaum**. Publisher (häufig
Nicht-Techniker, Setup per KI-Agent) dürfen keine Nachteile erleben; jede
Abweichung vom heutigen Verhalten ist einzeln benannt und begründet.

**Nicht das Ziel:** Features, Redesign, Phoenix/Elixir (Cloudflare-inkompatibel,
Toolchain-Hürden, eigenes Betriebsmodell — im Brainstorming verworfen), Hosted-
Service im main_app (anderes Produkt).

## 2. Kernentscheidungen

| # | Entscheidung | Begründung (Kurzform) |
|---|---|---|
| 1 | **Erasable TypeScript, kein Build-Step** auf dem Node-Pfad (Type Stripping: default ab Node 22.18, stable seit 24.12; TS ≥ 5.8, `erasableSyntaxOnly`) | Kern-Eigenschaft „Quellcode läuft direkt" bleibt; Workers/Vercel bundeln toolchain-seitig — der No-Build-Claim gilt dokumentiert nur für Node |
| 2 | **Zero Runtime-Dependencies bleibt** — kein Hono. Der erprobte v1-Adapter ([server/node.js](../../../server/node.js), 230 LOC) wird typisiert portiert; die `ROUTES`-Tabelle bleibt Single Source of Truth. Entries je Plattform sind dünn: Node (`server/node.ts`), CF Pages (Ordner-Routing wie heute, Handler-Signaturen unverändert), Vercel (eine Catch-all-Function, ~30 LOC, um dieselbe `ROUTES`-Tabelle) | Der Adapter IST bereits die Kompat-Schicht (HEAD→GET, 405+Allow, 413-JSON, Slash-301, waitUntil-Noop); ein Framework würde eingebaut und dann neutralisiert. Outside-Voice F2, übernommen |
| 3 | **Dateibaum bleibt identisch**: `functions/`, `server/`, `scripts/`, `test/` — nur `.js → .ts`. Browser-Assets (`kit-theme.js`, `kit-panel.js`) bleiben JS mit JSDoc + `checkJS`; `kit.config.js` bleibt plain JS (Publisher-Datei, bekommt JSDoc-Typ) | Minimal-Diff, Fork-Patches treffen weiter dieselben Pfade, Tests bleiben lauffähig, Browser strippt keine Typen |
| 4 | **Hosting: Node-first, kein Cloudflare-Default mehr** (Produktentscheidung Owner). Default-Empfehlung: Managed-PaaS mit Disk (Railway als ausgearbeitetes Beispiel); Hetzner/VPS/Uberspace für Techniker; Vercel neu; **CF-Adapter bleibt, demotet, Pages-in-place** | Bewusst eingepreist: empfohlener Pfad kostet ~5 €/Monat; CF bleibt einziger $0-Pfad, unbeworben. Workers-Umzug NUR falls Cloudflare Pages real abkündigt (separates Runbook, nicht an v2.0 gekoppelt) |
| 5 | **Storage als `KVAdapter`-Interface** mit drei Backends: `fs` (Disk-Hosts), `cf-kv` (Pages/Workers), `redis-rest` (Upstash via reinem `fetch`, für Vercel). Konformitätstest für alle, **inkl. 1,5-MB-Binär-Roundtrip** (Logo-Kontrakt; Upstash-Free limitiert 1 MB → im Vercel-Rezept dokumentieren) | KV-Keys byte-identisch zu v1: `config`, `config:prev`, `logo:data`, `logo:meta`, `react:<guid>` |
| 6 | **Auth: Authorizer-Naht** (`isAuthorized(request, env)`, minimal). v2.0: gehärteter Admin-Code (timing-safe Vergleich, doctor warnt < 12 Zeichen). **v2.1 (geplant): „Login mit Steady" — globale Writes nur für Publikations-Owner.** Vor v2.0-Freeze: main_app-Commitment + API-Skizze (Owner-Rollen-Endpunkt existiert öffentlich nicht) | Rewrite shippt entkoppelt von der Plattform-Roadmap; Interface-Tausch statt Umbau |
| 7 | **Zentrale Fehlerbehandlung** mit 500-Parität + **Secret-Scrubbing** (FULLTEXT_FEED_URL-Token wird aus Message/Stack/cause redigiert) + Leak-Test | AGENTS.md Hard Rule 1 wird von Doku zu Code befördert |
| 8 | **Feed-Fetch: 10-s-AbortSignal-Timeout** — die EINZIGE bewusste Verhaltensänderung | Erst der Timeout macht den vorhandenen Stale-while-error-Fallback im Ausfall erreichbar; heute hängt das Rendering unbegrenzt |
| 9 | **Bootstrap-Guard**: `server/node.js` bleibt 10-Zeilen-plain-JS-Launcher (Versionscheck ≥ 22.18 → zweisprachige Meldung → `import('./node.ts')`) | Node ist Primärpfad; `engines` blockiert den Start nicht, kryptische `.ts`-Fehler wären die erste Erfahrung migrierender Publisher |
| 10 | **Regeln werden Tests**: ASSET_VERSION-Hash-Guard (+ `npm run bump-assets`), ROUTES↔`functions/`-Konsistenztest (ersetzt Hard Rule 5), Protokoll-Konstanten-Test (KV-Keys, Cookie/localStorage-Enums, `data-*`, `/rubrik/`, `x-kit-admin`), i18n-Parität (besteht) | Eine Regel, die nur in Doku existiert, ist keine Regel |

## 3. Invarianten (Publisher-Garantien)

- Alle Routen, KV-Keys, Cookies, localStorage-Enums, `data-*`-Attribute,
  i18n-Keys, Cache-Politik: **byte-identisch** (per Protokoll-Test bewacht).
- `kit.config.js` bleibt die einzige Publisher-Datei; `.env`-Variablen unverändert.
- Alle heutigen Hosts funktionieren weiter; CF-Bestand updatet **in-place**
  (gleiches Pages-Projekt, gleiches KV-Binding, gleiche wrangler.toml).
- Agent-Setup-Flow („Richte meine Seite ein") bleibt; `npm run dev|start|test|doctor` unverändert.

## 4. Beweisstrategie

1. **Testsuite als Orakel:** Die 7 v1-Testdateien werden mit **ausschließlich
   geänderten Import-Endungen** (`.js → .ts`) portiert — Assertions byte-identisch,
   im PR-Diff prüfbar. Export-Hooks bleiben bestehen (`startServer`,
   `_resetFeedCache`, `createFsKv`, `IS_CONFIGURED`).
2. **Golden-Master-Skript** (`scripts/golden-master.ts`): v1-Tag-Worktree gegen v2,
   beide mit **injizierter** `kit.config.js`/`.env`/`data/` und demselben
   Fixture-Feed-Server (sonst rendert v1 die Onboarding-Seite und der Diff ist
   Rauschen). Diff modulo `ASSET_VERSION`/Timestamps = leer. Lauf wird im Port-PR
   dokumentiert; danach übernehmen schlanke Struktur-Asserts (keine dauerhafte
   Snapshot-Suite — bewusst gegen Snapshot-Churn entschieden).
3. **Neue Pflicht-Tests:** 8 Coverage-Gaps (memberships, robots.txt, 404,
   config-PATCH/DELETE inkl. Doppel-Revert, Logo-413, Paywall-Cut-Varianten,
   Feed-down-Kaltpfad) + Hänge-Feed-Timeout + Token-Leak + Storage-Konformität.
4. **CI:** Node-22/24-Matrix, `tsc --noEmit` (strict + erasableSyntaxOnly),
   ESLint/Prettier (Konventionen wie steady-widget-2.0), `node --test`,
   `doctor --offline`, wrangler-Dry-Run (CF-Pfad).

## 5. Migration v1 → v2

**Ein** [UPDATE.md](../../agent/UPDATE.md) mit Versions-Weiche („liegt
`functions/*.js` im Repo → v1 → Migrationsabschnitt"):

- Replace-Migration mit Ownership-Map. **Map-Korrektur:** Brand-Assets
  (`public/assets/logo.png`, `favicon.*` u. ä.) sind **Publisher-Eigentum**.
- **Fork-Patch-Verfahren:** Diff Fork vs. v1-Upstream-Tag → kategorisierte
  Patch-Liste (Brand-Asset / Code-Patch / Config) → Port/Drop-Regeln mit
  v1→v2-Dateizuordnung. Die Blaupause-Installation ist der Testfall.
- KV-/`data/`-Daten bleiben unangetastet (Keys identisch). Kein Hosterwechsel
  nötig; optionaler Wechsel siehe TODOS (Export/Import-Tool).
- Danach: `npm install && npm run check && npm test && npm run doctor`.

## 6. Doku & Ownership-Übergabe

- README/AGENTS.md/SETUP.md neu (No-Build-Claim auf Node-Pfad eingegrenzt,
  Node-Pin ≥ 22.18 überall: engines, doctor, Dockerfile `node:24`, alle Rezepte).
- 7 Deploy-Rezepte: **Railway (Default, mit Ops-Träger-Tabelle)**, Render, Fly,
  Docker/VPS (Hetzner), Uberspace, **Vercel (neu, Upstash-Limits dokumentiert)**,
  Cloudflare Pages (demotet). Jedes Rezept benennt, wer OS/TLS/Disk/Uptime trägt.
- Repo-Transfer → `steady-media` (GitHub-Redirects halten alte Template-Links),
  CODEOWNERS aufs Team, SemVer + CHANGELOG, v2.0.0 als Major.
- Das Team owned **Code, keine Ops** — gehostet wird weiter von Publishern.

## 7. Geprüfte und verworfene Alternativen

| Alternative | Verworfen weil |
|---|---|
| Phoenix/Elixir self-hosted | Kein BEAM auf Workers; Toolchain/DB-Hürden für Publisher; fremdes Betriebsmodell fürs Team |
| Phoenix hosted (main_app-Feature) | Anderes Produkt (Publisher verlieren Ownership/Portabilität) |
| TS mit klassischem Build (`dist/`) | Build-Step in jedem Setup/Update/Deploy-Flow = realer Publisher-Nachteil |
| Nur JSDoc/`checkJS` ohne Port (Outside-Voice F8) | Zweifach bestätigt verworfen: kein echtes TS, keine Interface-Typen für KVAdapter/Authorizer, Team-Standard verfehlt. Risiko-Argument entkräftet, seit der Port layout-stabil und diff-prüfbar ist |
| Hono (ursprüngliche Review-Entscheidung) | Outside-Voice F2: Einbau + Punkt-für-Punkt-Neutralisierung; Routen-Argument seit CF-Demotion hinfällig; Zero-Dep-Versprechen wäre gestorben |
| Workers-Umzug in v2.0 | Outside-Voice F4: Code-Ersatz + Plattformwechsel + Domain-Umzug in einem Agenten-Update = maximaler Blast-Radius |
| Dauerhafte HTML-Snapshot-Suite | Snapshot-Churn → Blind-Approvals; Struktur-Asserts decken die Invarianten |
| Rate-Limiting am Admin-Gate | Ohne sauberen Speicher löchrig; langer Code + timing-safe genügt |

## 8. Bewusste Trade-offs (einzeln benannt)

1. Empfohlener Hosting-Pfad kostet künftig ~5 €/Monat; $0 nur noch unbeworben via CF.
2. Vercel-Pfad: Logo-Limit unterhalb 1,5 MB je nach Upstash-Tier — im Rezept dokumentiert, im Konformitätstest erzwungen.
3. Nur erasable TS-Syntax (keine Enums/Namespaces) — per tsconfig erzwungen.
4. v1→v2 ist einmalig kein `git merge` — Replace-Migration mit Runbook.
5. Feed-Timeout ist eine Verhaltensänderung — dokumentiert, getestet, gewollt.
6. v2.1-Owner-Auth hängt an main_app — deshalb „geplant", nicht „verbindlich", bis Skizze vorliegt.

## 9. Implementierungs-Tasks (Kurzreferenz)

T1 Tooling/Pins → T2 In-Place-Port → T3 Test-Port (Orakel) → T4 Bootstrap-Guard →
T5 KVAdapter (fs/cf-kv/redis-rest + 1,5-MB-Konformität) → T6 Härtungen
(Authorizer, Scrubber+Leak-Test, Feed-Timeout, ASSET-Guard, ROUTES-Test) →
T7 GAP-Tests + Protokoll-Test → T8 Golden-Master → T9 Doku/Rezepte →
T10 Repo-Transfer → T11 main_app-Abstimmung Owner-Auth (parallel).
Detail: `~/.gstack/projects/seboess-blaupause-kit/tasks-eng-review-20260611-064942.jsonl`.

## 10. Roadmap nach v2.0

- **v2.1 (geplant):** „Login mit Steady" — Writes nur für Publikations-Owner (siehe §2.6).
- [TODOS.md](../../../TODOS.md): Logo/Favicon über Panel/Config (eliminiert Fork-Patches); KV-Export/Import-Tool für Hosterwechsel.
