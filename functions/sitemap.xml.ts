// Route: GET /sitemap.xml — generated from the feed (posts, sections, static pages).
import type { KitContext, FeedItem } from "./_lib/types.ts";
import { getItems, topCategories } from "./_lib/feed.ts";
import { SITE_ORIGIN, effectiveFeedUrl } from "./_lib/config.ts";
import { esc, slugify } from "./_lib/util.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const origin = (context.env && context.env.SITE_ORIGIN) || SITE_ORIGIN;
  let items: FeedItem[] = [];
  try {
    items = await getItems(effectiveFeedUrl(context.env));
  } catch (err) { /* an empty sitemap is better than a 500 */ }

  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: origin + "/" },
    { loc: origin + "/memberships" },
    ...topCategories(items).map(c => ({ loc: origin + "/rubrik/" + slugify(c) })),
    ...items.map(it => {
      const d = new Date(it.pubDate);
      return { loc: origin + "/posts/" + it.guid, lastmod: isNaN(d.getTime()) ? "" : d.toISOString() };
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=1800" },
  });
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
