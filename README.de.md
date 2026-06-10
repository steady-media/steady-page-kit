# steady-page-kit

**[English → README.md](README.md)**

Deine eigene Website für deine [Steady](https://steadyhq.com)-Publikation —
eingerichtet vom KI-Coding-Tool deiner Wahl, gehostet wo du willst.

Dein Steady-RSS-Feed ist das CMS: Beiträge, Rubriken, Bilder und Teaser landen
automatisch auf deiner Seite. Das offizielle Steady-Widget übernimmt Login, Paywall
und Checkout. Ein eingebautes Design-Panel lässt dich alles umstylen — Schriften,
Farben, Layout, Logo — und das Ergebnis mit einem Klick für alle Besucher
veröffentlichen.

## In drei Schritten zur Seite

1. **Template kopieren** — „Use this template" auf GitHub, oder das Zip laden.
2. **Ordner im KI-Coding-Tool öffnen** — Claude Code, Cursor, Codex, Gemini CLI,
   Amp, … alle finden ihre Anleitung in diesem Repo.
3. **Sagen: „Richte meine Seite ein."** Der Agent fragt nach deiner
   Steady-Publikation, füllt die Konfiguration aus, prüft alles und deployt zum
   Host deiner Wahl (Cloudflare, Render, Railway, Fly.io, Docker/eigener Server,
   Uberspace).

Du brauchst: eine Steady-Publikation, ein KI-Coding-Tool und ein Konto beim
gewählten Host. Terminal-Wissen ist nicht nötig — der Agent macht die Arbeit und
belegt sie mit einem Gesundheitscheck (`npm run doctor`).

## Was du bekommst

- **Live-Inhalte** aus deinem Steady-Feed (10 Minuten Cache), Volltexte über den
  authentifizierten Feed, mit der offiziellen Steady-Paywall für Mitglieder-Teile
- **Echter Steady-Login & Checkout** auf deiner eigenen Domain (`/memberships`)
- **Design-Panel** (✦-Button): kuratierte Looks, 50+ Schriften, Farbschemata,
  Dark Mode, Layouts — global veröffentlichen per Admin-Code, jederzeit zurücknehmen
- **Suche, Reaktionen (Claps), SEO** (Sitemap, Canonical, Open Graph), RSS-Proxy
- **Deutsch oder Englisch** als Oberflächensprache (`language` in `kit.config.js`)
- **Zwei Runtimes, ein Code**: Cloudflare Pages (KV) oder pures Node 20+ überall
  (Dateisystem-Storage) — null Runtime-Dependencies

## Manuelles Setup (ohne KI-Tool)

1. [`kit.config.js`](kit.config.js) ausfüllen — die Kommentare erklären jedes Feld.
2. `.env.example` → `.env` kopieren und `KIT_ADMIN_CODE` setzen (plus optional die
   Volltext-Feed-URL aus deinem Steady-Backend).
3. `npm install && npm run dev` → http://localhost:8788, prüfen mit `npm run doctor`.
4. Deploy: Rezepte in [`docs/agent/deploy/`](docs/agent/deploy/) (funktionieren auch
   für Menschen). Im Steady-Backend die Checkout-URL auf
   `https://deine-domain/memberships` stellen.

## Für Entwickler:innen & Agents

Architektur, Kommandos und harte Regeln: [AGENTS.md](AGENTS.md).
Setup-Runbook: [docs/agent/SETUP.md](docs/agent/SETUP.md) ·
Updates: [docs/agent/UPDATE.md](docs/agent/UPDATE.md)

Lizenz: [MIT](LICENSE). Kein offizielles Steady-Produkt — ein Community-Kit.
