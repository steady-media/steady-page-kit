// Route: GET /  → Landing aus dem Steady-Feed.
// Die Komposition (Shell/Aufmacher/Stream/Leisten) kommt aus der Render-Config
// (globale KV-Config + persönlicher Cookie); der Skin wird clientseitig angewandt.
import { fetchFeedXml, parseFeed, parseChannelMeta } from "./_lib/feed.js";
import { buildPageContext, isConfigured } from "./_lib/settings.js";
import { htmlResponse } from "./_lib/http.js";
import { renderLanding, renderEmpty, renderOnboarding } from "./_lib/render.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");

  let html;
  try {
    const xml = await fetchFeedXml(cfg.feedUrl);
    cfg.channelDesc = parseChannelMeta(xml).description; // → Meta-Description der Landing
    html = renderLanding(parseFeed(xml), page, cfg);
  } catch (err) {
    html = renderEmpty(cfg); // Feed nicht erreichbar → freundlicher Fallback
  }
  return htmlResponse(html, cacheControl);
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
