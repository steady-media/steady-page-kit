// Route: GET /posts/:id → Einzelpost (":id" = Feed-GUID).
//
// Volltext: Der öffentliche Feed liefert nur Teaser. Ist das Secret FULLTEXT_FEED_URL
// gesetzt (authentifizierter Steady-Feed, ~6 jüngste Beiträge mit content:encoded),
// joinen wir den Volltext per normalisiertem Titel an den Beitrag — die Guids beider
// Feeds unterscheiden sich, die Titel stimmen überein. Der Mitglieder-Teil wird beim
// Rendern mit dem offiziellen Steady-Paywall-Element gegated (siehe render.js).
import { getItems, normTitle } from "../_lib/feed.ts";
import { buildPageContext, getClaps, isConfigured } from "../_lib/settings.ts";
import { htmlResponse } from "../_lib/http.ts";
import { renderPost, render404, renderOnboarding } from "../_lib/render.js";

export async function onRequestGet(context) {
  const id = context.params.id;
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");

  let items = [];
  try {
    items = await getItems(cfg.feedUrl);
  } catch (err) {
    items = [];
  }
  const idx = items.findIndex(i => i.guid === id);
  if (idx < 0) return htmlResponse(render404(cfg), cacheControl, 404);
  const item = items[idx];

  // Volltext (best effort) + Clap-Zähler parallel holen
  const fulltextUrl = context.env && context.env.FULLTEXT_FEED_URL;
  const loadFull = async () => {
    if (!fulltextUrl) return "";
    try {
      const want = normTitle(item.title);
      const match = (await getItems(fulltextUrl)).find(i => normTitle(i.title) === want);
      return (match && match.content) || "";
    } catch (err) {
      return "";
    }
  };
  const [full, claps] = await Promise.all([loadFull(), getClaps(context.env, id)]);

  // Nachbar-Posts (Feed ist neueste-zuerst): next = neuer, prev = älter
  const extras = {
    claps,
    next: idx > 0 ? { guid: items[idx - 1].guid, title: items[idx - 1].title } : null,
    prev: idx < items.length - 1 ? { guid: items[idx + 1].guid, title: items[idx + 1].title } : null,
  };
  return htmlResponse(renderPost(item, cfg, full, extras), cacheControl);
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
