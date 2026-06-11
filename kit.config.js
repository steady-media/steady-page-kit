// @ts-check
// kit.config.js — die Einstellungen DEINER Publikation. / YOUR publication's settings.
//
// Diese Installation: Blaupause (Deployment-Fork des Templates
// https://github.com/seboess/steady-page-kit — Updates: docs/agent/UPDATE.md).
//
// Secrets gehören NICHT hierher (Admin-Code, Volltext-Feed-URL) — die liegen in
// .env (Node) bzw. .dev.vars / Cloudflare-Secrets. Siehe .env.example.

/** @type {import("./functions/_lib/types.ts").KitConfig} */
export default {
  // Anzeigename der Publikation / display name of your publication.
  publication: "Blaupause",

  // Autor:in (optional; Meta-Daten) / author (optional; used in meta data).
  author: "Sebastian Esser",

  // Sprache der Oberfläche: "de" oder "en". / UI language of the site.
  language: "de",

  // Kanonische URL der fertigen Seite, ohne Slash am Ende.
  siteOrigin: "https://neu.blaupause.community",

  steady: {
    // Dein Steady-Slug — der Teil hinter steady.page/ in deiner Publikations-URL.
    slug: "sebastian",

    // Steady-Publikations-ID (UUID) — lädt das Steady-Widget (Login/Paywall/Checkout).
    publicationId: "ab2d81e4-59a5-4097-a668-110ad2cd3256",
  },

  // Überschrift, mit der im Steady-Editor der Mitglieder-Teil beginnt.
  // "" = Sprach-Default („Mitglieder-Bereich" / "Members only").
  memberHeading: "",

  // Navigation: explizit gesetzt, um die bisherigen Blaupause-Labels zu erhalten
  // („Ausgaben" statt Kit-Default „Beiträge").
  nav: [
    { l: "Ausgaben", h: "/" },
    { l: "Mitglied werden", h: "/memberships" },
    { l: "Newsletter anmelden", h: "https://steady.page/de/sebastian/newsletter/sign_up", x: true },
  ],

  // Feinheiten / tuning
  perPage: 12,      // Teaser pro Seite / teasers per page
  maxPills: 8,      // max. Kategorie-Pills / max category pills
  pinnedGuid: null, // Post-GUID als Aufmacher pinnen / pin a post guid as hero
};
