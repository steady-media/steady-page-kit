// _lib/util.ts — kleine, überall genutzte Helfer (Escaping, Datum, Slugs, Bild-URLs).

/** HTML-Escaping für Text in Element-Inhalten und Attributen. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

import { LOCALE } from "./i18n.ts";
import { ASSET_VERSION } from "./config.ts";

// Formatter pro Locale cachen — Intl.DateTimeFormat-Konstruktion ist teuer.
const dateFmts = new Map<string, Intl.DateTimeFormat>();
function dateFmt(locale: string): Intl.DateTimeFormat {
  if (!dateFmts.has(locale)) {
    dateFmts.set(locale, new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));
  }
  return dateFmts.get(locale)!;
}

/** RSS-pubDate → Langdatum in der Kit-Sprache ("17. März 2025" / "March 17, 2025");
 *  leer bei ungültigem Datum. `intlLocale` überschreibt (Tests, Sonderfälle). */
export function fmtDate(pub: string, intlLocale?: string): string {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return dateFmt(intlLocale || LOCALE.intl).format(d);
}

/** Kategorie-Name → URL-Slug (für /rubrik/:slug). */
export function slugify(s: unknown): string {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, " und ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Generische Marken-Grafik für Feed-Items ohne Teaserbild — statt der leeren
// grauen Fläche. Austauschbares Fork-Asset (public/assets/teaser-fallback.svg).
const TEASER_FALLBACK = `/assets/teaser-fallback.svg?v=${ASSET_VERSION}`;

/** Steady-Bild-URL fürs Layout aufbereiten, HTML-escaped.
 *  - ohne url → generische Marken-Grafik (kein leerer grauer Platzhalter),
 *  - signierte URL (Steadys assets-proxy, Parameter `s=`) → unverändert durchreichen:
 *    zusätzliche Resize-Parameter brächen die Signatur (403 → graues Bild),
 *  - sonst Imgix-Resize-Parameter anhängen (Crop auf Gesichter). */
export function teaser(url: string, w: number, h: number): string {
  if (!url) return TEASER_FALLBACK;
  if (/[?&]s=/.test(url)) return esc(url);
  const sep = url.includes("?") ? "&" : "?";
  return esc(url + sep + `auto=format&w=${w}&h=${h}&fit=crop&crop=faces`);
}
