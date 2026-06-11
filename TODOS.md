# TODOS

Geplante Arbeiten nach dem v2-Port (Paritäts-Rewrite TypeScript, Zero-Dependencies).
Quelle: /plan-eng-review 2026-06-11. Kontext im jeweiligen Eintrag.

## v2.1: Logo & Favicon über Panel/Config statt Datei-Patch

- **What:** Brand-Assets (Logo-Grafik im Header, Favicon) als Upload bzw. Config-Feld,
  statt als Edit an template-eigenen Dateien (`public/assets/kit.css`,
  `functions/_lib/page.*`).
- **Why:** FORK-NOTES.md zeigt: Publisher patchen heute Template-Dateien für ihr
  Branding. Jede Migration muss diese Patches erkennen und re-applien. Ein
  Config-/Upload-Weg eliminiert die Problemklasse dauerhaft.
- **Pros:** Fork-Patches an Template-Dateien sterben aus; Updates werden trivial;
  Logo-Upload-Mechanik (`/api/logo`, KV `logo:data`/`logo:meta`) existiert bereits.
- **Cons:** Feature-Arbeit (Favicon-Upload + CSS-Hook für Header-Logo), erweitert
  das KV-Schema; gehört bewusst NICHT in den Paritäts-Port v2.0.
- **Context:** Heute nutzt der Header `.brand__logo` aus `kit.css`; Favicon-Link
  steckt in `page.*`. Ziel: beide aus KV/Config speisen, Fallback = heutiges
  Verhalten. Start: `functions/api/logo.*` als Vorbild.
- **Depends on:** v2.0 geshippt (Paritäts-Beweis abgeschlossen).

## v2.x: KV-Export/Import-Tool für Hosterwechsel

- **What:** `scripts/kit-data.ts` — exportiert/importiert `config`, `config:prev`,
  `logo:data`, `logo:meta`, `react:*` zwischen den Storage-Backends
  (cf-kv ↔ fs ↔ redis-rest).
- **Why:** Die Hosting-Strategie (Node-first, kein Cloudflare-Default) erzeugt
  Wechsler. Ohne Tool verlieren sie publiziertes Design, Logo und Claps oder
  kopieren von Hand.
- **Pros:** Macht den Anti-Lock-in-Anspruch praktisch wahr; agent-automatisierbar;
  testbar gegen das Storage-Konformitäts-Harness.
- **Cons:** Ein Werkzeug mehr, das mit jedem neuen Backend mitwächst; `react:*`
  braucht eine List-Fähigkeit pro Backend (kleine Interface-Erweiterung).
- **Context:** Das KVAdapter-Interface (v2.0, T5) liefert get/put; das Tool ist im
  Kern „list keys → get → put". Claps sind eventually consistent — Hinweis im
  Tool-Output, dass Zähler als Momentaufnahme wandern.
- **Depends on:** v2.0 T5 (KVAdapter-Interface mit drei Backends).
