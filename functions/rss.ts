// Route: GET /rss — this domain's own feed endpoint (proxy of the public Steady feed).
import type { KitContext } from "./_lib/types.ts";
import { fetchFeedXml } from "./_lib/feed.ts";
import { effectiveFeedUrl } from "./_lib/config.ts";
import { t } from "./_lib/i18n.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  try {
    const xml = await fetchFeedXml(effectiveFeedUrl(context.env));
    return new Response(xml, {
      headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" },
    });
  } catch (err) {
    return new Response(t("feed.unavailable"), { status: 503, headers: { "retry-after": "120" } });
  }
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
