// Route: GET /memberships → Steady-Checkout-Embed.
// Die Steady-Backend-Checkout-URL zeigt auf diese Seite; das Smart-Layer-Widget
// rendert die Mitgliedschaftspakete in den #insert_steady_checkout_here-Container.
import { buildPageContext, isConfigured } from "./_lib/settings.ts";
import { htmlResponse } from "./_lib/http.ts";
import { renderMemberships, renderOnboarding } from "./_lib/render.ts";

export async function onRequestGet(context) {
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");
  return htmlResponse(renderMemberships(cfg), cacheControl);
}

// HEAD wie GET behandeln (Crawler/Uptime-Checks); workerd entfernt den Body selbst.
export const onRequestHead = onRequestGet;
