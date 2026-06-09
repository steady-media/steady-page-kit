// Route: /api/logo
//   GET    → liefert das global gespeicherte Logo (für ALLE Besucher)
//   PUT    → speichert ein neues Logo (Header x-kit-admin muss KIT_ADMIN_CODE matchen)
//   DELETE → entfernt das Logo (ebenfalls admin-geschützt)
// Speicher: Cloudflare KV (Binding KIT_KV). Keys: "logo:data" (Bytes) + "logo:meta" (JSON).
const MAX_BYTES = 1572864; // 1.5 MB

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function authed(request, env) {
  const code = env && env.KIT_ADMIN_CODE;
  const got = request.headers.get("x-kit-admin") || "";
  return !!code && got === code;
}

export async function onRequestGet(context) {
  const kv = context.env && context.env.KIT_KV;
  if (!kv) return new Response("", { status: 404 });
  const meta = await kv.get("logo:meta", "json");
  const data = meta ? await kv.get("logo:data", "arrayBuffer") : null;
  if (!meta || !data) return new Response("", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": meta.type || "image/png",
      // kurz cachen; die Marken-URL trägt ?v=ts und bricht den Cache bei Wechsel
      "cache-control": "public, max-age=600",
    },
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return json({ error: "kv_unavailable" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  const type = (request.headers.get("x-kit-type") || "image/png").toLowerCase();
  if (type.indexOf("image/") !== 0) return json({ error: "bad_type" }, 400);
  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: "empty" }, 400);
  if (buf.byteLength > MAX_BYTES) return json({ error: "too_large" }, 413);
  let aspect = parseFloat(request.headers.get("x-kit-aspect") || "4");
  if (!(aspect > 0) || !isFinite(aspect)) aspect = 4;
  const ts = Date.now();
  await env.KIT_KV.put("logo:data", buf);
  await env.KIT_KV.put("logo:meta", JSON.stringify({ type: type, aspect: aspect, ts: ts }));
  return json({ ok: true, ts: ts });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return json({ error: "kv_unavailable" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("logo:data");
  await env.KIT_KV.delete("logo:meta");
  return json({ ok: true });
}
