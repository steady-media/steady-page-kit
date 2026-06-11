// Route: GET /robots.txt — env-bewusst (SITE_ORIGIN), daher Function statt statischer Datei.
import { SITE_ORIGIN } from "./_lib/config.ts";

export async function onRequestGet(context) {
  const origin = (context.env && context.env.SITE_ORIGIN) || SITE_ORIGIN;
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
