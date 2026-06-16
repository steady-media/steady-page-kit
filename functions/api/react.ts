// Route: /api/react — clap counter per post (Cloudflare KV, key react:<guid>).
//   GET  ?g=<guid> → {n}
//   POST ?g=<guid> → increments by 1, returns {n}
// Deliberately unauthenticated (public applause). KV is eventually consistent —
// with simultaneous claps individual increments can be lost; for an applause
// counter that is acceptable (not a billing figure).
import type { KitContext } from "../_lib/types.ts";
import { jsonResponse } from "../_lib/http.ts";

const GUID_RE = /^[a-z0-9-]{8,64}$/i;

// KVAdapter.get returns unknown — minimal annotation for the request parameter
function guidOf(request: Request): string | null {
  const g = new URL(request.url).searchParams.get("g") || "";
  return GUID_RE.test(g) ? g : null;
}

export async function onRequestGet(context: KitContext): Promise<Response> {
  const { request, env } = context;
  const guid = guidOf(request);
  if (!guid) return jsonResponse({ error: "bad_guid" }, 400);
  if (!env.KIT_KV) return jsonResponse({ n: 0 });
  // KVAdapter.get returns unknown — cast to string|null for parseInt
  const n = parseInt((await env.KIT_KV.get("react:" + guid) as string | null) || "0", 10) || 0;
  return jsonResponse({ n }, 200, "public, max-age=30");
}

export async function onRequestPost(context: KitContext): Promise<Response> {
  const { request, env } = context;
  const guid = guidOf(request);
  if (!guid) return jsonResponse({ error: "bad_guid" }, 400);
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  const key = "react:" + guid;
  // KVAdapter.get returns unknown — cast to string|null for parseInt
  const n = (parseInt((await env.KIT_KV.get(key) as string | null) || "0", 10) || 0) + 1;
  await env.KIT_KV.put(key, String(n));
  return jsonResponse({ n });
}
