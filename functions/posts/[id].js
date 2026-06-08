// Route: GET /posts/:id  → Einzelpost-Ansicht aus dem Feed-Item (guid == :id)
import { getItems, renderPost, render404, parseStruct } from "../_shared.js";

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

  return new Response(renderPost(item, cfg), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });
}
