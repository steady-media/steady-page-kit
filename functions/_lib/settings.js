// _lib/settings.js — Besucher- und Publikations-Konfiguration.
//
// Zwei Ebenen, klare Präzedenz:
//   1. Global veröffentlichte Config aus KV (Basis für ALLE Besucher; Panel-Button
//      „Für alle Besucher speichern", admin-gated über /api/config).
//   2. Persönliche Cookies (kitstruct/kitchrome) + localStorage — gewinnen pro Browser.
//
// Struktur (Shell/Aufmacher/Stream/Leisten/Header) rendert der SERVER aus dem Cookie;
// Skin (Fonts/Farben/Karten) wendet der CLIENT an (public/assets/kit-theme.js).

/** Default-Struktur = einspaltige Seite mit Split-Hero und flacher Liste. */
export function parseStruct(cookie) {
  const def = { shell: "single", auf: "klein", stream: "liste", rails: [],
                headerStyle: "links", search: false, brand: "", nav: null };
  if (!cookie) return def;

  // kitstruct=shell=portal&auf=gross&stream=rubrik&rails=neueste,meist,themen&…
  const m = cookie.match(/(?:^|;\s*)kitstruct=([^;]*)/);
  if (m) {
    try {
      const q = new URLSearchParams(decodeURIComponent(m[1]));
      def.shell  = q.get("shell")  === "portal" ? "portal" : "single";
      def.auf    = q.get("auf")    === "gross"  ? "gross"  : "klein";
      def.stream = q.get("stream") === "rubrik" ? "rubrik" : "liste";
      def.headerStyle = q.get("header") === "zentriert" ? "zentriert" : "links";
      def.search = q.get("search") === "1";
      const allow = ["neueste", "meist", "themen"];
      if (q.has("rails")) def.rails = (q.get("rails") || "").split(",").filter(r => allow.includes(r));
      else def.rails = def.shell === "portal" ? allow.slice() : [];
    } catch (e) { /* defekter Cookie → Defaults */ }
  }

  // kitchrome = JSON {brand, nav:[{l,h,x}]} — Titel + Navigation (Längen hart begrenzt)
  const cm = cookie.match(/(?:^|;\s*)kitchrome=([^;]*)/);
  if (cm) {
    try {
      const o = JSON.parse(decodeURIComponent(cm[1]));
      if (typeof o.brand === "string") def.brand = o.brand.slice(0, 60);
      if (Array.isArray(o.nav)) def.nav = o.nav.filter(n => n && n.l).slice(0, 8)
        .map(n => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
    } catch (e) { /* defekter Cookie → Default-Nav */ }
  }
  return def;
}

/**
 * Persönlicher Cookie + global veröffentlichte Struktur als Fallback:
 * Hat der Besucher KEINEN eigenen kitstruct-/kitchrome-Cookie, zählt der
 * veröffentlichte Wert aus der globalen Config.
 */
export function effectiveCookie(cookie, globalCfg) {
  let out = cookie || "";
  if (globalCfg) {
    if (globalCfg.kitstruct && !/(?:^|;\s*)kitstruct=/.test(out)) out += (out ? "; " : "") + "kitstruct=" + globalCfg.kitstruct;
    if (globalCfg.kitchrome && !/(?:^|;\s*)kitchrome=/.test(out)) out += (out ? "; " : "") + "kitchrome=" + globalCfg.kitchrome;
  }
  return out;
}

/** Global veröffentlichte Config aus KV: {skin, kitstruct, kitchrome, ts} oder null. */
export async function getConfig(env) {
  try {
    if (!env || !env.KIT_KV) return null;
    return await env.KIT_KV.get("config", "json");
  } catch (e) {
    return null;
  }
}

/** Global gespeichertes Logo (KV): {type, aspect, ts} oder null. Fehlertolerant. */
export async function getLogoMeta(env) {
  try {
    if (!env || !env.KIT_KV) return null;
    return await env.KIT_KV.get("logo:meta", "json");
  } catch (e) {
    return null;
  }
}

/**
 * Pro Request: Cookie + globale Config + Logo zu EINEM Render-cfg bündeln.
 * Liefert auch den passenden Cache-Header: Seiten mit persönlichen Cookies
 * variieren pro Besucher → no-store; sonst 5 Min Edge-/Browser-Cache.
 * Wird von allen HTML-Routen benutzt.
 */
export async function buildPageContext(context) {
  const cookie = context.request.headers.get("cookie") || "";
  const [globalCfg, logo] = await Promise.all([
    getConfig(context.env),
    getLogoMeta(context.env),
  ]);
  const cfg = parseStruct(effectiveCookie(cookie, globalCfg));
  cfg.skin = globalCfg ? globalCfg.skin : null;
  cfg.logo = logo;
  const hasPersonalCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  return { cfg, cacheControl: hasPersonalCfg ? "no-store" : "public, max-age=300" };
}
