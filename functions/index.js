// Route: GET /  → Landing aus dem Steady-Feed. Komposition (Shell/Aufmacher/Stream)
// kommt aus dem kitstruct-Cookie (vom Side-Panel gesetzt); Skin bleibt clientseitig.
import { getItems, renderLanding, renderEmpty, parseStruct, getLogoMeta, getConfig, effectiveCookie } from "./_shared.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const cookie = context.request.headers.get("cookie") || "";
  const g = await getConfig(context.env);
  const cfg = parseStruct(effectiveCookie(cookie, g));
  cfg.skin = g ? g.skin : null;
  cfg.logo = await getLogoMeta(context.env);

  let html;
  try {
    const items = await getItems();
    html = renderLanding(items, page, cfg);
  } catch (err) {
    // Feed nicht erreichbar → freundlicher Fallback statt harter Fehler
    html = renderEmpty(cfg);
  }

  const hasCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Struktur/Header variieren pro Cookie → dann nicht cachen; sonst Edge/Browser 5 Min
      "cache-control": hasCfg ? "no-store" : "public, max-age=300",
    },
  });
}
