# steady-page-kit

**[English → README.md](README.md)**

Deine eigene Website für deine [Steady](https://steadyhq.com)-Publikation —
eingerichtet vom KI-Coding-Tool deiner Wahl, gehostet wo du willst.

Dein Steady-RSS-Feed ist das CMS: Beiträge, Rubriken, Bilder und Teaser landen
automatisch auf deiner Seite. Das offizielle Steady-Widget übernimmt Login, Paywall
und Checkout. Ein eingebautes Design-Panel lässt dich alles umstylen — Schriften,
Farben, Layout, Logo — und das Ergebnis mit einem Klick für alle Besucher
veröffentlichen.

```
Steady (CMS) ──RSS──▶ Kit (SSR, 10-Min-Cache) ──HTML──▶ Besucher
                        │
                        ├─ Storage: data/ auf dem Node-Host · Cloudflare KV · Upstash Redis
                        └─ Secrets: KIT_ADMIN_CODE, FULLTEXT_FEED_URL (optional)
```

## In drei Schritten zur Seite

1. **Template kopieren** — „Use this template" auf GitHub, oder das Zip laden.
2. **Ordner im KI-Coding-Tool öffnen** — Claude Code, Cursor, Codex, Gemini CLI,
   Amp, … alle finden ihre Anleitung in diesem Repo.
3. **Sagen: „Richte meine Seite ein."** Der Agent fragt nach deiner
   Steady-Publikation, füllt die Konfiguration aus, prüft alles und deployt zum
   Host deiner Wahl (Railway, Render, Fly.io, eigener Server, Uberspace, Vercel
   oder Cloudflare).

Du brauchst: eine Steady-Publikation, ein KI-Coding-Tool, Node ≥ 22.18 (empfohlen
24 LTS) und ein Konto beim gewählten Host. Terminal-Wissen ist nicht nötig — der
Agent macht die Arbeit und belegt sie mit einem Gesundheitscheck (`npm run doctor`).

## Was du bekommst

- **Live-Inhalte** aus deinem Steady-Feed, Volltexte über den authentifizierten
  Feed, mit der offiziellen Steady-Paywall für Mitglieder-Teile
- **Echter Steady-Login & Checkout** auf deiner eigenen Domain (`/memberships`)
- **Design-Panel** (✦-Button): kuratierte Looks, 50+ Schriften, Farbschemata,
  Dark Mode, Layouts — global veröffentlichen per Admin-Code, jederzeit zurücknehmen
- **Suche, Reaktionen (Claps), SEO** (Sitemap, Canonical, Open Graph), RSS-Proxy
- **Deutsch oder Englisch** als Oberflächensprache (`language` in `kit.config.js`)
- **Ein Code, jeder Host**: TypeScript ohne Build-Step auf dem Node-Pfad — der
  Quellcode läuft direkt (Node ≥ 22.18); Cloudflare und Vercel bündeln beim Deploy
  selbst. Null Runtime-Dependencies.

## Hosting

Schnellster Weg — ein Klick, dann Steady-Slug + ein paar Werte eintragen:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/steady-page-kit?referralCode=-TGvVk)

Das Kit läuft auf jedem Node-Host mit Disk, auf Vercel (serverless) und auf
Cloudflare Pages. Die Spalte **OS/TLS/Disk** sagt, wer die Maschine patcht, die
Zertifikate erneuert und die Daten persistent hält — die Plattform oder du.

| Host | OS/TLS/Disk | Kosten | Hinweis |
|---|---|---|---|
| **Railway** — empfohlen | Plattform; du hängst einmal ein Volume an | ~5 €/Monat | Managed PaaS; **Ein-Klick über das Railway-Template** (fragt nur Slug + ein paar Werte) oder per CLI — siehe [docs/agent/deploy/railway.md](docs/agent/deploy/railway.md) |
| Render | Plattform; persistente Disk als Add-on | ~7 $/Monat | Disks gibt es nicht im Free-Tier |
| Fly.io | Plattform; Volume | wenige €/Monat | Pay as you go; bei 1 Maschine bleiben |
| Hetzner / jeder Docker-VPS | **Du**: OS-Patches, TLS, Backups | ab ~4 €/Monat | Für alle, die ihren Server selbst verwalten |
| Uberspace | Host patcht OS + TLS; du betreibst die App | ab 5 €/Monat | Disk ist von Haus aus persistent |
| Vercel | Plattform; keine Disk — Storage über Upstash Redis | Pro-Plan | Hobby-Tier untersagt kommerzielle Nutzung; Upstash-Free begrenzt den Logo-Upload auf ~700 KB |
| Cloudflare Pages | Plattform; KV inklusive | 0 $ | Weiterhin voll unterstützt, nicht mehr unsere Default-Empfehlung — Bestands-Installationen laufen unverändert weiter |

Schritt-für-Schritt-Rezepte für jeden Host: [`docs/agent/deploy/`](docs/agent/deploy/).

## Manuelles Setup (ohne KI-Tool)

Voraussetzung: Node ≥ 22.18 (empfohlen 24 LTS).

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
Updates & v1→v2-Migration: [docs/agent/UPDATE.md](docs/agent/UPDATE.md) ·
Versionshistorie: [CHANGELOG.md](CHANGELOG.md)

Lizenz: [MIT](LICENSE). Kein offizielles Steady-Produkt — ein Community-Kit.
