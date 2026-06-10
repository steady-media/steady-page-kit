// Route: GET /  → Landing aus dem Steady-Feed.
// Die Komposition (Shell/Aufmacher/Stream/Leisten) kommt aus der Render-Config
// (globale KV-Config + persönlicher Cookie); der Skin wird clientseitig angewandt.
import { getItems } from "./_lib/feed.js";
import { buildPageContext } from "./_lib/settings.js";
import { htmlResponse } from "./_lib/http.js";
import { renderLanding, renderEmpty } from "./_lib/render.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const { cfg, cacheControl } = await buildPageContext(context);

  let html;
  try {
    html = renderLanding(await getItems(), page, cfg);
  } catch (err) {
    html = renderEmpty(cfg); // Feed nicht erreichbar → freundlicher Fallback
  }
  return htmlResponse(html, cacheControl);
}
