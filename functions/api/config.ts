// Route: /api/config — globally published site settings (Cloudflare KV).
//   GET    → returns the config ({} when none is published)
//   PUT    → saves; backs up the previous version to "config:prev" (admin)
//   PATCH  → swaps current config and previous version (revert/redo, admin)
//   DELETE → resets to the built-in defaults (admin)
// KV key "config" = {skin: {<localStorage keys>}, kitstruct, kitchrome, ts}.
import type { KitContext } from "../_lib/types.ts";
import { jsonResponse } from "../_lib/http.ts";
import { isAuthorized } from "../_lib/auth.ts";

const MAX_BYTES = 65536; // 64 KB is plenty for the settings blob

export async function onRequestGet(context: KitContext): Promise<Response> {
  const kv = context.env && context.env.KIT_KV;
  const cfg = kv ? await kv.get("config", "json") : null;
  return jsonResponse(cfg || {}, 200, "public, max-age=60");
}

export async function onRequestPut(context: KitContext): Promise<Response> {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  // request.json() returns unknown — cast to Record for the runtime guard below
  try { body = await request.json() as Record<string, unknown>; } catch (e) { return jsonResponse({ error: "bad_json" }, 400); }
  if (!body || typeof body !== "object") return jsonResponse({ error: "bad_body" }, 400);

  const blob = JSON.stringify({
    skin: (body.skin && typeof body.skin === "object") ? body.skin : {},
    kitstruct: typeof body.kitstruct === "string" ? body.kitstruct.slice(0, 2000) : "",
    kitchrome: typeof body.kitchrome === "string" ? body.kitchrome.slice(0, 8000) : "",
    kitpins: typeof body.kitpins === "string" ? body.kitpins.slice(0, 8000) : "",
    ts: Date.now(),
  });
  if (blob.length > MAX_BYTES) return jsonResponse({ error: "too_large" }, 413);
  // Back up the previous version → PATCH can undo any publish
  const current = await env.KIT_KV.get("config") as string | null;
  if (current != null) await env.KIT_KV.put("config:prev", current);
  await env.KIT_KV.put("config", blob);
  return jsonResponse({ ok: true });
}

/** Revert: swap current config and previous version (a second PATCH = redo). */
export async function onRequestPatch(context: KitContext): Promise<Response> {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);
  const [current, prev] = (await Promise.all([
    env.KIT_KV.get("config"),
    env.KIT_KV.get("config:prev"),
  ])) as [string | null, string | null];
  if (prev == null) return jsonResponse({ error: "no_previous" }, 404);
  await env.KIT_KV.put("config", prev);
  if (current != null) await env.KIT_KV.put("config:prev", current);
  return jsonResponse({ ok: true });
}

export async function onRequestDelete(context: KitContext): Promise<Response> {
  const { request, env } = context;
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  if (!(await isAuthorized(request, env))) return jsonResponse({ error: "unauthorized" }, 401);
  await env.KIT_KV.delete("config");
  return jsonResponse({ ok: true });
}
