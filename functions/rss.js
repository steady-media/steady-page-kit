// Route: GET /rss — eigener Feed-Endpunkt dieser Domain (Proxy des öffentlichen Steady-Feeds).
import { fetchFeedXml } from "./_lib/feed.js";
import { t } from "./_lib/i18n.js";

export async function onRequestGet(context) {
  try {
    const xml = await fetchFeedXml(context.env && context.env.FEED_URL ? context.env.FEED_URL : undefined);
    return new Response(xml, {
      headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" },
    });
  } catch (err) {
    return new Response(t("feed.unavailable"), { status: 503, headers: { "retry-after": "120" } });
  }
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
