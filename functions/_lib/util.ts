// _lib/util.ts — small helpers used everywhere (escaping, dates, slugs, image URLs).

/** HTML escaping for text in element content and attributes. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

import { LOCALE } from "./i18n.ts";
import { ASSET_VERSION } from "./config.ts";

// Cache one formatter per locale — Intl.DateTimeFormat construction is expensive.
const dateFmts = new Map<string, Intl.DateTimeFormat>();
function dateFmt(locale: string): Intl.DateTimeFormat {
  if (!dateFmts.has(locale)) {
    dateFmts.set(locale, new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));
  }
  return dateFmts.get(locale)!;
}

/** RSS pubDate → long date in the kit language ("17. März 2025" / "March 17, 2025");
 *  empty on invalid date. `intlLocale` overrides (tests, special cases). */
export function fmtDate(pub: string, intlLocale?: string): string {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return dateFmt(intlLocale || LOCALE.intl).format(d);
}

/** Category name → URL slug (for /rubrik/:slug). */
export function slugify(s: unknown): string {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, " und ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Generic brand graphic for feed items without a teaser image — instead of the
// empty grey box. Replaceable fork asset (public/assets/teaser-fallback.svg).
const TEASER_FALLBACK = `/assets/teaser-fallback.svg?v=${ASSET_VERSION}`;

/** Prepare a Steady image URL for the layout, HTML-escaped.
 *  - no url → generic brand graphic (no empty grey placeholder),
 *  - signed URL (Steady's assets proxy, `s=` parameter) → pass through unchanged:
 *    extra resize parameters would break the signature (403 → grey image),
 *  - otherwise append Imgix resize parameters (crop to faces). */
export function teaser(url: string, w: number, h: number): string {
  if (!url) return TEASER_FALLBACK;
  if (/[?&]s=/.test(url)) return esc(url);
  const sep = url.includes("?") ? "&" : "?";
  return esc(url + sep + `auto=format&w=${w}&h=${h}&fit=crop&crop=faces`);
}
