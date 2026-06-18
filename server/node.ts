// server/node.ts — HTTP server bridge: Node IncomingMessage ↔ fetch API.
// Builds one fetch Request per request, forwards it to handleRequest() and
// writes the fetch Response back into the Node ServerResponse.
// Static serving (public/) and the 404 fallback live here.
//
// Direct start: server/node.js (bootstrap) — not this file.
// Tests import startServer directly from here.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createFsKv } from "./fs-kv.ts";
import { createRedisRestKv } from "./kv-redis-rest.ts";
import { handleRequest, MAX_BODY } from "./routes.ts";
import { logError } from "../functions/_lib/scrub.ts";
import type { KitEnv } from "../functions/_lib/types.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = resolve(ROOT, "public");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

/** Node IncomingMessage → fetch Request (absolute URL, buffered body). */
async function toRequest(req: http.IncomingMessage, port: number): Promise<{ request?: Request; tooLarge?: boolean }> {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = req.headers["host"] || `localhost:${port}`;
  const url = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }

  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY) return { tooLarge: true };
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks);
  }
  return { request: new Request(url, { method: req.method, headers, body }) };
}

/** fetch Response → Node ServerResponse. */
async function writeResponse(res: http.ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((v, k) => {
    if (k === "set-cookie") return; // handled separately below (multi-valued)
    headers[k] = v;
  });
  const setCookie = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie() : [];
  if (setCookie.length) headers["set-cookie"] = setCookie;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Static file from public/ — with the cache policy from public/_headers
 *  (that file only applies on Cloudflare; here we mirror it). */
async function tryStatic(pathname: string): Promise<{ data: Buffer; type: string; cache: string } | null> {
  if (pathname.includes("..") || pathname.includes("\0")) return null;
  let rel: string;
  try { rel = decodeURIComponent(pathname).replace(/^\/+/, ""); } catch { return null; }
  if (!rel || rel.split("/").some(seg => seg.startsWith("_") || seg.startsWith("."))) return null;
  const fp = resolve(PUBLIC_DIR, rel);
  if (!fp.startsWith(PUBLIC_DIR + sep)) return null;
  let data: Buffer;
  try { data = await readFile(fp); } catch { return null; }
  return {
    data,
    type: MIME[extname(fp).toLowerCase()] || "application/octet-stream",
    cache: rel.startsWith("assets/") ? "public, max-age=604800" : "public, max-age=3600",
  };
}

export function buildEnv(extra?: Record<string, unknown>): KitEnv {
  const env: Record<string, unknown> = { ...process.env, ...extra };
  if (!env.KIT_KV) {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      env.KIT_KV = createRedisRestKv(String(env.UPSTASH_REDIS_REST_URL), String(env.UPSTASH_REDIS_REST_TOKEN));
    } else {
      env.KIT_KV = createFsKv(String(env.KIT_DATA_DIR || join(ROOT, "data")));
    }
  }
  return env as KitEnv;
}

function makeHandler(env: KitEnv, serverPort: number) {
  return async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const built = await toRequest(req, serverPort);
      if (built.tooLarge) {
        res.writeHead(413, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "too_large" }));
        return;
      }
      const response = built.request ? await handleRequest(built.request, env) : null;
      if (response) { await writeResponse(res, response); return; }

      // No function match → static file from public/
      const pathname = built.request
        ? new URL(built.request.url).pathname
        : (req.url || "/").split("?")[0];
      if (req.method === "GET" || req.method === "HEAD") {
        const st = await tryStatic(pathname);
        if (st) {
          res.writeHead(200, {
            "content-type": st.type,
            "cache-control": st.cache,
            "x-content-type-options": "nosniff",
          });
          res.end(st.data);
          return;
        }
      }

      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    } catch (err) {
      logError(err, env);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  };
}

/**
 * Start the server. opts.env overrides process.env (tests!), opts.port 0 = random.
 */
export function startServer(opts?: { port?: number; host?: string; env?: Record<string, unknown> }): Promise<http.Server> {
  const port = opts?.port ?? parseInt(process.env.PORT || "8788", 10);
  const env = buildEnv(opts?.env);
  const server = http.createServer();
  server.on("request", (req, res) => makeHandler(env, (server.address() as { port: number }).port)(req, res));
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, opts?.host || "0.0.0.0", () => resolvePromise(server));
  });
}
