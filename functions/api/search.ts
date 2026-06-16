// Route: GET /api/search?q=… — feed-based search.
// Searches title, teaser and categories of all feed items (normalized; every
// search word must match). Returns real titles + real post URLs — unlike the
// earlier AutoRAG index, whose chunks had neither titles nor links.
import type { FeedItem, KitContext } from "../_lib/types.ts";
import { getItems, normTitle } from "../_lib/feed.ts";
import { effectiveFeedUrl } from "../_lib/config.ts";
import { fmtDate } from "../_lib/util.ts";
import { jsonResponse } from "../_lib/http.ts";

const MAX_RESULTS = 12;

export async function onRequestGet(context: KitContext): Promise<Response> {
  const q = (new URL(context.request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return jsonResponse({ results: [] }, 200, "public, max-age=120");

  let items: FeedItem[] = [];
  try {
    items = await getItems(effectiveFeedUrl(context.env));
  } catch (err) {
    return jsonResponse({ results: [] }, 200, "no-store");
  }

  const words = normTitle(q).split(" ").filter(Boolean);
  const scored = [];
  for (const it of items) {
    const t = normTitle(it.title);
    const d = normTitle(it.description);
    const c = normTitle(it.categories.join(" "));
    let score = 0, all = true;
    for (const w of words) {
      if (t.includes(w)) score += 3;        // title hits weigh the most
      else if (c.includes(w)) score += 2;   // then category
      else if (d.includes(w)) score += 1;   // then teaser text
      else { all = false; break; }          // every search word must match somewhere
    }
    if (all) scored.push({ score, it });
  }
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, MAX_RESULTS).map(({ it }) => ({
    t: it.title,
    d: (it.description || "").slice(0, 160),
    u: "/posts/" + it.guid,
    c: it.categories.find(Boolean) || "",
    dt: fmtDate(it.pubDate),
  }));
  return jsonResponse({ results }, 200, "public, max-age=120");
}
