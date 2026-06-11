// Route: GET /sitemap.xml — generiert aus dem Feed (Posts, Rubriken, statische Seiten).
import { getItems, topCategories } from "./_lib/feed.ts";
import { SITE_ORIGIN } from "./_lib/config.ts";
import { esc, slugify } from "./_lib/util.ts";

export async function onRequestGet(context) {
  const origin = (context.env && context.env.SITE_ORIGIN) || SITE_ORIGIN;
  let items = [];
  try {
    items = await getItems(context.env && context.env.FEED_URL ? context.env.FEED_URL : undefined);
  } catch (err) { /* leere Sitemap ist besser als 500 */ }

  const urls = [
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

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
