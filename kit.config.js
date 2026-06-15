// @ts-check
// kit.config.js — die Einstellungen DEINER Publikation. / YOUR publication's settings.
//
// Dies ist die EINZIGE Datei, die du als Publisher ausfüllen musst. Alternativ
// kannst du alle Werte beim Deploy per Env setzen (STEADY_SLUG, SITE_ORIGIN,
// STEADY_PUBLICATION_ID …) und diese Datei generisch lassen — siehe .env.example.
// Branding (Name, Navigation, Logo, Farben) lässt sich auch im Anpassen-Panel
// global speichern („Für alle Besucher speichern").
//
// Secrets gehören NICHT hierher (Admin-Code, Volltext-Feed-URL) — die liegen in
// .env (Node) bzw. .dev.vars / Cloudflare-Secrets. Siehe .env.example.

/** @type {import("./functions/_lib/types.ts").KitConfig} */
export default {
  // Anzeigename der Publikation / display name of your publication.
  publication: "",

  // Autor:in (optional; Meta-Daten) / author (optional; used in meta data).
  author: "",

  // Sprache der Oberfläche: "de" oder "en". / UI language of the site.
  language: "de",

  // Kanonische URL der fertigen Seite, ohne Slash am Ende.
  siteOrigin: "",

  steady: {
    // Dein Steady-Slug — der Teil hinter steady.page/ in deiner Publikations-URL.
    slug: "",

    // Steady-Publikations-ID (UUID) — lädt das Steady-Widget (Login/Paywall/Checkout).
    publicationId: "",
  },

  // Überschrift, mit der im Steady-Editor der Mitglieder-Teil beginnt.
  // "" = Sprach-Default („Mitglieder-Bereich" / "Members only").
  memberHeading: "",

  // Navigation: null = Kit-Default (Beiträge / Mitglied werden / Newsletter).
  // Eigene Labels/Links hier setzen — oder im Anpassen-Panel global speichern.
  nav: null,

  // Feinheiten / tuning
  perPage: 12,      // Teaser pro Seite / teasers per page
  maxPills: 8,      // max. Kategorie-Pills / max category pills
  pinnedGuid: null, // Post-GUID als Aufmacher pinnen / pin a post guid as hero
};
