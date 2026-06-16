// @ts-check
// kit.config.js — YOUR publication's settings.
//
// This is the ONLY file you need to fill in as a publisher. Alternatively you can
// set all values at deploy time via env (STEADY_SLUG, SITE_ORIGIN,
// STEADY_PUBLICATION_ID …) and leave this file generic — see .env.example.
// Branding (name, navigation, logo, colors) can also be saved globally in the
// customizer panel ("Publish for all visitors").
//
// Secrets do NOT belong here (admin code, full-text feed URL) — they live in
// .env (Node) or .dev.vars / Cloudflare secrets. See .env.example.

/** @type {import("./functions/_lib/types.ts").KitConfig} */
export default {
  // Display name of your publication.
  publication: "",

  // Author (optional; used in meta data).
  author: "",

  // UI language of the site: "de" or "en".
  language: "de",

  // Canonical URL of the finished site, without a trailing slash.
  siteOrigin: "",

  steady: {
    // Your Steady slug — the part after steady.page/ in your publication URL.
    slug: "",

    // Steady publication ID (UUID) — loads the Steady widget (login/paywall/checkout).
    publicationId: "",
  },

  // Heading at which the member section begins in the Steady editor.
  // "" = language default ("Mitglieder-Bereich" / "Members only").
  memberHeading: "",

  // Navigation: null = kit default (Posts / Become a member / Newsletter).
  // Set your own labels/links here — or save them globally in the customizer panel.
  nav: null,

  // Tuning
  perPage: 12,      // teasers per page
  maxPills: 8,      // max category pills
  pinnedGuid: null, // pin a post guid as the lead story
};
