// _lib/config.js — zentrale Konstanten des Kits.
// Publikations-Identität, Feed-Quelle, Steady-Anbindung, Render-Parameter.

export const PUBLICATION = "Blaupause";
export const AUTHOR      = "Sebastian Esser";

// Öffentlicher Steady-RSS-Feed — Single Source of Truth für alle Inhalte
// (Titel, Teaser, Kategorie, Bild, Datum, Link, GUID). Volltexte liefert der
// authentifizierte Feed (Secret FULLTEXT_FEED_URL, siehe posts/[id].js).
export const FEED_URL = "https://steady.page/sebastian/rss";

// Steady-Publikations-ID → lädt den widget_loader (Smart Layers / Checkout / Paywall / Login).
export const STEADY_PUBLICATION_ID = "ab2d81e4-59a5-4097-a668-110ad2cd3256";

// Kanonische Steady-Login-URL — Fallback-Link, falls das Login-Widget nicht lädt.
export const STEADY_LOGIN_URL = "https://steady.page/de/log_in?publication=sebastian";

// Cloudflare AI Search: Host, der das Suchmodal-Snippet ausliefert.
export const SEARCH_HOST = "https://2c903ea2-1298-4781-b3e0-91cec257854a.search.ai.cloudflare.com";

export const PER_PAGE    = 12;   // Teaser pro Seite (flache Liste / Rubrik-Seiten)
export const MAX_PILLS   = 8;    // max. Anzahl Kategorie-Pills
export const PINNED_GUID = null; // optional: Post-GUID als Hero pinnen; null = neuester Post

// Editierbare Standard-Navigation (überschreibbar via kitchrome-Cookie bzw. globale Config).
// l = Label, h = href, x = extern (öffnet in neuem Tab).
export const DEFAULT_NAV = [
  { l: "Ausgaben", h: "/" },
  { l: "Mitglied werden", h: "/memberships" },
  { l: "Newsletter anmelden", h: "https://steady.page/de/sebastian/newsletter/sign_up", x: true },
];

// Cache-Buster für public/assets/kit.css + kit-*.js — bei Asset-Änderungen hochzählen.
export const ASSET_VERSION = "2026-06-10";
