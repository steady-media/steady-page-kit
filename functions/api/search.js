// Route: GET /api/search?q=… — feed-basierte Suche.
// Durchsucht Titel, Teaser und Kategorien aller Feed-Items (normalisiert, alle
// Suchwörter müssen treffen). Liefert echte Titel + echte Post-URLs — anders als
// der frühere AutoRAG-Index, dessen Chunks weder Titel noch Links hatten.
import { getItems, normTitle } from "../_lib/feed.ts";
import { fmtDate } from "../_lib/util.ts";
import { jsonResponse } from "../_lib/http.ts";

const MAX_RESULTS = 12;

export async function onRequestGet(context) {
  const q = (new URL(context.request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return jsonResponse({ results: [] }, 200, "public, max-age=120");

  let items = [];
  try {
    items = await getItems(context.env && context.env.FEED_URL ? context.env.FEED_URL : undefined);
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
      if (t.includes(w)) score += 3;        // Titel-Treffer wiegen am meisten
      else if (c.includes(w)) score += 2;   // dann Kategorie
      else if (d.includes(w)) score += 1;   // dann Teasertext
      else { all = false; break; }          // jedes Suchwort muss irgendwo treffen
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
