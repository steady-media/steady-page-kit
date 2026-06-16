// Route: GET /robots.txt — env-aware (SITE_ORIGIN), hence a function instead of a static file.
import type { KitContext } from "./_lib/types.ts";
import { SITE_ORIGIN } from "./_lib/config.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const origin = (context.env && context.env.SITE_ORIGIN) || SITE_ORIGIN;
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
