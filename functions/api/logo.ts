// Route: /api/logo — globally stored logo (Cloudflare KV).
//   GET    → returns the logo image (for ALL visitors)
//   PUT    → stores a new logo        (admin, header x-kit-admin)
//   DELETE → removes the logo         (admin)
// KV keys: "logo:data" (bytes) + "logo:meta" ({type, aspect, ts}).
import type { KitContext, LogoMeta } from "../_lib/types.ts";
import { jsonResponse } from "../_lib/http.ts";
import { isAuthorized } from "../_lib/auth.ts";

const MAX_BYTES = 1572864; // 1.5 MB

export async function onRequestGet(context: KitContext): Promise<Response> {
  const kv = context.env && context.env.KIT_KV;
  if (!kv) return new Response("", { status: 404 });
  // KVAdapter.get returns unknown — cast to LogoMeta, which is the stored shape
  const meta = await kv.get("logo:meta", "json") as LogoMeta | null;
  const data = meta ? await kv.get("logo:data", "arrayBuffer") as ArrayBuffer | null : null;
  if (!meta || !data) return new Response("", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": meta.type || "image/png",
      // cache briefly; the brand URL carries ?v=ts and busts the cache on logo change
      "cache-control": "public, max-age=600",
    },
  });
}

export async function onRequestPut(context: KitContext): Promise<Response> {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);

  const type = (request.headers.get("x-kit-type") || "image/png").toLowerCase();
  if (type.indexOf("image/") !== 0) return jsonResponse({ error: "bad_type" }, 400);
  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return jsonResponse({ error: "empty" }, 400);
  if (buf.byteLength > MAX_BYTES) return jsonResponse({ error: "too_large" }, 413);

  let aspect = parseFloat(request.headers.get("x-kit-aspect") || "4");
  if (!(aspect > 0) || !isFinite(aspect)) aspect = 4;
  const ts = Date.now();
  await env.KIT_KV.put("logo:data", buf);
  await env.KIT_KV.put("logo:meta", JSON.stringify({ type, aspect, ts }));
  return jsonResponse({ ok: true, ts });
}

export async function onRequestDelete(context: KitContext): Promise<Response> {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("logo:data");
  await env.KIT_KV.delete("logo:meta");
  return jsonResponse({ ok: true });
}
