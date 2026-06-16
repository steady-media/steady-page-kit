// Route: GET /rubrik/:slug → section page (all posts in one feed category).
import type { KitContext, FeedItem } from "../_lib/types.ts";
import { getItems } from "../_lib/feed.ts";
import { slugify } from "../_lib/util.ts";
import { buildPageContext, isConfigured } from "../_lib/settings.ts";
import { htmlResponse } from "../_lib/http.ts";
import { renderSection, render404, renderOnboarding } from "../_lib/render.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const slug = context.params.slug;
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");

  let category: string | null = null, items: FeedItem[] = [], all: FeedItem[] = [];
  try {
    all = await getItems(cfg.feedUrl);
    const cats = new Set<string>();
    all.forEach(it => it.categories.forEach(c => { if (c) cats.add(c); }));
    category = [...cats].find(c => slugify(c) === slug) || null;
    // category is a string here (runtime guard above); TS sees a mutable let → non-null assertion
    if (category) items = all.filter(it => it.categories.includes(category!));
  } catch (err) {
    category = null;
  }

  if (!category) return htmlResponse(render404(cfg), cacheControl, 404);
  return htmlResponse(renderSection(category, items, all, page, cfg), cacheControl);
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
