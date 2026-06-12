// _lib/config.ts — zentrale Konstanten des Kits.
//
// Die Publisher-Identität kommt aus kit.config.js (Repo-Root) — der EINEN Datei,
// die Publisher anfassen. Hier passiert nur: Validierung, Ableitung der Steady-URLs
// aus dem Slug und die Template-eigenen Konstanten (Render-Parameter, Versionen).
// Env-Overrides (FEED_URL, SITE_ORIGIN, …) greifen zur Request-Zeit in
// buildPageContext (settings.js) und gewinnen gegen alles hier.

import kit from "../../kit.config.js";
import { LANGUAGE, t } from "./i18n.ts";

// Sprache wird in i18n.js aus kit.config.js bestimmt; hier nur durchgereicht,
// damit bestehende Importe (`from "./config.js"`) weiter funktionieren.
export { LANGUAGE };

/**
 * Steady-Slug aus Nutzereingabe normalisieren — akzeptiert auch komplette URLs
 * („https://steady.page/sebastian/rss", „steadyhq.com/de/xyz/about") und „@slug".
 * Locale-Segmente (de/en/…) am Pfadanfang werden übersprungen.
 */
export function normalizeSlug(input: unknown): string {
  let s = String(input || "").trim().replace(/^@/, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || /^(www\.)?steady(hq)?\.(page|com)\//i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
      const locales = new Set(["de", "en", "fr", "es", "it"]);
      s = u.pathname.split("/").filter(Boolean).find(seg => !locales.has(seg.toLowerCase())) || "";
    } catch (e) { /* keine parsebare URL → Eingabe als Slug weiterbehandeln */ }
  }
  return s.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

/** Steady-URLs aus Slug + Sprache ableiten; leerer Slug → leere Strings. */
export function deriveSteady(slug: string, language: string): { feedUrl: string; loginUrl: string; newsletterUrl: string } {
  if (!slug) return { feedUrl: "", loginUrl: "", newsletterUrl: "" };
  return {
    feedUrl: `https://steady.page/${slug}/rss`,
    loginUrl: `https://steady.page/${language}/log_in?publication=${slug}`,
    newsletterUrl: `https://steady.page/${language}/${slug}/newsletter/sign_up`,
  };
}

function intOr(v: unknown, def: number): number {
  const n = parseInt(v as string, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export const STEADY_SLUG = normalizeSlug(kit.steady && kit.steady.slug);

const derived = deriveSteady(STEADY_SLUG, LANGUAGE);

export const PUBLICATION = String(kit.publication || "").trim() || t("publication.fallback");
export const AUTHOR = String(kit.author || "").trim();

// Kanonische Origin dieser Installation (canonical/OG-URLs, Sitemap, robots).
// Leer = Links bleiben relativ sinnvoll, doctor warnt. env-überschreibbar: SITE_ORIGIN
export const SITE_ORIGIN = String(kit.siteOrigin || "").trim().replace(/\/+$/, "");

// Öffentlicher Steady-RSS-Feed — Single Source of Truth für alle Inhalte.
// Volltexte liefert der authentifizierte Feed (Secret FULLTEXT_FEED_URL).
// env-überschreibbar: FEED_URL
export const FEED_URL = derived.feedUrl;

// Steady-Publikations-ID → lädt den widget_loader (Login/Checkout/Paywall).
// env-überschreibbar: STEADY_PUBLICATION_ID
export const STEADY_PUBLICATION_ID = String((kit.steady && kit.steady.publicationId) || "").trim();

// Steady-Login-Fallback-Link (falls das Widget nicht lädt). env-überschreibbar: STEADY_LOGIN_URL
export const STEADY_LOGIN_URL = derived.loginUrl;

// Newsletter-Anmeldung (Default-Nav-Eintrag, nur wenn ableitbar).
export const NEWSLETTER_URL = derived.newsletterUrl;

// Überschrift, mit der im Steady-Editor der Mitglieder-Teil beginnt; davor setzt
// renderPost das offizielle Steady-Paywall-Element. "" → Sprach-Default.
export const MEMBER_HEADING = String(kit.memberHeading || "").trim() || t("member.headingDefault");

export const PER_PAGE = intOr(kit.perPage, 12);    // Teaser pro Seite
export const MAX_PILLS = intOr(kit.maxPills, 8);   // max. Kategorie-Pills
export const PINNED_GUID: string | null = kit.pinnedGuid || null; // optional: Post-GUID als Hero

/** true, sobald kit.config.js eine Feed-Quelle ergibt. Env-Overrides zählen
 *  zusätzlich zur Request-Zeit — dafür isConfigured(cfg) in settings.js nutzen. */
export const IS_CONFIGURED = !!FEED_URL;

// Editierbare Standard-Navigation (überschreibbar via kitchrome-Cookie/globale Config).
// l = Label, h = href, x = extern (neuer Tab).
export const DEFAULT_NAV: Array<{ l: string; h: string; x?: boolean }> = (Array.isArray(kit.nav) && kit.nav.length)
  ? kit.nav.filter(n => n && n.l && n.h).slice(0, 8)
      .map(n => ({ l: String(n.l).slice(0, 40), h: String(n.h).slice(0, 300), x: !!n.x }))
  : [
      { l: t("nav.posts"), h: "/" },
      { l: t("nav.member"), h: "/memberships" },
      ...(NEWSLETTER_URL ? [{ l: t("nav.newsletter"), h: NEWSLETTER_URL, x: true }] : []),
    ];

/* — Template-eigene Konstanten (gehören dem Kit, nicht dem Publisher) — */

// User-Agent für Feed-Requests (identifiziert das Kit gegenüber Steady).
export const USER_AGENT = "SteadyPageKit/1.0";

// Cache-Buster für public/assets/kit.css + kit-*.js — bei Asset-Änderungen hochzählen.
export const ASSET_VERSION = "2026-06-12b";
