// Route: GET /  → landing from the Steady feed.
// The composition (shell/lead story/stream/rails) comes from the render config
// (global KV config + personal cookie); the skin is applied client-side.
import type { KitContext } from "./_lib/types.ts";
import { fetchFeedXml, parseFeed, parseChannelMeta } from "./_lib/feed.ts";
import { buildPageContext, isConfigured } from "./_lib/settings.ts";
import { htmlResponse } from "./_lib/http.ts";
import { renderLanding, renderEmpty, renderOnboarding } from "./_lib/render.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");

  let html;
  try {
    const xml = await fetchFeedXml(cfg.feedUrl);
    cfg.channelDesc = parseChannelMeta(xml).description; // → meta description of the landing
    html = renderLanding(parseFeed(xml), page, cfg);
  } catch (err) {
    html = renderEmpty(cfg); // feed unreachable → friendly fallback
  }
  return htmlResponse(html, cacheControl);
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
