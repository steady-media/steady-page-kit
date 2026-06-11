// server/routes.ts — DIE Routen-Tabelle + plattformneutraler Dispatch.
// Node- und Vercel-Entry rufen handleRequest(); Cloudflare Pages routet per
// Ordnerstruktur direkt in functions/ (test/routes-consistency.test.js hält
// beide Welten deckungsgleich).
import type { KitContext, KitEnv, PagesHandler } from "../functions/_lib/types.ts";

import * as routeHome from "../functions/index.ts";
import * as routePost from "../functions/posts/[id].ts";
import * as routeRubrik from "../functions/rubrik/[slug].ts";
import * as routeMemberships from "../functions/memberships.ts";
import * as routeRss from "../functions/rss.ts";
import * as routeSitemap from "../functions/sitemap.xml.ts";
import * as routeRobots from "../functions/robots.txt.ts";
import * as apiConfig from "../functions/api/config.ts";
import * as apiLogo from "../functions/api/logo.ts";
import * as apiSearch from "../functions/api/search.ts";
import * as apiReact from "../functions/api/react.ts";

type RouteModule = Record<string, PagesHandler | undefined>;
export interface Route { re: RegExp; mod: RouteModule; params?: string[]; src: string }

// Statische Routen-Tabelle — bewusst explizit: Single Source of Truth für
// „welche URLs gibt es". `src` koppelt jeden Eintrag an seine functions/-Datei.
export const ROUTES: Route[] = [
  { re: /^\/$/, mod: routeHome, src: "functions/index.ts" },
  { re: /^\/posts\/([^/]+)$/, mod: routePost, params: ["id"], src: "functions/posts/[id].ts" },
  { re: /^\/rubrik\/([^/]+)$/, mod: routeRubrik, params: ["slug"], src: "functions/rubrik/[slug].ts" },
  { re: /^\/memberships$/, mod: routeMemberships, src: "functions/memberships.ts" },
  { re: /^\/rss$/, mod: routeRss, src: "functions/rss.ts" },
  { re: /^\/sitemap\.xml$/, mod: routeSitemap, src: "functions/sitemap.xml.ts" },
  { re: /^\/robots\.txt$/, mod: routeRobots, src: "functions/robots.txt.ts" },
  { re: /^\/api\/config$/, mod: apiConfig, src: "functions/api/config.ts" },
  { re: /^\/api\/logo$/, mod: apiLogo, src: "functions/api/logo.ts" },
  { re: /^\/api\/search$/, mod: apiSearch, src: "functions/api/search.ts" },
  { re: /^\/api\/react$/, mod: apiReact, src: "functions/api/react.ts" },
];

export function handlerFor(mod: RouteModule, method: string): PagesHandler | null {
  const name = "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
  if (mod[name]) return mod[name]!;
  if (method === "HEAD" && mod.onRequestGet) return mod.onRequestGet; // Body strippt die Plattform
  return null;
}

export function allowedMethods(mod: RouteModule): string[] {
  const all = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const out = all.filter(m => handlerFor(mod, m));
  if (out.includes("GET")) out.splice(out.indexOf("GET") + 1, 0, "HEAD");
  return out;
}

export const MAX_BODY = 3 * 1024 * 1024; // Logo-Limit ist 1,5 MB — 3 MB Puffer reichen

/**
 * Request → Response über die ROUTES-Tabelle. `null` = keine Route (Aufrufer
 * macht Static-Serving/404). Übernimmt Trailing-Slash-301, 405+Allow und
 * 413 bei zu großem Body (Content-Length-basiert; der Node-Entry prüft
 * zusätzlich beim Puffern).
 */
export async function handleRequest(request: Request, env: KitEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const rawPath = url.pathname;
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") || "/" : rawPath;
  if (pathname !== rawPath) {
    return new Response(null, { status: 301, headers: { location: pathname + url.search } });
  }

  for (const route of ROUTES) {
    const m = pathname.match(route.re);
    if (!m) continue;

    const fn = handlerFor(route.mod, request.method);
    if (!fn) {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: allowedMethods(route.mod).join(", ") } });
    }

    const len = parseInt(request.headers.get("content-length") || "0", 10);
    if (len > MAX_BODY) {
      return new Response(JSON.stringify({ error: "too_large" }), { status: 413, headers: { "content-type": "application/json" } });
    }

    const params: Record<string, string> = {};
    (route.params || []).forEach((name, i) => {
      let v = m[i + 1]!;
      try { v = decodeURIComponent(v); } catch { /* roh lassen */ }
      params[name] = v;
    });

    const context: KitContext = { request, env, params, data: {}, waitUntil() {}, next() {} };
    return await fn(context);
  }
  return null;
}
