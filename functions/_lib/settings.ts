// _lib/settings.ts — visitor and publication configuration.
//
// Two layers, clear precedence:
//   1. Globally published config from KV (base for ALL visitors; panel button
//      "Publish for all visitors", admin-gated via /api/config).
//   2. Personal cookies (kitstruct/kitchrome) + localStorage — win per browser.
//
// Structure (shell/lead story/stream/rails/header) is rendered by the SERVER from
// the cookie; the skin (fonts/colors/cards) is applied by the CLIENT (public/assets/kit-theme.js).

import type { GlobalConfig, KitContext, KitEnv, LogoMeta, RenderCfg, StructCfg } from "./types.ts";
import { FEED_URL, envSteadyUrls } from "./config.ts";

type NavEntry = { l?: unknown; h?: unknown; x?: unknown };

/**
 * Effectively configured? Counts kit.config.js (FEED_URL derived from the slug)
 * AND the FEED_URL env override (cfg.feedUrl from buildPageContext). Unconfigured
 * installations show the onboarding page instead of an error page.
 */
export function isConfigured(cfg: { feedUrl?: string | null } | null | undefined): boolean {
  return !!((cfg && cfg.feedUrl) || FEED_URL);
}

/** Default structure = single-column page with split hero and a flat list. */
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
    } catch (e) { /* broken cookie → defaults */ }
  }

  // kitchrome = JSON {brand, nav:[{l,h,x}]} — title + navigation (lengths hard-capped)
  const cm = cookie.match(/(?:^|;\s*)kitchrome=([^;]*)/);
  if (cm) {
    try {
      const o = JSON.parse(decodeURIComponent(cm[1]));
      if (typeof o.brand === "string") def.brand = o.brand.slice(0, 60);
      if (Array.isArray(o.nav)) def.nav = o.nav.filter((n: NavEntry) => n && n.l).slice(0, 8)
        .map((n: NavEntry) => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
      if (Array.isArray(o.foot)) def.foot = o.foot.filter((n: NavEntry) => n && n.l).slice(0, 8)
        .map((n: NavEntry) => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
    } catch (e) { /* broken cookie → default nav */ }
  }

  // kitpins = JSON {scope: [guid,…]} — pinned posts per section, hard-capped.
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
    } catch (e) { /* broken cookie → empty map */ }
  }
  return def;
}

/**
 * Personal cookie + globally published structure as fallback:
 * if the visitor has NO own kitstruct/kitchrome cookie, the published value
 * from the global config applies.
 */
export function effectiveCookie(cookie: string | null | undefined, globalCfg: GlobalConfig | null): string {
  let out = cookie || "";
  if (globalCfg) {
    if (globalCfg.kitstruct && !/(?:^|;\s*)kitstruct=/.test(out)) out += (out ? "; " : "") + "kitstruct=" + globalCfg.kitstruct;
    if (globalCfg.kitchrome && !/(?:^|;\s*)kitchrome=/.test(out)) out += (out ? "; " : "") + "kitchrome=" + globalCfg.kitchrome;
    if (globalCfg.kitpins && !/(?:^|;\s*)kitpins=/.test(out)) out += (out ? "; " : "") + "kitpins=" + globalCfg.kitpins;
  }
  return out;
}

/** Globally published config from KV: {skin, kitstruct, kitchrome, ts} or null. */
export async function getConfig(env: KitEnv): Promise<GlobalConfig | null> {
  try {
    if (!env || !env.KIT_KV) return null;
    return (await env.KIT_KV.get("config", { type: "json", cacheTtl: 60 })) as GlobalConfig | null;
  } catch (e) {
    return null;
  }
}

/** Globally stored logo (KV): {type, aspect, ts} or null. Fault-tolerant. */
export async function getLogoMeta(env: KitEnv): Promise<LogoMeta | null> {
  try {
    if (!env || !env.KIT_KV) return null;
    return (await env.KIT_KV.get("logo:meta", { type: "json", cacheTtl: 60 })) as LogoMeta | null;
  } catch (e) {
    return null;
  }
}

/** A post's clap counter (KV, eventually consistent). */
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
 * Per request: bundle cookie + global config + logo into ONE render cfg.
 * Also returns the matching cache header: pages with personal cookies vary per
 * visitor → no-store; otherwise a 5-minute edge/browser cache.
 * Used by all HTML routes.
 */
export async function buildPageContext(context: KitContext): Promise<{ cfg: RenderCfg; cacheControl: string }> {
  const env = context.env || {};
  const cookie = context.request.headers.get("cookie") || "";
  const [globalCfg, logo] = await Promise.all([getConfig(env), getLogoMeta(env)]);
  const cfg = parseStruct(effectiveCookie(cookie, globalCfg)) as Partial<RenderCfg> & StructCfg;
  cfg.skin = (globalCfg ? globalCfg.skin : null) as Record<string, string> | null;
  cfg.logo = logo;
  // Deployment overrides (portability: kit as a template for other publications).
  // STEADY_SLUG derives the feed/login URL (one-click deploys without editing
  // kit.config.js); explicit FEED_URL/STEADY_LOGIN_URL still win.
  const envSteady = envSteadyUrls(env);
  cfg.feedUrl   = env.FEED_URL || (envSteady && envSteady.feedUrl) || null;  // null = default from config.ts
  cfg.site      = env.SITE_ORIGIN || null;
  cfg.steadyId  = env.STEADY_PUBLICATION_ID || null;
  cfg.loginUrl  = env.STEADY_LOGIN_URL || (envSteady && envSteady.loginUrl) || null;
  cfg.analytics = env.ANALYTICS_TOKEN || "";       // Cloudflare Web Analytics beacon token
  const hasPersonalCfg = /(?:^|;\s*)kit(?:struct|chrome|pins)=/.test(cookie);
  return { cfg: cfg as RenderCfg, cacheControl: hasPersonalCfg ? "no-store" : "public, max-age=300" };
}
