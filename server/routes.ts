// server/routes.ts — THE route table + platform-neutral dispatch.
// The Node and Vercel entries call handleRequest(); Cloudflare Pages routes via
// folder structure directly into functions/ (test/routes-consistency.test.js keeps
// both worlds in lockstep).
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
import * as apiEngagement from "../functions/api/engagement.ts";

type RouteModule = Record<string, PagesHandler | undefined>;
export interface Route { re: RegExp; mod: RouteModule; params?: string[]; src: string }

// Static route table — deliberately explicit: single source of truth for
// "which URLs exist". `src` couples each entry to its functions/ file.
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
  { re: /^\/api\/engagement$/, mod: apiEngagement, src: "functions/api/engagement.ts" },
];

export function handlerFor(mod: RouteModule, method: string): PagesHandler | null {
  const name = "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
  if (mod[name]) return mod[name]!;
  if (method === "HEAD" && mod.onRequestGet) return mod.onRequestGet; // the platform strips the body
  return null;
}

export function allowedMethods(mod: RouteModule): string[] {
  const all = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const out = all.filter(m => handlerFor(mod, m));
  if (out.includes("GET")) out.splice(out.indexOf("GET") + 1, 0, "HEAD");
  return out;
}

export const MAX_BODY = 3 * 1024 * 1024; // logo limit is 1.5 MB — a 3 MB buffer is plenty

/**
 * Request → Response via the ROUTES table. `null` = no route (the caller does
 * static serving/404). Handles the trailing-slash 301, 405+Allow and 413 on an
 * oversized body (Content-Length-based; the Node entry also checks while buffering).
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
      try { v = decodeURIComponent(v); } catch { /* leave raw */ }
      params[name] = v;
    });

    const context: KitContext = { request, env, params, data: {}, waitUntil() {}, next() {} };
    return await fn(context);
  }
  return null;
}
