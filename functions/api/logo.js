// Route: /api/logo — global gespeichertes Logo (Cloudflare KV).
//   GET    → liefert das Logo-Bild (für ALLE Besucher)
//   PUT    → speichert ein neues Logo   (admin, Header x-kit-admin)
//   DELETE → entfernt das Logo          (admin)
// KV-Keys: "logo:data" (Bytes) + "logo:meta" ({type, aspect, ts}).
import { jsonResponse, isAdmin } from "../_lib/http.js";

const MAX_BYTES = 1572864; // 1,5 MB

export async function onRequestGet(context) {
  const kv = context.env && context.env.KIT_KV;
  if (!kv) return new Response("", { status: 404 });
  const meta = await kv.get("logo:meta", "json");
  const data = meta ? await kv.get("logo:data", "arrayBuffer") : null;
  if (!meta || !data) return new Response("", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": meta.type || "image/png",
      // kurz cachen; die Brand-URL trägt ?v=ts und bricht den Cache bei Logo-Wechsel
      "cache-control": "public, max-age=600",
    },
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);

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

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("logo:data");
  await env.KIT_KV.delete("logo:meta");
  return jsonResponse({ ok: true });
}
