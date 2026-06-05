// Route: GET /posts/:id  → Einzelpost-Ansicht aus dem Feed-Item (guid == :id)
import { getItems, renderPost, render404 } from "../_shared.js";

export async function onRequestGet(context) {
  const id = context.params.id;

  let item = null;
  try {
    const items = await getItems();
    item = items.find(i => i.guid === id);
  } catch (err) {
    item = null;
  }

  if (!item) {
    return new Response(render404(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(renderPost(item), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
