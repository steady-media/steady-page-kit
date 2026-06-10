// Route: /api/config — global veröffentlichte Seiteneinstellungen (Cloudflare KV).
//   GET    → liefert die Config ({} wenn keine veröffentlicht ist)
//   PUT    → speichert; sichert die Vorversion nach "config:prev" (admin)
//   PATCH  → tauscht aktuelle Config und Vorversion (Revert/Redo, admin)
//   DELETE → setzt auf die eingebauten Defaults zurück (admin)
// KV-Key "config" = {skin: {<localStorage-Keys>}, kitstruct, kitchrome, ts}.
import { jsonResponse, isAdmin } from "../_lib/http.js";

const MAX_BYTES = 65536; // 64 KB reichen für den Settings-Blob

export async function onRequestGet(context) {
  const kv = context.env && context.env.KIT_KV;
  const cfg = kv ? await kv.get("config", "json") : null;
  return jsonResponse(cfg || {}, 200, "public, max-age=60");
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: "bad_json" }, 400); }
  if (!body || typeof body !== "object") return jsonResponse({ error: "bad_body" }, 400);

  const blob = JSON.stringify({
    skin: (body.skin && typeof body.skin === "object") ? body.skin : {},
    kitstruct: typeof body.kitstruct === "string" ? body.kitstruct.slice(0, 2000) : "",
    kitchrome: typeof body.kitchrome === "string" ? body.kitchrome.slice(0, 8000) : "",
    ts: Date.now(),
  });
  if (blob.length > MAX_BYTES) return jsonResponse({ error: "too_large" }, 413);
  // Vorversion sichern → PATCH kann jede Veröffentlichung rückgängig machen
  const current = await env.KIT_KV.get("config");
  if (current != null) await env.KIT_KV.put("config:prev", current);
  await env.KIT_KV.put("config", blob);
  return jsonResponse({ ok: true });
}

/** Revert: aktuelle Config und Vorversion tauschen (erneutes PATCH = Redo). */
export async function onRequestPatch(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);
  const [current, prev] = await Promise.all([
    env.KIT_KV.get("config"),
    env.KIT_KV.get("config:prev"),
  ]);
  if (prev == null) return jsonResponse({ error: "no_previous" }, 404);
  await env.KIT_KV.put("config", prev);
  if (current != null) await env.KIT_KV.put("config:prev", current);
  return jsonResponse({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!isAdmin(request, env)) return jsonResponse({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("config");
  return jsonResponse({ ok: true });
}
