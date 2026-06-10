// _lib/util.js — kleine, überall genutzte Helfer (Escaping, Datum, Slugs, Bild-URLs).

/** HTML-Escaping für Text in Element-Inhalten und Attributen. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
                "September", "Oktober", "November", "Dezember"];

/** RSS-pubDate → deutsches Langdatum ("17. März 2025"); leer bei ungültigem Datum. */
export function fmtDate(pub) {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
