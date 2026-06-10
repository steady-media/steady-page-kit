// kit.config.js — die Einstellungen DEINER Publikation. / YOUR publication's settings.
//
// DE: Das ist die einzige Datei, die du anpassen musst, um das Kit zu deinem zu machen.
//     Öffne diesen Ordner in deinem KI-Coding-Tool (Claude Code, Cursor, Codex,
//     Gemini CLI, Amp …) und sage „Richte meine Seite ein" — der Agent füllt sie
//     für dich aus (Ablauf: docs/agent/SETUP.md).
// EN: This is the only file you need to edit to make the kit yours. Open this folder
//     in your AI coding tool and say "Set up my page" — the agent fills it in for you
//     (see docs/agent/SETUP.md).
//
// Secrets gehören NICHT hierher (Admin-Code, Volltext-Feed-URL) — die liegen in
// .env (Node) bzw. .dev.vars / Cloudflare-Secrets. Siehe .env.example.
// Secrets do NOT belong here — they go into .env / .dev.vars. See .env.example.

export default {
  // Anzeigename der Publikation / display name of your publication.
  publication: "",

  // Autor:in (optional; Meta-Daten) / author (optional; used in meta data).
  author: "",

  // Sprache der Oberfläche: "de" oder "en". / UI language of the site.
  language: "de",

  // Kanonische URL der fertigen Seite, ohne Slash am Ende — z. B.
  // "https://meine-publikation.de". Leer lassen, bis die finale URL feststeht.
  // Canonical origin of the deployed site, no trailing slash. "" until known.
  siteOrigin: "",

  steady: {
    // Dein Steady-Slug — der Teil hinter steady.page/ in deiner Publikations-URL.
    // Eine komplette URL einfügen geht auch; das Kit normalisiert sie.
    // Your Steady slug — the part after steady.page/. Pasting the full URL works too.
    slug: "",

    // Steady-Publikations-ID (UUID) — lädt das Steady-Widget (Login/Paywall/Checkout).
    // Wird beim Setup automatisch gefunden; manuell: Quelltext deiner steady.page-
    // Seite ansehen → "widget_loader/<uuid>".
    // Steady publication id (UUID). Found automatically during setup.
    publicationId: "",
  },

  // Überschrift, mit der im Steady-Editor der Mitglieder-Teil beginnt.
  // "" = Sprach-Default („Mitglieder-Bereich" / "Members only").
  // Heading that starts the members-only part of your posts. "" = language default.
  memberHeading: "",

  // Navigation. null = sinnvoller Default (Startseite, Mitglied werden, Newsletter).
  // Eigene: [{ l: "Label", h: "/pfad-oder-url", x: true-wenn-extern }, …]
  // Navigation. null = sensible default. Custom: array of {l, h, x}.
  nav: null,

  // Feinheiten / tuning
  perPage: 12,      // Teaser pro Seite / teasers per page
  maxPills: 8,      // max. Kategorie-Pills / max category pills
  pinnedGuid: null, // Post-GUID als Aufmacher pinnen / pin a post guid as hero
};
