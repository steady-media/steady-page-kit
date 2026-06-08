// Route: GET /posts/:id  → Einzelpost-Ansicht aus dem Feed-Item (guid == :id)
// Volltext: der öffentliche Feed liefert nur Teaser. Wenn FULLTEXT_FEED_URL gesetzt ist
// (authentifizierter Steady-Feed, ~6 jüngste Beiträge mit content:encoded), joinen wir den
// Volltext per normalisiertem Titel an den passenden Beitrag — die Guids beider Feeds
// unterscheiden sich, die Titel stimmen überein.
import { getItems, renderPost, render404, parseStruct, normTitle } from "../_shared.js";

export async function onRequestGet(context) {
  const id = context.params.id;
  const cookie = context.request.headers.get("cookie") || "";
  const cfg = parseStruct(cookie);
  const hasCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  const cache = hasCfg ? "no-store" : "public, max-age=300";

  let item = null;
  try {
    const items = await getItems();
    item = items.find(i => i.guid === id);
  } catch (err) {
    item = null;
  }

  if (!item) {
    return new Response(render404(cfg), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
    });
  }

  // Volltext aus dem authentifizierten Feed dazuholen (best effort — Fehler/Token-Ablauf
  // degradiert sauber auf den Teaser-Stub).
  let full = "";
  const ftUrl = context.env && context.env.FULLTEXT_FEED_URL;
  if (ftUrl) {
    try {
      const ft = await getItems(ftUrl);
      const want = normTitle(item.title);
      const match = ft.find(i => normTitle(i.title) === want);
      if (match && match.content) full = match.content;
    } catch (err) {
      full = "";
    }
  }

  return new Response(renderPost(item, cfg, full), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });
}
