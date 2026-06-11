# Fork-Notizen (Blaupause-Installation)

Diese Installation weicht bewusst in folgenden TEMPLATE-Dateien vom Upstream
(https://github.com/seboess/steady-page-kit) ab. **Bei Upstream-Merges
(docs/agent/UPDATE.md) diese Änderungen behalten** — im Konfliktfall „ours":

1. `public/assets/kit.css` → `.brand__logo` nutzt `url(/assets/logo.png)`
   (Blaupause-B) statt des neutralen Markenfarben-Quadrats.
2. `functions/_lib/page.ts` → Favicon-Link zeigt auf `/assets/favicon.png`
   (Blaupause-B) statt `/assets/favicon.svg`.
3. `public/assets/logo.png` + `public/assets/favicon.png` sind fork-eigene
   Assets (existieren im Template nicht).

Publisher-eigene Dateien laut Ownership-Map (kit.config.js, wrangler.toml
name/KV-ID, .env/.dev.vars) sind hier wie vorgesehen gefüllt.
