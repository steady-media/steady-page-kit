// Route: GET /  → Landing aus dem Steady-Feed (Hero + Pills + Grid + Pagination)
import { getItems, renderLanding, renderEmpty } from "./_shared.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

  let html;
  try {
    const items = await getItems();
    html = renderLanding(items, page);
  } catch (err) {
    // Feed nicht erreichbar → freundlicher Fallback statt harter Fehler
    html = renderEmpty();
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",   // Browser/Edge 5 Min
    },
  });
}
