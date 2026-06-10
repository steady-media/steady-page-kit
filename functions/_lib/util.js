// _lib/util.js — kleine, überall genutzte Helfer (Escaping, Datum, Slugs, Bild-URLs).

/** HTML-Escaping für Text in Element-Inhalten und Attributen. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

import { LOCALE } from "./i18n.js";

// Formatter pro Locale cachen — Intl.DateTimeFormat-Konstruktion ist teuer.
const dateFmts = new Map();
function dateFmt(locale) {
  if (!dateFmts.has(locale)) {
    dateFmts.set(locale, new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));
  }
  return dateFmts.get(locale);
}

/** RSS-pubDate → Langdatum in der Kit-Sprache ("17. März 2025" / "March 17, 2025");
 *  leer bei ungültigem Datum. `intlLocale` überschreibt (Tests, Sonderfälle). */
export function fmtDate(pub, intlLocale) {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return dateFmt(intlLocale || LOCALE.intl).format(d);
}

/** Kategorie-Name → URL-Slug (für /rubrik/:slug). */
export function slugify(s) {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, " und ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Steady-CDN-Bild-URL mit Resize-Parametern (Crop auf Gesichter), HTML-escaped. */
export function teaser(url, w, h) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return esc(url + sep + `auto=format&w=${w}&h=${h}&fit=crop&crop=faces`);
}
