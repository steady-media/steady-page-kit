// Route: GET /rubrik/:slug → Sektionsseite (alle Beiträge einer Feed-Kategorie)
import { getItems, renderSection, render404, parseStruct, slugify } from "../_shared.js";

export async function onRequestGet(context) {
  const slug = context.params.slug;
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const cookie = context.request.headers.get("cookie") || "";
  const cfg = parseStruct(cookie);
  const hasCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  const cache = hasCfg ? "no-store" : "public, max-age=300";

  let category = null, items = [], all = [];
  try {
    all = await getItems();
    const cats = new Set();
    all.forEach(it => it.categories.forEach(c => { if (c) cats.add(c); }));
    category = [...cats].find(c => slugify(c) === slug) || null;
    if (category) items = all.filter(it => it.categories.includes(category));
  } catch (e) {
    category = null;
  }

  if (!category) {
    return new Response(render404(cfg), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
    });
  }

  return new Response(renderSection(category, items, all, page, cfg), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });
}
