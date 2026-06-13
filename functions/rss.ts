// Route: GET /rss — eigener Feed-Endpunkt dieser Domain (Proxy des öffentlichen Steady-Feeds).
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

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
