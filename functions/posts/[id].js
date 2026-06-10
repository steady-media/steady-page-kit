// Route: GET /posts/:id → Einzelpost (":id" = Feed-GUID).
//
// Volltext: Der öffentliche Feed liefert nur Teaser. Ist das Secret FULLTEXT_FEED_URL
// gesetzt (authentifizierter Steady-Feed, ~6 jüngste Beiträge mit content:encoded),
// joinen wir den Volltext per normalisiertem Titel an den Beitrag — die Guids beider
// Feeds unterscheiden sich, die Titel stimmen überein. Fehler/abgelaufener Token
// degradieren sauber auf den Teaser-Stub mit Steady-Link.
import { getItems, normTitle } from "../_lib/feed.js";
import { buildPageContext } from "../_lib/settings.js";
import { htmlResponse } from "../_lib/http.js";
import { renderPost, render404 } from "../_lib/render.js";

export async function onRequestGet(context) {
  const id = context.params.id;
  const { cfg, cacheControl } = await buildPageContext(context);

  let item = null;
  try {
    item = (await getItems()).find(i => i.guid === id) || null;
  } catch (err) {
    item = null;
  }
  if (!item) return htmlResponse(render404(cfg), cacheControl, 404);

  let full = "";
  const fulltextUrl = context.env && context.env.FULLTEXT_FEED_URL;
  if (fulltextUrl) {
    try {
      const want = normTitle(item.title);
      const match = (await getItems(fulltextUrl)).find(i => normTitle(i.title) === want);
      if (match && match.content) full = match.content;
    } catch (err) {
      full = "";
    }
  }
  return htmlResponse(renderPost(item, cfg, full), cacheControl);
}
