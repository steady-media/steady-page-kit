// Route: GET /memberships → Steady-Checkout-Embed.
// Die Steady-Backend-Checkout-URL zeigt auf diese Seite; das Smart-Layer-Widget
// rendert die Mitgliedschaftspakete in den #insert_steady_checkout_here-Container.
import { buildPageContext } from "./_lib/settings.js";
import { htmlResponse } from "./_lib/http.js";
import { renderMemberships } from "./_lib/render.js";

export async function onRequestGet(context) {
  const { cfg, cacheControl } = await buildPageContext(context);
  return htmlResponse(renderMemberships(cfg), cacheControl);
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
