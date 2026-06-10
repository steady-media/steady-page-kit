// server/node.js — der portable Pfad: derselbe Code, der auf Cloudflare Pages läuft,
// hinter einem schlanken node:http-Server. Keine Runtime-Dependencies.
//
// Prinzip: Die functions/-Module sind reine (Request, env, params) → Response-Handler
// (Pages-Functions-Signatur). Dieser Server baut pro Request genau diesen context
// nach — env.KIT_KV kommt aus dem fs-Shim (server/fs-kv.js) statt aus Cloudflare KV.
// Läuft überall, wo Node >= 20 läuft: Render, Railway, Fly, Docker, VPS, Uberspace …
//
// Start: `npm run dev` (watch) oder `npm start`. Port: env PORT (Default 8788).

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadDotEnv } from "./env.js";
import { createFsKv } from "./fs-kv.js";
import { IS_CONFIGURED } from "../functions/_lib/config.js";

import * as routeHome from "../functions/index.js";
import * as routePost from "../functions/posts/[id].js";
import * as routeRubrik from "../functions/rubrik/[slug].js";
import * as routeMemberships from "../functions/memberships.js";
import * as routeRss from "../functions/rss.js";
import * as routeSitemap from "../functions/sitemap.xml.js";
import * as routeRobots from "../functions/robots.txt.js";
import * as apiConfig from "../functions/api/config.js";
import * as apiLogo from "../functions/api/logo.js";
import * as apiSearch from "../functions/api/search.js";
import * as apiReact from "../functions/api/react.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = resolve(ROOT, "public");
const MAX_BODY = 3 * 1024 * 1024; // Logo-Limit ist 1,5 MB — 3 MB Puffer reichen für alles

// Statische Routen-Tabelle — bewusst explizit statt Ordner-Scan: das ist die
// Single Source of Truth für „welche URLs gibt es" (Pages mappt per Ordnerstruktur).
const ROUTES = [
  { re: /^\/$/, mod: routeHome },
  { re: /^\/posts\/([^/]+)$/, mod: routePost, params: ["id"] },
  { re: /^\/rubrik\/([^/]+)$/, mod: routeRubrik, params: ["slug"] },
  { re: /^\/memberships$/, mod: routeMemberships },
  { re: /^\/rss$/, mod: routeRss },
  { re: /^\/sitemap\.xml$/, mod: routeSitemap },
  { re: /^\/robots\.txt$/, mod: routeRobots },
  { re: /^\/api\/config$/, mod: apiConfig },
  { re: /^\/api\/logo$/, mod: apiLogo },
  { re: /^\/api\/search$/, mod: apiSearch },
  { re: /^\/api\/react$/, mod: apiReact },
];

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

function handlerFor(mod, method) {
  const name = "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
  if (mod[name]) return mod[name];
  if (method === "HEAD" && mod.onRequestGet) return mod.onRequestGet; // Node strippt den Body selbst
  return null;
}

function allowedMethods(mod) {
  const all = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const out = all.filter(m => handlerFor(mod, m));
  if (out.includes("GET")) out.splice(out.indexOf("GET") + 1, 0, "HEAD");
  return out;
}

/** Node-IncomingMessage → fetch-Request (absolute URL, gepufferter Body). */
async function toRequest(req, port) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = req.headers["host"] || `localhost:${port}`;
  const url = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) return { tooLarge: true };
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  return { request: new Request(url, { method: req.method, headers, body }) };
}

/** fetch-Response → Node-ServerResponse. */
async function writeResponse(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => {
    if (k === "set-cookie") return; // unten separat (mehrwertig)
    headers[k] = v;
  });
  const setCookie = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie() : [];
  if (setCookie.length) headers["set-cookie"] = setCookie;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Statische Datei aus public/ — mit der Cache-Politik aus public/_headers
 *  (die Datei selbst gilt nur auf Cloudflare; hier spiegeln wir sie). */
async function tryStatic(pathname) {
  if (pathname.includes("..") || pathname.includes("\0")) return null;
  let rel;
  try { rel = decodeURIComponent(pathname).replace(/^\/+/, ""); } catch (e) { return null; }
  if (!rel || rel.split("/").some(seg => seg.startsWith("_") || seg.startsWith("."))) return null;
  const fp = resolve(PUBLIC_DIR, rel);
  if (!fp.startsWith(PUBLIC_DIR + sep)) return null;
  let data;
  try { data = await readFile(fp); } catch (e) { return null; }
  return {
    data,
    type: MIME[extname(fp).toLowerCase()] || "application/octet-stream",
    cache: rel.startsWith("assets/") ? "public, max-age=604800" : "public, max-age=3600",
  };
}

function buildEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (!env.KIT_KV) {
    env.KIT_KV = createFsKv(env.KIT_DATA_DIR || join(ROOT, "data"));
  }
  return env;
}

function makeHandler(env, port) {
  return async function handle(req, res) {
    try {
      // Trailing Slash normalisieren (Pages macht dasselbe per Redirect).
      const rawPath = (req.url || "/").split("?")[0];
      const pathname = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") || "/" : rawPath;
      if (pathname !== rawPath) {
        const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        res.writeHead(301, { location: pathname + qs });
        return res.end();
      }

      for (const route of ROUTES) {
        const m = pathname.match(route.re);
        if (!m) continue;

        const fn = handlerFor(route.mod, req.method);
        if (!fn) {
          res.writeHead(405, { allow: allowedMethods(route.mod).join(", ") });
          return res.end("Method Not Allowed");
        }

        const built = await toRequest(req, port);
        if (built.tooLarge) {
          res.writeHead(413, { "content-type": "application/json" });
          return res.end(JSON.stringify({ error: "too_large" }));
        }

        const params = {};
        (route.params || []).forEach((name, i) => {
          let v = m[i + 1];
          try { v = decodeURIComponent(v); } catch (e) { /* roh lassen */ }
          params[name] = v;
        });

        const context = { request: built.request, env, params, data: {}, waitUntil() {}, next() {} };
        const response = await fn(context);
        return writeResponse(res, response);
      }

      // Kein Function-Match → statische Datei aus public/
      if (req.method === "GET" || req.method === "HEAD") {
        const st = await tryStatic(pathname);
        if (st) {
          res.writeHead(200, {
            "content-type": st.type,
            "cache-control": st.cache,
            "x-content-type-options": "nosniff",
          });
          return res.end(st.data);
        }
      }

      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    } catch (err) {
      console.error("[steady-page-kit]", err);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  };
}

/**
 * Server starten. opts.env überschreibt process.env (Tests!), opts.port 0 = zufällig.
 * @returns {Promise<import("node:http").Server>}
 */
export function startServer(opts = {}) {
  const port = opts.port ?? parseInt(process.env.PORT || "8788", 10);
  const env = buildEnv(opts.env);
  const server = http.createServer();
  server.on("request", (req, res) => makeHandler(env, server.address().port)(req, res));
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, opts.host || "0.0.0.0", () => resolvePromise(server));
  });
}

// Direktstart (npm run dev / npm start) — nicht beim Import durch Tests.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  loadDotEnv(join(ROOT, ".env"));
  const server = await startServer();
  const { port } = server.address();
  const configured = IS_CONFIGURED || !!process.env.FEED_URL;
  const hint = configured ? "" : "  (noch unkonfiguriert → Onboarding-Seite; sage deinem KI-Tool: „Richte meine Seite ein“)";
  console.log(`steady-page-kit läuft auf http://localhost:${port}${hint}`);
}
