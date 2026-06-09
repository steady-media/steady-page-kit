// Route: /api/config — global veröffentlichte Seiteneinstellungen (Skin + Struktur).
//   GET    → liefert die Konfiguration ({} wenn keine)
//   PUT    → speichert (Header x-kit-admin muss KIT_ADMIN_CODE matchen)
//   DELETE → setzt zurück auf Default (admin)
// Speicher: KV (KIT_KV), Key "config". Wert = {skin:{<localStorage-Keys>}, kitstruct, kitchrome, ts}.
const MAX = 65536; // 64 KB reichen für den Settings-Blob

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
function authed(req, env) {
  const code = env && env.KIT_ADMIN_CODE;
  return !!code && (req.headers.get("x-kit-admin") || "") === code;
}

export async function onRequestGet(context) {
  const kv = context.env && context.env.KIT_KV;
  if (!kv) return json({}, 200);
  const c = await kv.get("config", "json");
  return new Response(JSON.stringify(c || {}), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return json({ error: "kv_unavailable" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "bad_body" }, 400);
  const blob = JSON.stringify({
    skin: (body.skin && typeof body.skin === "object") ? body.skin : {},
    kitstruct: typeof body.kitstruct === "string" ? body.kitstruct.slice(0, 2000) : "",
    kitchrome: typeof body.kitchrome === "string" ? body.kitchrome.slice(0, 8000) : "",
    ts: Date.now(),
  });
  if (blob.length > MAX) return json({ error: "too_large" }, 413);
  await env.KIT_KV.put("config", blob);
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return json({ error: "kv_unavailable" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("config");
  return json({ ok: true });
}
