// _lib/settings.ts — Besucher- und Publikations-Konfiguration.
//
// Zwei Ebenen, klare Präzedenz:
//   1. Global veröffentlichte Config aus KV (Basis für ALLE Besucher; Panel-Button
//      „Für alle Besucher speichern", admin-gated über /api/config).
//   2. Persönliche Cookies (kitstruct/kitchrome) + localStorage — gewinnen pro Browser.
//
// Struktur (Shell/Aufmacher/Stream/Leisten/Header) rendert der SERVER aus dem Cookie;
// Skin (Fonts/Farben/Karten) wendet der CLIENT an (public/assets/kit-theme.js).

import type { GlobalConfig, KitContext, KitEnv, LogoMeta, RenderCfg, StructCfg } from "./types.ts";
import { FEED_URL, envSteadyUrls } from "./config.ts";

type NavEntry = { l?: unknown; h?: unknown; x?: unknown };

/**
 * Effektiv konfiguriert? Zählt kit.config.js (FEED_URL aus dem Slug abgeleitet)
 * UND den FEED_URL-Env-Override (cfg.feedUrl aus buildPageContext). Unkonfigurierte
 * Installationen zeigen die Onboarding-Seite statt einer Fehlerseite.
 */
export function isConfigured(cfg: { feedUrl?: string | null } | null | undefined): boolean {
  return !!((cfg && cfg.feedUrl) || FEED_URL);
}

/** Default-Struktur = einspaltige Seite mit Split-Hero und flacher Liste. */
export function parseStruct(cookie: string | null | undefined): StructCfg {
  const def: StructCfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {},
                headerStyle: "links", search: false, brand: "", nav: null, foot: null };
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
      if (Array.isArray(o.nav)) def.nav = o.nav.filter((n: NavEntry) => n && n.l).slice(0, 8)
        .map((n: NavEntry) => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
      if (Array.isArray(o.foot)) def.foot = o.foot.filter((n: NavEntry) => n && n.l).slice(0, 8)
        .map((n: NavEntry) => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
    } catch (e) { /* defekter Cookie → Default-Nav */ }
  }

  // kitpins = JSON {scope: [guid,…]} — angepinnte Beiträge je Bereich, hart gedeckelt.
  const pm = cookie.match(/(?:^|;\s*)kitpins=([^;]*)/);
  if (pm) {
    try {
      const o = JSON.parse(decodeURIComponent(pm[1])) as Record<string, unknown>;
      if (o && typeof o === "object") {
        let scopes = 0;
        for (const k in o) {
          if (scopes++ >= 40) break;
          const v = o[k];
          if (!Array.isArray(v)) continue;
          const list = v.filter((g): g is string => typeof g === "string" && !!g && g.length <= 200).slice(0, 3);
          if (list.length) def.pins[String(k).slice(0, 120)] = list;
        }
      }
    } catch (e) { /* defekter Cookie → leere Map */ }
  }
  return def;
}

/**
 * Persönlicher Cookie + global veröffentlichte Struktur als Fallback:
 * Hat der Besucher KEINEN eigenen kitstruct-/kitchrome-Cookie, zählt der
 * veröffentlichte Wert aus der globalen Config.
 */
export function effectiveCookie(cookie: string | null | undefined, globalCfg: GlobalConfig | null): string {
  let out = cookie || "";
  if (globalCfg) {
    if (globalCfg.kitstruct && !/(?:^|;\s*)kitstruct=/.test(out)) out += (out ? "; " : "") + "kitstruct=" + globalCfg.kitstruct;
    if (globalCfg.kitchrome && !/(?:^|;\s*)kitchrome=/.test(out)) out += (out ? "; " : "") + "kitchrome=" + globalCfg.kitchrome;
  }
  return out;
}

/** Global veröffentlichte Config aus KV: {skin, kitstruct, kitchrome, ts} oder null. */
export async function getConfig(env: KitEnv): Promise<GlobalConfig | null> {
  try {
    if (!env || !env.KIT_KV) return null;
    return (await env.KIT_KV.get("config", { type: "json", cacheTtl: 60 })) as GlobalConfig | null;
  } catch (e) {
    return null;
  }
}

/** Global gespeichertes Logo (KV): {type, aspect, ts} oder null. Fehlertolerant. */
export async function getLogoMeta(env: KitEnv): Promise<LogoMeta | null> {
  try {
    if (!env || !env.KIT_KV) return null;
    return (await env.KIT_KV.get("logo:meta", { type: "json", cacheTtl: 60 })) as LogoMeta | null;
  } catch (e) {
    return null;
  }
}

/** Clap-Zähler eines Posts (KV, leicht verzögert konsistent). */
export async function getClaps(env: KitEnv, guid: string): Promise<number> {
  try {
    if (!env || !env.KIT_KV) return 0;
    const v = (await env.KIT_KV.get("react:" + guid, { cacheTtl: 60 })) as string | null;
    return parseInt(v || "0", 10) || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Pro Request: Cookie + globale Config + Logo zu EINEM Render-cfg bündeln.
 * Liefert auch den passenden Cache-Header: Seiten mit persönlichen Cookies
 * variieren pro Besucher → no-store; sonst 5 Min Edge-/Browser-Cache.
 * Wird von allen HTML-Routen benutzt.
 */
export async function buildPageContext(context: KitContext): Promise<{ cfg: RenderCfg; cacheControl: string }> {
  const env = context.env || {};
  const cookie = context.request.headers.get("cookie") || "";
  const [globalCfg, logo] = await Promise.all([getConfig(env), getLogoMeta(env)]);
  const cfg = parseStruct(effectiveCookie(cookie, globalCfg)) as Partial<RenderCfg> & StructCfg;
  cfg.skin = (globalCfg ? globalCfg.skin : null) as Record<string, string> | null;
  cfg.logo = logo;
  // Deployment-Overrides (Portabilität: Kit als Vorlage für andere Publikationen).
  // STEADY_SLUG leitet Feed-/Login-URL ab (One-Click-Deploys ohne kit.config.js-Edit);
  // explizite FEED_URL/STEADY_LOGIN_URL gewinnen weiterhin.
  const envSteady = envSteadyUrls(env);
  cfg.feedUrl   = env.FEED_URL || (envSteady && envSteady.feedUrl) || null;  // null = Default aus config.js
  cfg.site      = env.SITE_ORIGIN || null;
  cfg.steadyId  = env.STEADY_PUBLICATION_ID || null;
  cfg.loginUrl  = env.STEADY_LOGIN_URL || (envSteady && envSteady.loginUrl) || null;
  cfg.analytics = env.ANALYTICS_TOKEN || "";       // Cloudflare Web Analytics Beacon-Token
  const hasPersonalCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  return { cfg: cfg as RenderCfg, cacheControl: hasPersonalCfg ? "no-store" : "public, max-age=300" };
}
