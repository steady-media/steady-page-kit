// Route: /api/react — Clap-Zähler pro Post (Cloudflare KV, Key react:<guid>).
//   GET  ?g=<guid> → {n}
//   POST ?g=<guid> → zählt +1, liefert {n}
// Bewusst ohne Auth (öffentliches Applaudieren). KV ist eventually consistent —
// bei gleichzeitigen Claps können einzelne Inkremente verloren gehen; für einen
// Applaus-Zähler ist das akzeptabel (kein Abrechnungs-Datum).
import { jsonResponse } from "../_lib/http.ts";

const GUID_RE = /^[a-z0-9-]{8,64}$/i;

function guidOf(request) {
  const g = new URL(request.url).searchParams.get("g") || "";
  return GUID_RE.test(g) ? g : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const guid = guidOf(request);
  if (!guid) return jsonResponse({ error: "bad_guid" }, 400);
  if (!env.KIT_KV) return jsonResponse({ n: 0 });
  const n = parseInt((await env.KIT_KV.get("react:" + guid)) || "0", 10) || 0;
  return jsonResponse({ n }, 200, "public, max-age=30");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const guid = guidOf(request);
  if (!guid) return jsonResponse({ error: "bad_guid" }, 400);
  if (!env.KIT_KV) return jsonResponse({ error: "kv_unavailable" }, 503);
  const key = "react:" + guid;
  const n = (parseInt((await env.KIT_KV.get(key)) || "0", 10) || 0) + 1;
  await env.KIT_KV.put(key, String(n));
  return jsonResponse({ n });
}
