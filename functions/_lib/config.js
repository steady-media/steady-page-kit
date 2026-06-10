// _lib/config.js — zentrale Konstanten des Kits.
// Publikations-Identität, Feed-Quelle, Steady-Anbindung, Render-Parameter.
// Portabilität: die mit „env-überschreibbar" markierten Werte können pro Deployment
// per Environment-Variable überschrieben werden (siehe buildPageContext in settings.js) —
// damit ist das Kit als Vorlage für andere Steady-Publikationen nutzbar.

export const PUBLICATION = "Blaupause";
export const AUTHOR      = "Sebastian Esser";

// Kanonische Origin dieser Installation (für canonical/OG-URLs, Sitemap).
// env-überschreibbar: SITE_ORIGIN
export const SITE_ORIGIN = "https://neu.blaupause.community";

// Öffentlicher Steady-RSS-Feed — Single Source of Truth für alle Inhalte
// (Titel, Teaser, Kategorie, Bild, Datum, Link, GUID). Volltexte liefert der
// authentifizierte Feed (Secret FULLTEXT_FEED_URL, siehe posts/[id].js).
// env-überschreibbar: FEED_URL
export const FEED_URL = "https://steady.page/sebastian/rss";

// Steady-Publikations-ID → lädt den widget_loader (Smart Layers / Checkout / Paywall / Login).
// env-überschreibbar: STEADY_PUBLICATION_ID
export const STEADY_PUBLICATION_ID = "ab2d81e4-59a5-4097-a668-110ad2cd3256";

// Kanonische Steady-Login-URL — Fallback-Link, falls das Login-Widget nicht lädt.
// env-überschreibbar: STEADY_LOGIN_URL
export const STEADY_LOGIN_URL = "https://steady.page/de/log_in?publication=sebastian";

// Newsletter-Anmeldung (CTA-Band auf der Landing + Default-Nav).
// env-überschreibbar: NEWSLETTER_URL
export const NEWSLETTER_URL = "https://steady.page/de/sebastian/newsletter/sign_up";

export const PER_PAGE    = 12;   // Teaser pro Seite (flache Liste / Rubrik-Seiten)
export const MAX_PILLS   = 8;    // max. Anzahl Kategorie-Pills
export const PINNED_GUID = null; // optional: Post-GUID als Hero pinnen; null = neuester Post

// Überschrift, mit der im Steady-Editor der Mitglieder-Teil beginnt. Davor schneidet
// renderPost und setzt das offizielle Steady-Paywall-Element (siehe render.js).
export const MEMBER_HEADING = "Mitglieder-Bereich";

// Editierbare Standard-Navigation (überschreibbar via kitchrome-Cookie bzw. globale Config).
// l = Label, h = href, x = extern (öffnet in neuem Tab).
export const DEFAULT_NAV = [
  { l: "Ausgaben", h: "/" },
  { l: "Mitglied werden", h: "/memberships" },
  { l: "Newsletter anmelden", h: NEWSLETTER_URL, x: true },
];

// Cache-Buster für public/assets/kit.css + kit-*.js — bei Asset-Änderungen hochzählen.
export const ASSET_VERSION = "2026-06-10b";
