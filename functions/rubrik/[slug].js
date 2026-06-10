// Route: GET /rubrik/:slug → Rubrik-Seite (alle Beiträge einer Feed-Kategorie).
import { getItems } from "../_lib/feed.js";
import { slugify } from "../_lib/util.js";
import { buildPageContext } from "../_lib/settings.js";
import { htmlResponse } from "../_lib/http.js";
import { renderSection, render404 } from "../_lib/render.js";

export async function onRequestGet(context) {
  const slug = context.params.slug;
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const { cfg, cacheControl } = await buildPageContext(context);

  let category = null, items = [], all = [];
  try {
    all = await getItems();
    const cats = new Set();
    all.forEach(it => it.categories.forEach(c => { if (c) cats.add(c); }));
    category = [...cats].find(c => slugify(c) === slug) || null;
    if (category) items = all.filter(it => it.categories.includes(category));
  } catch (err) {
    category = null;
  }

  if (!category) return htmlResponse(render404(cfg), cacheControl, 404);
  return htmlResponse(renderSection(category, items, all, page, cfg), cacheControl);
}
